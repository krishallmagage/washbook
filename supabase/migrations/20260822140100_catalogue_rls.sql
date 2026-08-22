-- Slice 2 / S2-03 — RLS on the catalogue, plus price resolution.
--
-- ADR-0006: deny by default, ENABLE and FORCE on every table, no DELETE grant
-- anywhere (BR-15).

revoke all on
  public.vehicle_classes,
  public.services,
  public.price_lists,
  public.price_list_items,
  public.audit_entries
from anon, authenticated;

grant select, insert, update on public.vehicle_classes  to authenticated;
grant select, insert, update on public.services         to authenticated;
grant select, insert         on public.price_lists      to authenticated;
grant select, insert, update on public.price_list_items to authenticated;
grant select                 on public.audit_entries    to authenticated;

alter table public.vehicle_classes  enable row level security;
alter table public.services         enable row level security;
alter table public.price_lists      enable row level security;
alter table public.price_list_items enable row level security;
alter table public.audit_entries    enable row level security;

alter table public.vehicle_classes  force row level security;
alter table public.services         force row level security;
alter table public.price_lists      force row level security;
alter table public.price_list_items force row level security;
alter table public.audit_entries    force row level security;

-- ---------------------------------------------------------------------------
-- Catalogue: everyone at the site reads it (the intake screen needs it);
-- only an Owner edits it (PRD §13.1 "Edit price list", US-10.1 AC3).
-- ---------------------------------------------------------------------------

create policy vehicle_classes_select on public.vehicle_classes
  for select to authenticated using (site_id = public.auth_site_id());

create policy vehicle_classes_insert on public.vehicle_classes
  for insert to authenticated
  with check (site_id = public.auth_site_id()
              and public.fn_has_permission('edit_price_list'));

create policy vehicle_classes_update on public.vehicle_classes
  for update to authenticated
  using (site_id = public.auth_site_id()
         and public.fn_has_permission('edit_price_list'))
  with check (site_id = public.auth_site_id()
              and public.fn_has_permission('edit_price_list'));

create policy services_select on public.services
  for select to authenticated using (site_id = public.auth_site_id());

create policy services_insert on public.services
  for insert to authenticated
  with check (site_id = public.auth_site_id()
              and public.fn_has_permission('edit_price_list'));

create policy services_update on public.services
  for update to authenticated
  using (site_id = public.auth_site_id()
         and public.fn_has_permission('edit_price_list'))
  with check (site_id = public.auth_site_id()
              and public.fn_has_permission('edit_price_list'));

create policy price_lists_select on public.price_lists
  for select to authenticated using (site_id = public.auth_site_id());

create policy price_lists_insert on public.price_lists
  for insert to authenticated
  with check (site_id = public.auth_site_id()
              and public.fn_has_permission('edit_price_list'));

create policy price_list_items_select on public.price_list_items
  for select to authenticated using (site_id = public.auth_site_id());

create policy price_list_items_insert on public.price_list_items
  for insert to authenticated
  with check (site_id = public.auth_site_id()
              and public.fn_has_permission('edit_price_list'));

create policy price_list_items_update on public.price_list_items
  for update to authenticated
  using (site_id = public.auth_site_id()
         and public.fn_has_permission('edit_price_list'))
  with check (site_id = public.auth_site_id()
              and public.fn_has_permission('edit_price_list'));

-- PRD §13.1: only Owner and Manager may view the audit log. There is no INSERT
-- policy on purpose — entries are written by SECURITY DEFINER triggers, so a
-- user cannot forge one, and the append-only trigger blocks change or removal.
create policy audit_entries_select on public.audit_entries
  for select to authenticated
  using (site_id = public.auth_site_id()
         and public.fn_has_permission('view_audit_log'));

-- ---------------------------------------------------------------------------
-- Price resolution — US-1.3
-- ---------------------------------------------------------------------------

-- The list in force right now. Later effective_from wins; version breaks ties
-- so two lists saved in the same instant still order deterministically.
create or replace function public.fn_active_price_list(p_site_id uuid)
returns uuid
language sql
stable
set search_path = ''
as $$
  select id
    from public.price_lists
   where site_id = p_site_id
     and effective_from <= now()
   order by effective_from desc, version desc
   limit 1;
$$;

grant execute on function public.fn_active_price_list(uuid) to authenticated;

-- US-1.3 AC1: given a class and a service, the price appears without being
-- typed. Returns null when the combination is not offered (AC2), which the
-- caller must treat as "not selectable" rather than as free.
create or replace function public.fn_resolve_price_cents(
  p_site_id           uuid,
  p_service_id        uuid,
  p_vehicle_class_id  uuid
)
returns integer
language sql
stable
set search_path = ''
as $$
  select i.price_cents
    from public.price_list_items i
   where i.price_list_id = public.fn_active_price_list(p_site_id)
     and i.service_id = p_service_id
     and i.vehicle_class_id = p_vehicle_class_id
     and i.is_offered;
$$;

grant execute on function public.fn_resolve_price_cents(uuid, uuid, uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- US-2.2 AC1 — default classes, and a starter service list (US-10.4 AC2)
-- ---------------------------------------------------------------------------

create or replace function public.fn_seed_default_catalogue(p_site_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  default_classes constant text[] := array[
    'Motorcycle', 'Three-wheeler', 'Car (small)', 'Car (large)',
    'SUV/Cab', 'Van', 'Lorry'
  ];
  -- PRD §6.1. Prices are deliberately NOT seeded: the owner sets his own, and
  -- the assumed ranges in the PRD are unvalidated (A-08).
  default_services constant text[] := array[
    'Body wash', 'Wash + vacuum', 'Full wash', 'Engine wash',
    'Underbody wash', 'Wax / polish', 'Interior shampoo',
    'Leather treatment', 'Full detail'
  ];
  item text;
  idx integer;
begin
  if p_site_id <> public.auth_site_id()
     or not public.fn_has_permission('edit_price_list') then
    raise exception 'Only an Owner may set up the catalogue, and only for their own site.'
      using errcode = '42501';
  end if;

  idx := 0;
  foreach item in array default_classes loop
    insert into public.vehicle_classes (site_id, name, sort_order)
    values (p_site_id, item, idx)
    on conflict (site_id, name) do nothing;
    idx := idx + 1;
  end loop;

  idx := 0;
  foreach item in array default_services loop
    insert into public.services (site_id, name, sort_order)
    values (p_site_id, item, idx)
    on conflict (site_id, name) do nothing;
    idx := idx + 1;
  end loop;
end;
$$;

grant execute on function public.fn_seed_default_catalogue(uuid) to authenticated;
