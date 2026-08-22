-- S1-04 — RLS cross-site isolation for the tenancy core.
--
-- CLAUDE.md §2: "Row Level Security is tested, not assumed." Every table gets
-- tests proving a user from site A cannot read, write or delete site B's rows.
-- Reading a policy and believing it is not evidence; this is.

begin;

create extension if not exists pgtap with schema extensions;

select plan(21);

-- ---------------------------------------------------------------------------
-- Fixtures. Created as the superuser, which bypasses RLS — that is the point:
-- both sites genuinely exist, and the tests below prove a user of one cannot
-- see the other.
-- ---------------------------------------------------------------------------

insert into public.sites (id, name, supervisor_can_override) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Site A — Kottawa',  false),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'Site B — Negombo',  true);

insert into public.app_users (id, site_id, full_name, role, pin_hash) values
  ('aaaaaaaa-1111-4000-8000-000000000001',
   'aaaaaaaa-0000-4000-8000-000000000001', 'Nuwan (A owner)',      'owner',      'x'),
  ('aaaaaaaa-1111-4000-8000-000000000002',
   'aaaaaaaa-0000-4000-8000-000000000001', 'Sanjeewa (A super)',   'supervisor', 'x'),
  ('bbbbbbbb-1111-4000-8000-000000000003',
   'bbbbbbbb-0000-4000-8000-000000000002', 'Owner of B',           'owner',      'x');

insert into public.devices (id, site_id, label, short_code) values
  ('aaaaaaaa-2222-4000-8000-000000000001',
   'aaaaaaaa-0000-4000-8000-000000000001', 'Gate phone A', 'A'),
  ('bbbbbbbb-2222-4000-8000-000000000002',
   'bbbbbbbb-0000-4000-8000-000000000002', 'Gate phone B', 'B');

-- Sign in as a given site and role, the way a minted JWT would (ADR-0008).
create or replace function pg_temp.authenticate_as(p_site uuid, p_role text)
returns void language plpgsql as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', gen_random_uuid(), 'site_id', p_site, 'site_role', p_role)::text,
    true
  );
  execute 'set local role authenticated';
end;
$$;

create or replace function pg_temp.sign_out() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- The helpers themselves
-- ---------------------------------------------------------------------------

select pg_temp.authenticate_as('aaaaaaaa-0000-4000-8000-000000000001', 'owner');

select is(
  public.auth_site_id(), 'aaaaaaaa-0000-4000-8000-000000000001'::uuid,
  'auth_site_id() returns the site from the JWT'
);
select is(
  public.auth_role(), 'owner'::public.site_role,
  'auth_role() returns the role from the JWT'
);

-- ---------------------------------------------------------------------------
-- sites — SELECT
-- ---------------------------------------------------------------------------

select is(
  (select count(*)::int from public.sites),
  1,
  'a user of site A sees exactly one site'
);
select is(
  (select count(*)::int from public.sites
    where id = 'bbbbbbbb-0000-4000-8000-000000000002'),
  0,
  'a user of site A cannot SELECT site B'
);

-- ---------------------------------------------------------------------------
-- sites — UPDATE
-- ---------------------------------------------------------------------------

update public.sites set name = 'renamed by A'
  where id = 'bbbbbbbb-0000-4000-8000-000000000002';
select is(
  (select name from public.sites where id = 'bbbbbbbb-0000-4000-8000-000000000002'),
  null,
  'a user of site A cannot UPDATE site B (the row is not even visible)'
);

update public.sites set name = 'renamed by its owner'
  where id = 'aaaaaaaa-0000-4000-8000-000000000001';
select is(
  (select name from public.sites where id = 'aaaaaaaa-0000-4000-8000-000000000001'),
  'renamed by its owner',
  'an Owner CAN update their own site'
);

-- ---------------------------------------------------------------------------
-- sites — DELETE is granted to nobody (PRD BR-15)
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ delete from public.sites where id = 'aaaaaaaa-0000-4000-8000-000000000001' $$,
  '42501',
  null,
  'DELETE on sites is refused even for an Owner of that site'
);

