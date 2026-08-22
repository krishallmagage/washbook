# 10. Ticket state changes only through a database function

Date: 2026-08-22 · Status: Accepted

## Context

PRD §12 defines a ticket state machine with guards — a ticket cannot reach
`READY` with no staff assigned, cannot be billed unless payments sum exactly to
the total, cannot be voided except by a Manager or Owner with a reason.

PRD US-11.2 AC1 says conflicting transitions are "last-write-wins". LWW on a
state machine lets a stale offline `READY` resurrect a voided ticket — and BR-12
would then pay commission on it.

## Decision

`UPDATE` on `tickets.state` is revoked from every application role. The only
path is `fn_ticket_transition()`, which re-evaluates the §12 guard against
current server state, writes `ticket_state_changes` and the audit entry, and
commits atomically.

Offline transitions replay in device order and each one is re-guarded. A
transition whose guard now fails is rejected, audited, and raised to a Manager
(US-11.2 AC2).

This is server-authoritative guard re-evaluation, not last-write-wins. We are
asking for PRD §11 to be amended to say so.

## Consequences

- An illegal state sequence cannot be produced by any client, online or offline.
- Every transition is attributable, because the function writes the history.
- Transition logic lives in SQL and is mirrored in `src/domain/ticket-state.ts`
  for the UI; the two are tested against the same table of cases so they cannot
  drift apart silently.
