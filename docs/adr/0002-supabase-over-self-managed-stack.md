# 2. Supabase rather than a self-managed Postgres stack

Date: 2026-08-22 · Status: Accepted

## Context

WashBook needs Postgres, authentication, file storage for intake photographs,
and per-site data isolation. A solo developer has to run all of it, back it up,
patch it and restore it. PRD §20 frames the constraint precisely: optimise for
one person's ability to change everything quickly, not for scale that does not
exist yet.

## Decision

Use Supabase — Postgres, Auth (GoTrue), Storage and Row Level Security — for
both the local stack (via the Supabase CLI's containers) and the hosted service.

## Consequences

- Auth, storage and RLS arrive without us writing them; least infrastructure per
  feature.
- RLS is a first-class Supabase concept rather than something bolted on, which
  is what makes ADR-0006 practical.
- The service-role key becomes the single most dangerous secret in the product,
  because it bypasses RLS. Handled in `SECURITY.md` and enforced by task S1-09.
- Backups above the free tier are a paid feature, so NFR-09 has a cost attached.
- Some lock-in. The escape hatch is that the schema is plain SQL migrations
  (ADR-0003), so the database itself is portable; Auth and Storage are not.
