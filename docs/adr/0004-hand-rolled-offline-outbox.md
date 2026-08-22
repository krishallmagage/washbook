# 4. A hand-rolled append-only outbox rather than a sync framework

Date: 2026-08-22 · Status: Accepted

## Context

PRD US-11.1 requires intake, ticket state changes, staff assignment, attendance
and photo capture to work with no connectivity, and to sync in order on
reconnection. Sync engines exist (PowerSync, ElectricSQL) and would do much of
this for us.

The problem is not writing sync; it is debugging it at 8am at a wash bay when
the day's cash does not reconcile. PRD §20 puts it plainly: avoid a sync
framework whose failure modes you cannot reason about.

## Decision

Dexie (IndexedDB) with an explicit append-only outbox of typed mutation intents.
Each intent carries the identity that created it and a device sequence number.
Sync drains in order; the server re-evaluates every state guard (ADR-0010)
rather than trusting the client.

## Consequences

- Every failure mode is inspectable — the outbox is a list you can read.
- Ordering, retry and conflict handling are ours to get right, and they are the
  highest-risk code in the product (`docs/PLAN-M1.md` §6).
- More code than adopting a framework.
- **Escape hatch:** if the outbox becomes a source of recurring defects, move to
  a Postgres sync engine. That is a deliberate decision to raise, not a drift.
