-- Slice 1 / S1-05, S1-06 — PIN credentials and the Supabase Auth claim hook.
--
-- ADR-0008: a PIN sign-in mints a JWT carrying site_id and site_role, so
-- shared-device users are governed by exactly the same RLS policies as
-- everyone else. This migration owns the half that must live in the database:
-- the PIN hash (which never leaves), verification, lockout, and the hook that
-- puts the same claims into a Supabase Auth token.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Lockout state. A 4-digit PIN is 10,000 possibilities; without a lockout it is
-- not a credential, it is a formality.
-- ---------------------------------------------------------------------------

alter table public.app_users
  add column failed_pin_attempts integer not null default 0
    check (failed_pin_attempts >= 0),
  add column pin_locked_until timestamptz;

-- ---------------------------------------------------------------------------
-- Setting a PIN
-- ---------------------------------------------------------------------------

create or replace function public.fn_set_pin(p_user_id uuid, p_pin text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_site uuid;
begin
  -- US-10.3 AC1: 4 to 6 digits.
  if p_pin !~ '^[0-9]{4,6}$' then
    raise exception 'A PIN must be 4 to 6 digits.' using errcode = '22023';
  end if;

  select site_id into target_site from public.app_users where id = p_user_id;
  if target_site is null then
    raise exception 'No such user.' using errcode = 'P0002';
  end if;

  -- SECURITY DEFINER bypasses RLS, so the tenancy and role checks that RLS
  -- would normally apply have to be made explicitly here.
  if target_site <> public.auth_site_id()
     or not public.fn_has_permission('manage_users') then
    raise exception 'Only an Owner may set a PIN, and only within their own site.'
      using errcode = '42501';
  end if;

  update public.app_users
     set pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf', 10)),
         pin_set_at = now(),
         failed_pin_attempts = 0,
         pin_locked_until = null
   where id = p_user_id;
end;
$$;

revoke execute on function public.fn_set_pin(uuid, text) from public, anon;
grant execute on function public.fn_set_pin(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Who can sign in on this device
-- ---------------------------------------------------------------------------

-- The device is the credential here: enrolment (US-10.3 AC3) is what entitles a
-- browser to see the staff list for one site. Without that, this would be an
-- unauthenticated way to enumerate a site's employees.
create or replace function public.fn_device_users(p_device_id uuid)
returns table (id uuid, full_name text, role public.site_role)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id, u.full_name, u.role
    from public.app_users u
    join public.devices d on d.site_id = u.site_id
   where d.id = p_device_id
     and d.is_active
     and u.is_active
     and u.pin_hash is not null
   order by u.full_name;
$$;

grant execute on function public.fn_device_users(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Verifying a PIN
-- ---------------------------------------------------------------------------

create type public.pin_verify_result as (
  ok             boolean,
  user_id        uuid,
  site_id        uuid,
  site_role      public.site_role,
  full_name      text,
  locked_until   timestamptz,
  failure_reason text
);

create or replace function public.fn_verify_pin(
  p_device_id uuid,
  p_user_id   uuid,
  p_pin       text
)
returns public.pin_verify_result
language plpgsql
security definer
set search_path = ''
as $$
declare
  u        public.app_users%rowtype;
  d        public.devices%rowtype;
  result   public.pin_verify_result;
  max_attempts constant integer := 5;
  lockout      constant interval := interval '15 minutes';
begin
  result := (false, null, null, null, null, null, 'invalid')::public.pin_verify_result;

  select * into d from public.devices where id = p_device_id and is_active;
  if not found then
    result.failure_reason := 'device_not_enrolled';
    return result;
  end if;

  select * into u
    from public.app_users
   where id = p_user_id and site_id = d.site_id and is_active;
  if not found then
    -- Deliberately indistinguishable from a wrong PIN to the caller.
    return result;
  end if;

  if u.pin_locked_until is not null and u.pin_locked_until > now() then
    result.failure_reason := 'locked';
    result.locked_until := u.pin_locked_until;
    return result;
  end if;

  if u.pin_hash is null
     or extensions.crypt(p_pin, u.pin_hash) <> u.pin_hash then
    update public.app_users
       set failed_pin_attempts = failed_pin_attempts + 1,
           pin_locked_until = case
             when failed_pin_attempts + 1 >= max_attempts then now() + lockout
             else pin_locked_until
           end
     where id = u.id
     returning pin_locked_until into result.locked_until;

    if result.locked_until is not null and result.locked_until > now() then
      result.failure_reason := 'locked';
    end if;
    return result;
  end if;

  update public.app_users
     set failed_pin_attempts = 0, pin_locked_until = null
   where id = u.id;

  update public.devices set last_seen_at = now() where id = d.id;

  result := (true, u.id, u.site_id, u.role, u.full_name, null, null)::public.pin_verify_result;
  return result;
end;
$$;

grant execute on function public.fn_verify_pin(uuid, uuid, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Supabase Auth claim hook — S1-05
-- ---------------------------------------------------------------------------

-- Owner and Manager sign in through Supabase Auth. Their token must carry the
-- same `site_id` and `site_role` claims a minted PIN token does, or the RLS
-- helpers would see nothing and they would be locked out of their own site.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  claims jsonb := coalesce(event -> 'claims', '{}'::jsonb);
  u      public.app_users%rowtype;
begin
  select * into u
    from public.app_users
   where auth_user_id = (event ->> 'user_id')::uuid
     and is_active;

  if found then
    claims := jsonb_set(claims, '{site_id}',   to_jsonb(u.site_id::text));
    claims := jsonb_set(claims, '{site_role}', to_jsonb(u.role::text));
    claims := jsonb_set(claims, '{app_user_id}', to_jsonb(u.id::text));
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- The hook runs as supabase_auth_admin, which needs to reach this schema and
-- read app_users. It must NOT be callable by ordinary roles — a user who could
-- call it directly could not forge a token, but there is no reason to offer it.
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;

grant select on table public.app_users to supabase_auth_admin;

create policy app_users_auth_admin_read on public.app_users
  for select to supabase_auth_admin
  using (true);
