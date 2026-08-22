-- Slice 2 — RLS and business rules for the catalogue.
--
-- BR-10 is the one that matters here: prices are versioned, and a list that is
-- already in effect cannot be edited. If that fails, every historic ticket
-- silently re-prices itself.

begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

insert into public.sites (id, name) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Site A'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'Site B');

insert into public.app_users (id, site_id, full_name, role, pin_hash) values
  ('aaaaaaaa-1111-4000-8000-000000000001',
   'aaaaaaaa-0000-4000-8000-000000000001', 'Owner A', 'owner', 'x'),
  ('bbbbbbbb-1111-4000-8000-000000000003',
   'bbbbbbbb-0000-4000-8000-000000000002', 'Owner B', 'owner', 'x');

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
-- US-2.2 AC1 — default classes
-- ---------------------------------------------------------------------------

select pg_temp.authenticate_as('aaaaaaaa-0000-4000-8000-000000000001', 'owner');

select lives_ok(
  $$ select public.fn_seed_default_catalogue('aaaaaaaa-0000-4000-8000-000000000001') $$,
  'an Owner can seed the default catalogue'
);

select is(
  (select count(*)::int from public.vehicle_classes),
  7,
  'US-2.2 AC1 — seven default vehicle classes are provided'
);

select ok(
  exists (select 1 from public.vehicle_classes where name = 'Three-wheeler'),
  'US-2.2 AC1 — the Sri Lankan classes are there, not generic ones'
);

select is(
  (select count(*)::int from public.services),
  9,
  'a starter service list is provided (US-10.4 AC2)'
);

-- Idempotent: running setup twice must not double the catalogue.
select public.fn_seed_default_catalogue('aaaaaaaa-0000-4000-8000-000000000001');
select is(
  (select count(*)::int from public.vehicle_classes),
  7,
  'seeding twice does not duplicate classes'
);

-- ---------------------------------------------------------------------------
-- US-2.2 AC2 — deactivate never deletes
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ delete from public.vehicle_classes
      where site_id = 'aaaaaaaa-0000-4000-8000-000000000001' $$,
  '42501',
  null,
  'BR-15 — a vehicle class cannot be deleted, only deactivated'
);

select lives_ok(
  $$ update public.vehicle_classes set is_active = false where name = 'Lorry' $$,
  'US-2.2 AC2 — a class can be deactivated'
);

select is(
  (select count(*)::int from public.vehicle_classes where name = 'Lorry'),
  1,
  'US-2.2 AC2 — deactivating preserves the row and its history'
);

select lives_ok(
  $$ update public.vehicle_classes set name = 'Bike', sort_order = 3
      where name = 'Motorcycle' $$,
  'US-2.2 AC2 — a class can be renamed and reordered'
);

-- ---------------------------------------------------------------------------
-- Price grid and resolution — US-1.3, US-2.1 AC2
-- ---------------------------------------------------------------------------

insert into public.price_lists (id, site_id, version, effective_from, created_by)
values ('aaaaaaaa-3333-4000-8000-000000000001',
        'aaaaaaaa-0000-4000-8000-000000000001', 1, now() - interval '1 day',
        'aaaaaaaa-1111-4000-8000-000000000001');

insert into public.price_list_items
  (price_list_id, service_id, vehicle_class_id, price_cents, is_offered)
select 'aaaaaaaa-3333-4000-8000-000000000001', s.id, c.id, 150000, true
  from public.services s, public.vehicle_classes c
 where s.name = 'Body wash' and c.name = 'Car (small)';

-- US-2.1 AC2 — an empty cell means "not offered for this class".
insert into public.price_list_items
  (price_list_id, service_id, vehicle_class_id, price_cents, is_offered)
select 'aaaaaaaa-3333-4000-8000-000000000001', s.id, c.id, null, false
  from public.services s, public.vehicle_classes c
 where s.name = 'Full detail' and c.name = 'Bike';

select is(
  public.fn_resolve_price_cents(
    'aaaaaaaa-0000-4000-8000-000000000001',
    (select id from public.services where name = 'Body wash'),
    (select id from public.vehicle_classes where name = 'Car (small)')),
  150000,
  'US-1.3 AC1 — a price resolves from class and service without being typed'
);

select is(
  public.fn_resolve_price_cents(
    'aaaaaaaa-0000-4000-8000-000000000001',
    (select id from public.services where name = 'Full detail'),
    (select id from public.vehicle_classes where name = 'Bike')),
  null,
  'US-1.3 AC2 — a service not offered for a class resolves to nothing, not to free'
);

