# 7. Device-prefixed ticket numbers

Date: 2026-08-22 · Status: Proposed — awaiting decision A-05

## Context

Three PRD requirements cannot all hold at once:

- **BR-13** — ticket numbers unique per site per business day, never reused.
- **US-11.1 AC4** — numbers issued offline never collide across devices.
- **Journey 10.1** — the number is printed on a slip handed to the customer at
  intake.

Offline issuance, plus a gapless daily sequence, plus a number that is final at
print time, is impossible without coordination. Pick two.

## Decision

Ticket numbers are `<device short code>-<per-device daily counter>` — `B-014`.
Unique per site per day, never reused, correct offline with zero coordination,
and permanent: the number on the customer's slip never changes after sync.

BR-13 requires _unique_ and _never reused_. It does not require _gapless_.

## Consequences

- The §24 checklist item "two devices creating tickets offline produce no
  duplicate ticket numbers" holds by construction rather than by luck.
- The owner cannot infer the day's vehicle count from the highest number. He
  should not do that anyway — the daily summary is the count.
- Every device must be enrolled and hold a short code before it can take a
  ticket, which makes the `Device` entity (PRD gap G-1) load-bearing.
- **Rejected alternative:** a provisional local number replaced by a server
  number on sync. The printed slip would go stale, and a dispute at the counter
  becomes "the paper says 412, the screen says 389".
