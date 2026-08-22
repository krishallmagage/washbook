-- Slice 1 / S1-02 — the three functions every RLS policy is built on.
--
-- ADR-0006: RLS is the tenancy boundary. ADR-0008: a PIN sign-in mints a JWT
-- carrying site_id and role, so shared-device users are governed by exactly the
-- same policies as everyone else — there is no second authorisation system.
--
-- All three read the request JWT. They are STABLE (one value per statement) and
-- pin search_path to '' so a SECURITY DEFINER function cannot be hijacked by a
-- caller-controlled search path.

-- ---------------------------------------------------------------------------
-- Claim readers
-- ---------------------------------------------------------------------------

create or replace function public.auth_jwt()
returns jsonb
language sql
stable
set search_path = ''
as $$
  -- `true` means "missing is null, not an error" — an unauthenticated request
  -- has no claims and must return null rather than raise.
  select nullif(current_setting('request.jwt.claims', true), '')::jsonb;
$$;

create or replace function public.auth_site_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select nullif(public.auth_jwt() ->> 'site_id', '')::uuid;
$$;

comment on function public.auth_site_id() is
  'The caller''s site, from the JWT. Null when unauthenticated — every policy then denies.';

create or replace function public.auth_role()
returns public.site_role
language sql
stable
set search_path = ''
as $$
  -- An unrecognised role string yields null rather than raising, so a malformed
  -- token denies access instead of erroring out mid-policy.
  select case
    when public.auth_jwt() ->> 'site_role' in
      ('owner', 'manager', 'cashier', 'supervisor', 'staff', 'readonly')
    then (public.auth_jwt() ->> 'site_role')::public.site_role
    else null
  end;
$$;

comment on function public.auth_role() is
  'The caller''s role within their site, from the JWT claim `site_role`.';

-- ---------------------------------------------------------------------------
-- The permission matrix — PRD §13.1, in one place
-- ---------------------------------------------------------------------------

create type public.permission_action as enum (
  'create_ticket',
  'override_price',
  'assign_staff',
  'change_own_job_state',
  'bill_ticket',
  'void_ticket',
  'record_petty_cash',
  'close_day',
  'edit_price_list',
  'manage_users',
  'set_thresholds',
  'view_reports',
  'view_own_commission',
  'view_audit_log',
  -- US-10.3 AC3: device enrolment requires an Owner or Manager credential.
  -- Not in the PRD's matrix, which does not cover enrolment.
  'enrol_device'
);

create or replace function public.fn_has_permission(action public.permission_action)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_role public.site_role := public.auth_role();
  site_allows_supervisor_override boolean;
begin
  if actor_role is null then
    return false;  -- deny by default
  end if;

  -- PRD §13.1 footnote: Supervisor override is a per-site setting, default off.
  -- SECURITY DEFINER is what lets this read `sites` while the caller's own
  -- policies are still being evaluated.
  if action = 'override_price' and actor_role = 'supervisor' then
    select s.supervisor_can_override
      into site_allows_supervisor_override
      from public.sites s
     where s.id = public.auth_site_id();
    return coalesce(site_allows_supervisor_override, false);
  end if;

  return case action
    when 'create_ticket'        then actor_role in ('owner','manager','cashier','supervisor')
    when 'override_price'       then actor_role in ('owner','manager')
    when 'assign_staff'         then actor_role in ('owner','manager','supervisor')
    when 'change_own_job_state' then actor_role in ('owner','manager','supervisor','staff')
    when 'bill_ticket'          then actor_role in ('owner','manager','cashier','supervisor')
    when 'void_ticket'          then actor_role in ('owner','manager')
    when 'record_petty_cash'    then actor_role in ('owner','manager','cashier')
    when 'close_day'            then actor_role in ('owner','manager','cashier')
    when 'edit_price_list'      then actor_role = 'owner'
    when 'manage_users'         then actor_role = 'owner'
    when 'set_thresholds'       then actor_role = 'owner'
    when 'view_reports'         then actor_role in ('owner','manager','readonly')
    when 'view_own_commission'  then actor_role in ('owner','manager','cashier','supervisor','staff')
    when 'view_audit_log'       then actor_role in ('owner','manager')
    when 'enrol_device'         then actor_role in ('owner','manager')
  end;
end;
$$;

comment on function public.fn_has_permission(public.permission_action) is
  'PRD §13.1 permission matrix. The single place a role gains or loses a capability.';

-- The helpers are called from policies on behalf of ordinary users, so those
-- roles need EXECUTE. They expose no data a caller does not already hold.
grant execute on function public.auth_jwt() to authenticated, anon;
grant execute on function public.auth_site_id() to authenticated, anon;
grant execute on function public.auth_role() to authenticated, anon;
grant execute on function public.fn_has_permission(public.permission_action)
  to authenticated, anon;