select throws_ok(
  $$ insert into public.price_list_items
       (price_list_id, service_id, vehicle_class_id, price_cents, is_offered)
     select 'aaaaaaaa-3333-4000-8000-000000000001', s.id, c.id, null, true
       from public.services s, public.vehicle_classes c
      where s.name = 'Engine wash' and c.name = 'Van' $$,
  '23514',
  null,
  'an offered cell must carry a price — offered-with-no-price is rejected'
);

select throws_ok(
  $$ insert into public.price_list_items
       (price_list_id, service_id, vehicle_class_id, price_cents, is_offered)
     select 'aaaaaaaa-3333-4000-8000-000000000001', s.id, c.id, -100, true
       from public.services s, public.vehicle_classes c
      where s.name = 'Engine wash' and c.name = 'Van' $$,
  '23514',
  null,
  'a negative price is rejected'
);

-- ---------------------------------------------------------------------------
-- BR-10 — an effective price list is immutable
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ update public.price_lists set version = 99
      where id = 'aaaaaaaa-3333-4000-8000-000000000001' $$,
  '23514',
  null,
  'BR-10 — a price list already in effect cannot be edited'
);

select throws_ok(
  $$ update public.price_list_items set price_cents = 1
      where price_list_id = 'aaaaaaaa-3333-4000-8000-000000000001' $$,
  '23514',
  null,
  'BR-10 — cells of an effective price list cannot be edited'
);

select throws_ok(
  $$ delete from public.price_list_items
      where price_list_id = 'aaaaaaaa-3333-4000-8000-000000000001' $$,
  '23514',
  null,
  'BR-10 — cells of an effective price list cannot be deleted'
);

-- A future-dated list is still a draft and may be edited.
insert into public.price_lists (id, site_id, version, effective_from, created_by)
values ('aaaaaaaa-3333-4000-8000-000000000002',
        'aaaaaaaa-0000-4000-8000-000000000001', 2, now() + interval '1 day',
        'aaaaaaaa-1111-4000-8000-000000000001');

select lives_ok(
  $$ update public.price_lists set effective_from = now() + interval '2 days'
      where id = 'aaaaaaaa-3333-4000-8000-000000000002' $$,
  'BR-10 — a list that has not taken effect yet can still be changed'
);

select is(
  public.fn_active_price_list('aaaaaaaa-0000-4000-8000-000000000001'),
  'aaaaaaaa-3333-4000-8000-000000000001'::uuid,
  'US-2.1 AC3 — a future-dated list does not become active early'
);

-- ---------------------------------------------------------------------------
-- US-2.1 AC4 — price list changes are audited
-- ---------------------------------------------------------------------------

select is(
  (select count(*)::int from public.audit_entries
    where action = 'price_list.create'),
  2,
  'US-2.1 AC4 — every price list version writes an audit entry'
);

select is(
  (select actor_user_id from public.audit_entries
    where action = 'price_list.create'
    order by created_at limit 1),
  'aaaaaaaa-1111-4000-8000-000000000001'::uuid,
  'US-2.1 AC4 — the audit entry names the user'
);

select throws_ok(
  $$ update public.audit_entries set action = 'tampered' $$,
  '42501',
  null,
  'BR-07 — the audit log cannot be edited, even by an Owner'
);

select throws_ok(
  $$ delete from public.audit_entries $$,
  '42501',
  null,
  'BR-07 — the audit log cannot be deleted, even by an Owner'
);

-- ---------------------------------------------------------------------------
-- Tenancy and role restrictions
-- ---------------------------------------------------------------------------

select pg_temp.sign_out();
select pg_temp.authenticate_as('bbbbbbbb-0000-4000-8000-000000000002', 'owner');

select is(
  (select count(*)::int from public.vehicle_classes),
  0,
  'an Owner of site B sees none of site A''s vehicle classes'
);

select is(
  (select count(*)::int from public.price_list_items),
  0,
  'an Owner of site B sees none of site A''s prices'
);

select pg_temp.sign_out();
select pg_temp.authenticate_as('aaaaaaaa-0000-4000-8000-000000000001', 'supervisor');

select throws_ok(
  $$ insert into public.services (site_id, name)
     values ('aaaaaaaa-0000-4000-8000-000000000001', 'Sneaky service') $$,
  '42501',
  null,
  'US-10.1 AC3 — only an Owner may edit the catalogue'
);

select is(
  (select count(*)::int from public.audit_entries),
  0,
  'PRD §13.1 — a Supervisor cannot read the audit log'
);

select * from finish();
rollback;
