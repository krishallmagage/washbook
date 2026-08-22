# 8. PIN sign-in mints a scoped JWT, rather than a service-role path

Date: 2026-08-22 · Status: Accepted

## Context

PRD US-10.3 requires a supervisor to sign in with a 4–6 digit PIN on a shared
device. RLS (ADR-0006) derives everything from JWT claims. A PIN is not an
identity provider, so something must bridge the two.

The tempting shortcut is to route PIN-user traffic through server actions using
the service-role key and check permissions in application code. It would work on
day one, and it would demolish ADR-0006 — once one path holds that key, every
future feature reaches for it.

## Decision

A verified PIN causes the server to mint a short-TTL JWT carrying `site_id`,
`role` and `user_id`, signed with the project's JWT secret. Every subsequent
request is then an ordinary RLS-governed request. PINs are hashed at rest and
rate-limited. Sessions expire after a configurable idle period (default 30
minutes, US-10.3 AC2).

Offline mutations carry the identity that created them, so a replay after that
session expired is still attributed correctly rather than to whoever happens to
be holding the phone at sync time.

## Consequences

- Shared-device users are governed by exactly the same database policies as
  everyone else. There is no second authorisation system to keep in sync.
- Token minting, rotation and revocation is code we own and must test carefully.
- A build-time assertion (task S1-09) fails CI if the service-role key reaches
  any client bundle or PIN-reachable path.
- This is the highest-risk area of the build — see `docs/PLAN-M1.md` §6.
