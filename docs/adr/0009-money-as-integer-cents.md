# 9. Money is integer cents everywhere

Date: 2026-08-22 · Status: Accepted

## Context

The PRD does not specify how money is represented. US-4.1 AC3 requires split
payments to sum _exactly_ to the ticket total; US-5.1 requires a cash variance
computed to the rupee. Floating-point money is the most common cause of "the day
does not balance by one rupee" — and that single rupee destroys the owner's
trust in every other figure the product shows him.

## Decision

All monetary values are integers in cents, in columns named `*_cents`, typed
`integer` in Postgres and `number` in TypeScript. Formatting to LKR with
thousands separators happens only at the display edge. Commission splits
distribute the remainder deterministically (proposed BR-17).

## Consequences

- Exact arithmetic. Split-sum validation is a trivial equality.
- `integer` cents caps a single row at Rs. 21.4m, comfortably above a full
  detail at Rs. 35,000; aggregates promote to bigint automatically.
- Every boundary must convert, and a raw rupee value reaching a `*_cents` field
  is a bug the naming convention exists to make visible.
