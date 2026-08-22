-- S1-06 — PIN verification, lockout, and the Supabase Auth claim hook.
--
-- A 4-digit PIN is 10,000 possibilities. Without a working lockout it is not a
-- credential, so the lockout is tested as carefully as the happy path.

begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

insert into public.sites (id, name) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Site A'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'Site B');

insert into public.app_users (id, site_id, full_name, role, pin_hash) values
  ('aaaaaaaa-1111-4000-8000-000000000001',
   'aaaaaaaa-0000-4000-8000-000000000001', 'Sanjeewa', 'supervisor',
   extensions.crypt('1234', extensions.gen_salt('bf', 4))),
  ('aaaaaaaa-1111-4000-8000-000000000002',
   'aaaaaaaa-0000-4000-8000-000000000001', 'Inactive person', 'staff',
   extensions.crypt('9999', extensions.gen_salt('bf', 4))),
  ('bbbbbbbb-1111-4000-8000-000000000003',
   'bbbbbbbb-0000-4000-8000-000000000002', 'Someone at B', 'supervisor',
   extensions.crypt('1234', extensions.gen_salt('bf', 4)));

update public.app_users set is_active = false
 where id = 'aaaaaaaa-1111-4000-8000-000000000002';

insert into public.devices (id, site_id, label, short_code) values
  ('aaaaaaaa-2222-4000-8000-000000000001',
   'aaaaaaaa-0000-4000-8000-000000000001', 'Gate phone A', 'A'),
  ('bbbbbbbb-2222-4000-8000-000000000002',
   'bbbbbbbb-0000-4000-8000-000000000002', 'Gate phone B', 'B');

-- ---------------------------------------------------------------------------
-- fn_device_users — the device is the credential
-- ---------------------------------------------------------------------------

select is(
  (select count(*)::int from public.fn_device_users('aaaaaaaa-2222-4000-8000-000000000001')),
  1,
  'a device lists only its own site''s PIN-capable users'
);

select is(
  (select count(*)::int from public.fn_device_users('aaaaaaaa-2222-4000-8000-000000000001')
    where full_name = 'Inactive person'),
  0,
  'a deactivated user does not appear in the sign-in list (BR-15 keeps the row)'
);

select is(
  (select full_name from public.fn_device_users('bbbbbbbb-2222-4000-8000-000000000002')),
  'Someone at B',
  'a device at site B lists site B''s users, not site A''s'
);

-- ---------------------------------------------------------------------------
-- Happy path
-- ---------------------------------------------------------------------------

select ok(
  (public.fn_verify_pin(
    'aaaaaaaa-2222-4000-8000-000000000001',
    'aaaaaaaa-1111-4000-8000-000000000001', '1234')).ok,
  'a correct PIN on an enrolled device verifies'
);

select is(
  (public.fn_verify_pin(
    'aaaaaaaa-2222-4000-8000-000000000001',
    'aaaaaaaa-1111-4000-8000-000000000001', '1234')).site_role,
  'supervisor'::public.site_role,
  'verification returns the role the minted token will carry'
);

select is(
  (public.fn_verify_pin(
    'aaaaaaaa-2222-4000-8000-000000000001',
    'aaaaaaaa-1111-4000-8000-000000000001', '1234')).site_id,
  'aaaaaaaa-0000-4000-8000-000000000001'::uuid,
  'verification returns the site the minted token will scope to'
);

-- ---------------------------------------------------------------------------
-- The PIN hash never leaves the database
-- ---------------------------------------------------------------------------

select hasnt_column(
  'public', 'pin_verify_result', 'pin_hash',
  'the verification result carries no password material'
);

select isnt(
  (select pin_hash from public.app_users
    where id = 'aaaaaaaa-1111-4000-8000-000000000001'),
  '1234',
  'the PIN is stored hashed, not in clear'
);

-- ---------------------------------------------------------------------------
-- Cross-site and cross-device refusal
-- ---------------------------------------------------------------------------

select ok(
  not (public.fn_verify_pin(
    'bbbbbbbb-2222-4000-8000-000000000002',
    'aaaaaaaa-1111-4000-8000-000000000001', '1234')).ok,
  'a site A user cannot sign in on a site B device, even with the right PIN'
);

select is(
  (public.fn_verify_pin(
    '00000000-0000-4000-8000-000000000000',
    'aaaaaaaa-1111-4000-8000-000000000001', '1234')).failure_reason,
  'device_not_enrolled',
  'an unenrolled device is refused before any PIN is checked (US-10.3 AC3)'
);

select ok(
  not (public.fn_verify_pin(
    'aaaaaaaa-2222-4000-8000-000000000001',
    'aaaaaaaa-1111-4000-8000-000000000002', '9999')).ok,
  'a deactivated user cannot sign in even with the correct PIN'
);

-- ---------------------------------------------------------------------------
-- Lockout
-- ---------------------------------------------------------------------------

select ok(
  not (public.fn_verify_pin(
    'aaaaaaaa-2222-4000-8000-000000000001',
    'aaaaaaaa-1111-4000-8000-000000000001', '0000')).ok,
  'a wrong PIN is refused'
);

-- Four more failures reaches the five-attempt threshold.
select public.fn_verify_pin('aaaaaaaa-2222-4000-8000-000000000001',
                            'aaaaaaaa-1111-4000-8000-000000000001', '0000')
  from generate_series(1, 4);

select is(
  (select failed_pin_attempts from public.app_users
    where id = 'aaaaaaaa-1111-4000-8000-000000000001'),
  5,
  'failed attempts are counted'
);

select is(
  (public.fn_verify_pin(
    'aaaaaaaa-2222-4000-8000-000000000001',
    'aaaaaaaa-1111-4000-8000-000000000001', '1234')).failure_reason,
  'locked',
  'after five failures the account is locked even for the CORRECT PIN'
);

-- Clearing the lock and signing in resets the counter.
update public.app_users set pin_locked_until = null
 where id = 'aaaaaaaa-1111-4000-8000-000000000001';

select ok(
  (public.fn_verify_pin(
    'aaaaaaaa-2222-4000-8000-000000000001',
    'aaaaaaaa-1111-4000-8000-000000000001', '1234')).ok,
  'once the lock expires the correct PIN works again'
);

select is(
  (select failed_pin_attempts from public.app_users
    where id = 'aaaaaaaa-1111-4000-8000-000000000001'),
  0,
  'a successful sign-in resets the failure counter'
);

select * from finish();
rollback;
