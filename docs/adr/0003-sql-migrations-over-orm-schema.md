# 3. SQL migrations as the single schema source, no ORM schema layer

Date: 2026-08-22 · Status: Accepted

## Context

PRD §13 states sixteen business rules, most of which can be a database
constraint, check, trigger or permission. An ORM schema layer (Prisma, Drizzle)
would introduce a second place where the schema lives, and ORM migration
generators are poor at expressing RLS policies, partial indexes, generated
columns and triggers — which is most of what makes this schema correct.

## Decision

Hand-written SQL migrations in `supabase/migrations` are the single source of
truth. Types are generated from the live database with `pnpm db:types` and
committed, so a schema change produces compile errors at every call site.

## Consequences

- One place where the schema lives. RLS, checks and triggers are first-class.
- Compile-time errors when the schema changes, without an ORM runtime.
- More SQL written by hand, and no query builder's type inference on joins.
- Migrations are append-only once pushed — fix forward, never rewrite.
