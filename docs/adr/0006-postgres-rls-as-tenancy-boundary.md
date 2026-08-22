# 6. Postgres Row Level Security is the tenancy boundary

Date: 2026-08-22 · Status: Accepted

## Context

Every row in WashBook belongs to exactly one site. A tenancy failure would show
one owner another owner's takings — the single worst thing this product could
do. With one developer and an AI assistant generating a lot of code quickly,
application-layer tenancy checks will eventually be forgotten in one code path.

## Decision

RLS is `ENABLE`d **and** `FORCE`d on every table, deny-by-default, with policies
comparing a denormalised `site_id` against a JWT claim read by `auth_site_id()`.
Role checks go through a single `fn_has_permission()` encoding PRD §13.1.

Every table carries pgTAP tests proving a user of site A cannot SELECT, INSERT,
UPDATE or DELETE site B's rows. CI fails if a table has no such tests.

## Consequences

- A forgotten check in application code cannot leak data; the database refuses.
- Tenancy is testable as a property of the schema, not of every call site.
- Every table needs a `site_id`, denormalised onto children and maintained by
  trigger, so policies stay one indexed comparison.
- PIN-authenticated users must therefore hold a real JWT — see ADR-0008.
- The service-role key defeats all of this, so it is confined to server code
  that no PIN user can reach.
