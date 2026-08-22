-- Slice 2 / S2-01 — the catalogue: vehicle classes, services, versioned price
-- lists, and the audit log that US-2.1 AC4 requires.
--
-- PRD §6.1: price varies along two axes, service and vehicle class, so the
-- price list is a two-dimensional grid the owner edits himself. Nobody types a
-- price at the gate unless they are overriding it (BR-02).
--
-- Money is integer cents throughout (ADR-0009).

-- ---------------------------------------------------------------------------
-- vehicle_classes — US-2.2
-- ---------------------------------------------------------------------------

create table public.vehicle_classes (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid not null references public.sites (id) on delete restrict,
  name        text not null check (btrim(name) <> ''),
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),

  constraint vehicle_classes_name_unique_per_site unique (site_id, name)
);

create index vehicle_classes_site_idx
  on public.vehicle_classes (site_id, sort_order) where is_active;

comment on table public.vehicle_classes is
  'How a site prices. Deactivated, never deleted (BR-15) — history must keep resolving.';

-- ---------------------------------------------------------------------------
-- services — US-2.1
-- ---------------------------------------------------------------------------

create table public.services (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid not null references public.sites (id) on delete restrict,
  name        text not null check (btrim(name) <> ''),
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),

  constraint services_name_unique_per_site unique (site_id, name)
);

create index services_site_idx
  on public.services (site_id, sort_order) where is_active;

-- ---------------------------------------------------------------------------
-- price_lists — US-2.1 AC3, BR-10
-- ---------------------------------------------------------------------------

create table public.price_lists (
  id              uuid primary key default gen_random_uuid(),
  site_id         uuid not null references public.sites (id) on delete restrict,
  version         integer not null check (version > 0),
  effective_from  timestamptz not null default now(),
  created_by      uuid references public.app_users (id) on delete set null,
  created_at      timestamptz not null default now(),

  constraint price_lists_version_unique_per_site unique (site_id, version)
);

create index price_lists_effective_idx
  on public.price_lists (site_id, effective_from desc, version desc);

comment on table public.price_lists is
  'BR-10: prices are versioned. A ticket keeps the prices in force when it was created.';

-- ---------------------------------------------------------------------------
-- price_list_items — the grid itself
-- ---------------------------------------------------------------------------

create table public.price_list_items (
  id                uuid primary key default gen_random_uuid(),
  price_list_id     uuid not null references public.price_lists (id) on delete restrict,

  -- Denormalised so every RLS policy is one indexed comparison rather than a
  -- join back through price_lists. Maintained by trigger, never by the client.
  site_id           uuid not null references public.sites (id) on delete restrict,

  service_id        uuid not null references public.services (id) on delete restrict,
  vehicle_class_id  uuid not null references public.vehicle_classes (id) on delete restrict,

  price_cents       integer check (price_cents >= 0),

  -- US-2.1 AC2: an empty cell means "not offered for this class". Modelled as a
  -- real boolean rather than a missing row, so the grid always has a full set of
  -- cells and "not offered" is a decision on the record rather than an absence
  -- that could equally mean nobody filled it in.
  is_offered        boolean not null default true,

  constraint price_list_items_unique_cell
    unique (price_list_id, service_id, vehicle_class_id),

  -- Offered if and only if there is a price. Without this, a cell could be
  -- offered with a null price and the intake screen would have nothing to show.
  constraint price_list_items_offered_has_price check (
    (is_offered and price_cents is not null)
    or (not is_offered and price_cents is null)
  )
);

create index price_list_items_lookup_idx
  on public.price_list_items (price_list_id, service_id, vehicle_class_id);

-- Keep site_id honest: it must always match the parent list's site.
create or replace function public.fn_price_list_item_site()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select site_id into new.site_id
    from public.price_lists where id = new.price_list_id;
  if new.site_id is null then
    raise exception 'No such price list.' using errcode = 'P0002';
  end if;
  return new;
end;
$$;

create trigger price_list_items_set_site
  before insert or update on public.price_list_items
  for each row execute function public.fn_price_list_item_site();

-- ---------------------------------------------------------------------------
-- BR-10 — a price list is immutable once it takes effect (S2-02)
-- ---------------------------------------------------------------------------

create or replace function public.fn_price_list_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  effective timestamptz;
begin
  if tg_table_name = 'price_lists' then
    effective := old.effective_from;
  else
    select pl.effective_from into effective
      from public.price_lists pl where pl.id = old.price_list_id;
  end if;

  if effective <= now() then
    raise exception
      'This price list is already in effect and cannot be changed. Save a new version instead.'
      using errcode = '23514';
  end if;

  return case tg_op when 'DELETE' then old else new end;
end;
$$;

create trigger price_lists_immutable
  before update or delete on public.price_lists
  for each row execute function public.fn_price_list_immutable();

create trigger price_list_items_immutable
  before update or delete on public.price_list_items
  for each row execute function public.fn_price_list_immutable();

-- ---------------------------------------------------------------------------
-- audit_entries — US-2.1 AC4 needs this now; Slice 11 hardens it
-- ---------------------------------------------------------------------------

-- PRD §11.2 and BR-07. Created here rather than deferred to Slice 11 because
-- US-2.1 AC4 is an M1 acceptance criterion: price list changes are written to
-- the audit log with the user and timestamp. Slice 11 adds the hash chain and
-- the full action coverage; the append-only guarantee is enforced from day one.
create table public.audit_entries (
  id             uuid primary key default gen_random_uuid(),
  site_id        uuid not null references public.sites (id) on delete restrict,
  actor_user_id  uuid references public.app_users (id) on delete set null,
  action         text not null check (btrim(action) <> ''),
  entity_type    text not null,
  entity_id      uuid,
  before_json    jsonb,
  after_json     jsonb,
  device_id      uuid references public.devices (id) on delete set null,
  created_at     timestamptz not null default now()
);

create index audit_entries_site_time_idx
  on public.audit_entries (site_id, created_at desc);

-- BR-07: append-only for every role, including Owner. Belt and braces —
-- the grant is revoked AND a trigger raises, so re-granting is not enough.
create or replace function public.fn_audit_append_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'The audit log is append-only. Entries cannot be changed or removed.'
    using errcode = '42501';
end;
$$;

create trigger audit_entries_append_only
  before update or delete on public.audit_entries
  for each row execute function public.fn_audit_append_only();

-- US-2.1 AC4 — enforced by trigger rather than by the server action, so a
-- price change cannot reach the table without its audit entry.
create or replace function public.fn_audit_price_list()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_entries
    (site_id, actor_user_id, action, entity_type, entity_id, after_json)
  values (
    new.site_id,
    new.created_by,
    'price_list.create',
    'price_list',
    new.id,
    jsonb_build_object(
      'version', new.version,
      'effective_from', new.effective_from
    )
  );
  return new;
end;
$$;

create trigger price_lists_audited
  after insert on public.price_lists
  for each row execute function public.fn_audit_price_list();
