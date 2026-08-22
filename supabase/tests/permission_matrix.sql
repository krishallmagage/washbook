-- S1-04 — PRD §13.1 permission matrix, every cell.
--
-- The matrix is enforced server-side, not only in the UI (US-10.1 AC2). This
-- file is the executable form of that table: if a role silently gains a
-- capability, one of these fails.
--
-- Each assertion compares the *complete* set of actions a role is granted
-- against the expected set, so an accidentally added permission fails just as
-- loudly as a missing one.

begin;

create extension if not exists pgtap with schema extensions;

select plan(7);

insert into public.sites (id, name, supervisor_can_override) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Override off', false),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'Override on',  true);

create or replace function pg_temp.authenticate_as(p_site uuid, p_role text)
returns void language plpgsql as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', gen_random_uuid(), 'site_id', p_site, 'site_role', p_role)::text,
    true
  );
end;
$$;

-- Every action this role is permitted, alphabetically.
create or replace function pg_temp.permitted()
returns table (action text) language sql stable as $$
  select a::text
    from unnest(enum_range(null::public.permission_action)) as a
   where public.fn_has_permission(a)
   order by 1;
$$;

-- ---------------------------------------------------------------------------
-- Owner — everything
-- ---------------------------------------------------------------------------

select pg_temp.authenticate_as('aaaaaaaa-0000-4000-8000-000000000001', 'owner');
select results_eq(
  'select * from pg_temp.permitted()',
  $$ values ('assign_staff'), ('bill_ticket'), ('change_own_job_state'),
            ('close_day'), ('create_ticket'), ('edit_price_list'),
            ('enrol_device'), ('manage_users'), ('override_price'),
            ('record_petty_cash'), ('set_thresholds'), ('view_audit_log'),
            ('view_own_commission'), ('view_reports'), ('void_ticket') $$,
  'Owner holds every permission'
);

-- ---------------------------------------------------------------------------
-- Manager — everything except the three Owner-only settings
-- ---------------------------------------------------------------------------

select pg_temp.authenticate_as('aaaaaaaa-0000-4000-8000-000000000001', 'manager');
select results_eq(
  'select * from pg_temp.permitted()',
  $$ values ('assign_staff'), ('bill_ticket'), ('change_own_job_state'),
            ('close_day'), ('create_ticket'), ('enrol_device'),
            ('override_price'), ('record_petty_cash'), ('view_audit_log'),
            ('view_own_commission'), ('view_reports'), ('void_ticket') $$,
  'Manager cannot edit the price list, manage users, or set thresholds'
);

-- ---------------------------------------------------------------------------
-- Cashier — takes money, closes the day, nothing else
-- ---------------------------------------------------------------------------

select pg_temp.authenticate_as('aaaaaaaa-0000-4000-8000-000000000001', 'cashier');
select results_eq(
  'select * from pg_temp.permitted()',
  $$ values ('bill_ticket'), ('close_day'), ('create_ticket'),
            ('record_petty_cash'), ('view_own_commission') $$,
  'Cashier bills, closes the day and records petty cash — and cannot void or discount'
);

-- ---------------------------------------------------------------------------
-- Supervisor — the per-site override flag is the whole point of this pair
-- ---------------------------------------------------------------------------

select pg_temp.authenticate_as('aaaaaaaa-0000-4000-8000-000000000001', 'supervisor');
select results_eq(
  'select * from pg_temp.permitted()',
  $$ values ('assign_staff'), ('bill_ticket'), ('change_own_job_state'),
            ('create_ticket'), ('view_own_commission') $$,
  'Supervisor cannot override price where the site has not enabled it (§13.1 footnote, default off)'
);

select pg_temp.authenticate_as('bbbbbbbb-0000-4000-8000-000000000002', 'supervisor');
select results_eq(
  'select * from pg_temp.permitted()',
  $$ values ('assign_staff'), ('bill_ticket'), ('change_own_job_state'),
            ('create_ticket'), ('override_price'), ('view_own_commission') $$,
  'Supervisor CAN override price where the site has enabled it'
);

-- ---------------------------------------------------------------------------
-- Staff — claims and completes his own jobs, sees his own money
-- ---------------------------------------------------------------------------

select pg_temp.authenticate_as('aaaaaaaa-0000-4000-8000-000000000001', 'staff');
select results_eq(
  'select * from pg_temp.permitted()',
  $$ values ('change_own_job_state'), ('view_own_commission') $$,
  'Staff may change their own job state and view their own commission, nothing more'
);

-- ---------------------------------------------------------------------------
-- Read-only — reports and nothing else
-- ---------------------------------------------------------------------------

select pg_temp.authenticate_as('aaaaaaaa-0000-4000-8000-000000000001', 'readonly');
select results_eq(
  'select * from pg_temp.permitted()',
  $$ values ('view_reports') $$,
  'Read-only sees reports and holds no other permission'
);

select * from finish();
rollback;
