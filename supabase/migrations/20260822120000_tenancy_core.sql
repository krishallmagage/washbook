-- Slice 1 / S1-01 — tenancy core: sites, app_users, devices.
--
-- Every row in WashBook belongs to exactly one site. A tenancy failure would
-- show one owner another owner's takings, which is the worst thing this product
-- could do (ADR-0006). The database is therefore the boundary, not the app.
--
-- Money columns do not appear in this migration; when they do they are integer
-- cents (ADR-0009).

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

-- PRD US-10.1 AC1.
create type public.site_role as enum (
  'owner',
  'manager',
  'cashier',
  'supervisor',
  'staff',
  'readonly'
);

-- ---------------------------------------------------------------------------
-- sites
-- ---------------------------------------------------------------------------

create table public.sites (
  id                uuid primary key default gen_random_uuid(),
  name              text        not null check (btrim(name) <> ''),
  address           text,
  phone             text,

  -- Asia/Colombo is UTC+5:30. The half-hour offset breaks naive date maths, so
  -- every business-day computation runs in this zone explicitly.
  timezone          text        not null default 'Asia/Colombo',
  currency          char(3)     not null default 'LKR',

  -- PRD §11.2. VAT invoicing itself is M3; the columns exist now so that adding
  -- them to a live table later is not a migration plus a rounding audit.
  vat_registered    boolean     not null default false,
  tin               text        check (tin is null or tin ~ '^[0-9]{9}$'),
  branch_code       text,

  -- US-5.3 AC1: the owner's summary is delivered at a configurable time.
  summary_time      time        not null default '19:00',

  -- US-1.5 AC5 / §12 guard: a site may require a photograph before a ticket
  -- can leave DRAFT.
  photo_required    boolean     not null default false,

  -- PRD §13.1 footnote: supervisor price-override is a per-site setting,
  -- default off.
  supervisor_can_override boolean not null default false,

  -- B-3 (docs/PLAN-M1.md): the PRD does not define where one business day ends
  -- and the next begins. A wash open until 9pm must not have its late tickets
  -- land on tomorrow, so the boundary is a local-time cutoff, not midnight.
  day_cutoff_time   time        not null default '04:00',

  -- PRD §11.2 thresholds. Typed columns rather than a JSON blob: JSON cannot
  -- carry a CHECK, and these values gate the exception flags an owner acts on.
  threshold_cash_variance_cents        integer not null default 50000
    check (threshold_cash_variance_cents >= 0),
  threshold_discount_pct               numeric(5,2) not null default 15.00
    check (threshold_discount_pct >= 0 and threshold_discount_pct <= 100),
  threshold_consumable_variance_pct    numeric(5,2) not null default 20.00
    check (threshold_consumable_variance_pct >= 0 and threshold_consumable_variance_pct <= 100),

  created_at        timestamptz not null default now()
);

comment on table public.sites is
  'One physical wash location. The tenancy root — every other table carries site_id.';

-- ---------------------------------------------------------------------------
-- app_users
-- ---------------------------------------------------------------------------

create table public.app_users (
  id            uuid primary key default gen_random_uuid(),
  site_id       uuid not null references public.sites (id) on delete restrict,

  -- Owner and Manager sign in through Supabase Auth and have an auth.users row.
  -- Cashier, Supervisor and Staff sign in by PIN on a shared device (US-10.3)
  -- and may have none — so this is nullable by design, not by omission.
  auth_user_id  uuid unique references auth.users (id) on delete set null,

  full_name     text not null check (btrim(full_name) <> ''),
  role          public.site_role not null,

  -- Never the PIN itself. Hashed with pgcrypto in S1-06; null until then, and
  -- null means "this user cannot sign in by PIN".
  pin_hash      text,
  pin_set_at    timestamptz,

  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),

  -- A PIN user with no auth account must still be reachable by some route, and
  -- a user with neither cannot sign in at all — which is a data error, not a
  -- valid state.
  constraint app_users_has_a_sign_in_route
    check (auth_user_id is not null or pin_hash is not null or is_active = false)
);

create index app_users_site_idx on public.app_users (site_id) where is_active;

comment on table public.app_users is
  'A person who can sign in. Owner/Manager via Supabase Auth; other roles by PIN (US-10.3).';

-- ---------------------------------------------------------------------------
-- devices
-- ---------------------------------------------------------------------------

-- PRD gap G-1 (docs/PLAN-M1.md §1.3): US-10.3 AC3 requires device enrolment and
-- TicketPhoto/AuditEntry both carry a device_id, but §11.2 defines no Device
-- entity. It is also load-bearing for ADR-0007: the short_code prefixes ticket
-- numbers so two devices creating tickets offline cannot collide.
create table public.devices (
  id            uuid primary key default gen_random_uuid(),
  site_id       uuid not null references public.sites (id) on delete restrict,

  label         text not null check (btrim(label) <> ''),

  -- Single character, A-Z. Becomes the ticket-number prefix: B-014.
  short_code    text not null check (short_code ~ '^[A-Z]$'),

  enrolled_by   uuid references public.app_users (id) on delete set null,
  enrolled_at   timestamptz not null default now(),
  last_seen_at  timestamptz,
  is_active     boolean not null default true,

  -- The uniqueness that makes offline ticket numbering safe.
  constraint devices_short_code_unique_per_site unique (site_id, short_code)
);

create index devices_site_idx on public.devices (site_id) where is_active;

comment on table public.devices is
  'An enrolled phone or tablet. short_code prefixes ticket numbers so offline devices cannot collide (ADR-0007).';
