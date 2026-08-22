-- Slice 1 / S1-03 — Row Level Security on the tenancy core.
--
-- Deny by default: RLS is ENABLEd *and* FORCEd, and a table with no matching
-- policy grants nothing. FORCE matters — without it the table owner bypasses
-- its own policies, which is exactly the hole that makes "we have RLS" untrue.
--
-- No table gets DELETE. PRD BR-15: deactivating a staff member, service, class
-- or customer never deletes historical records.

-- ---------------------------------------------------------------------------
-- Base grants. RLS narrows what these can reach; it does not grant.
-- ---------------------------------------------------------------------------

revoke all on public.sites, public.app_users, public.devices from anon, authenticated;

grant select, update on public.sites to authenticated;
grant select, insert, update on public.app_users to authenticated;
grant select, insert, update on public.devices to authenticated;

alter table public.sites     enable row level security;
alter table public.app_users enable row level security;
alter table public.devices   enable row level security;

alter table public.sites     force row level security;
alter table public.app_users force row level security;
alter table public.devices   force row level security;

-- ---------------------------------------------------------------------------
-- sites
-- ---------------------------------------------------------------------------

-- Everyone signed in to a site can read that site. Nobody can read another.
create policy sites_select_own on public.sites
  for select to authenticated
  using (id = public.auth_site_id());

-- Thresholds, summary time and the photo/override settings are Owner-only
-- (PRD US-10.1 AC3, §13.1 "Set thresholds & rules").
create policy sites_update_own on public.sites
  for update to authenticated
  using (id = public.auth_site_id() and public.fn_has_permission('set_thresholds'))
  with check (id = public.auth_site_id() and public.fn_has_permission('set_thresholds'));

-- No INSERT and no DELETE policy: creating or removing a site is an operator
-- action performed with the service role during onboarding, never something a
-- signed-in user can do.

-- ---------------------------------------------------------------------------
-- app_users
-- ---------------------------------------------------------------------------

create policy app_users_select_own_site on public.app_users
  for select to authenticated
  using (site_id = public.auth_site_id());

-- PRD §13.1: "Manage users & roles" is Owner-only.
--
-- The WITH CHECK on insert is what stops an Owner of site A creating a user
-- inside site B. USING alone would not — it is not evaluated for INSERT.
create policy app_users_insert on public.app_users
  for insert to authenticated
  with check (
    site_id = public.auth_site_id()
    and public.fn_has_permission('manage_users')
  );

create policy app_users_update on public.app_users
  for update to authenticated
  using (site_id = public.auth_site_id() and public.fn_has_permission('manage_users'))
  with check (site_id = public.auth_site_id() and public.fn_has_permission('manage_users'));

-- ---------------------------------------------------------------------------
-- devices
-- ---------------------------------------------------------------------------

create policy devices_select_own_site on public.devices
  for select to authenticated
  using (site_id = public.auth_site_id());

-- US-10.3 AC3: enrolment requires an Owner or Manager credential.
create policy devices_insert on public.devices
  for insert to authenticated
  with check (
    site_id = public.auth_site_id()
    and public.fn_has_permission('enrol_device')
  );

create policy devices_update on public.devices
  for update to authenticated
  using (site_id = public.auth_site_id() and public.fn_has_permission('enrol_device'))
  with check (site_id = public.auth_site_id() and public.fn_has_permission('enrol_device'));