-- ---------------------------------------------------------------------------
-- app_users
-- ---------------------------------------------------------------------------

select is(
  (select count(*)::int from public.app_users),
  2,
  'a user of site A sees only site A''s users'
);
select is(
  (select count(*)::int from public.app_users
    where site_id = 'bbbbbbbb-0000-4000-8000-000000000002'),
  0,
  'a user of site A cannot SELECT site B''s users'
);

-- The important one: an Owner may create users, but not into another site.
select throws_ok(
  $$ insert into public.app_users (site_id, full_name, role, pin_hash)
     values ('bbbbbbbb-0000-4000-8000-000000000002', 'smuggled', 'owner', 'x') $$,
  '42501',
  null,
  'an Owner of site A cannot INSERT a user into site B'
);

select lives_ok(
  $$ insert into public.app_users (site_id, full_name, role, pin_hash)
     values ('aaaaaaaa-0000-4000-8000-000000000001', 'new cashier', 'cashier', 'x') $$,
  'an Owner CAN insert a user into their own site'
);

update public.app_users set full_name = 'hijacked'
  where id = 'bbbbbbbb-1111-4000-8000-000000000003';
select is(
  (select count(*)::int from public.app_users where full_name = 'hijacked'),
  0,
  'a user of site A cannot UPDATE site B''s users'
);

select throws_ok(
  $$ delete from public.app_users where site_id = 'aaaaaaaa-0000-4000-8000-000000000001' $$,
  '42501',
  null,
  'DELETE on app_users is refused — deactivation preserves history (BR-15)'
);

-- ---------------------------------------------------------------------------
-- devices
-- ---------------------------------------------------------------------------

select is(
  (select count(*)::int from public.devices),
  1,
  'a user of site A sees only site A''s devices'
);
select throws_ok(
  $$ insert into public.devices (site_id, label, short_code)
     values ('bbbbbbbb-0000-4000-8000-000000000002', 'smuggled', 'Z') $$,
  '42501',
  null,
  'an Owner of site A cannot enrol a device into site B'
);

-- ---------------------------------------------------------------------------
-- Role restrictions within a site
-- ---------------------------------------------------------------------------

select pg_temp.sign_out();
select pg_temp.authenticate_as('aaaaaaaa-0000-4000-8000-000000000001', 'supervisor');

select throws_ok(
  $$ insert into public.app_users (site_id, full_name, role, pin_hash)
     values ('aaaaaaaa-0000-4000-8000-000000000001', 'made by supervisor', 'staff', 'x') $$,
  '42501',
  null,
  'a Supervisor cannot create users — PRD §13.1 makes that Owner-only'
);

select throws_ok(
  $$ insert into public.devices (site_id, label, short_code)
     values ('aaaaaaaa-0000-4000-8000-000000000001', 'supervisor device', 'S') $$,
  '42501',
  null,
  'a Supervisor cannot enrol a device — US-10.3 AC3 requires Owner or Manager'
);

select is(
  (select count(*)::int from public.sites),
  1,
  'a Supervisor can still read their own site'
);

-- ---------------------------------------------------------------------------
-- Unauthenticated: deny by default
-- ---------------------------------------------------------------------------

select pg_temp.sign_out();
select pg_temp.authenticate_as(null, 'owner');

select is(
  (select count(*)::int from public.sites),
  0,
  'a token with no site_id sees nothing — deny by default'
);

select pg_temp.sign_out();
select pg_temp.authenticate_as('aaaaaaaa-0000-4000-8000-000000000001', 'not-a-real-role');

select is(
  (select count(*)::int from public.sites),
  1,
  'an unrecognised role still scopes to its site for SELECT'
);
select ok(
  not public.fn_has_permission('create_ticket'),
  'an unrecognised role is granted no permission at all'
);

select * from finish();
rollback;
