# Security

WashBook holds a wash's entire commercial record — every ticket, every payment,
every day's cash. A tenancy failure would show one owner another owner's
takings. That is the failure mode this document exists to prevent.

## Reporting a vulnerability

Email **sprout@hsenidmobile.com** with `[WashBook security]` in the subject.

Please include what you found, how to reproduce it, and what an attacker could
do with it. Do not open a public GitHub issue for a security problem, and do not
test against a live pilot site's data.

You will get an acknowledgement within 3 working days and an assessment within 10. While this product is pre-launch there is no bounty programme; credit is
given in the release notes unless you prefer otherwise.

## Our standing rules

**No key ever enters this repository.** Not in a commit, not in a comment, not
in a test fixture, not "temporarily". `.gitignore` blocks every `.env` file
except `.env.example`, and CI fails the build if a tracked `.env` file or a
service-role key pattern appears in the tree.

If a key is committed by accident: **rotate it first**, then clean the history.
A key that has been pushed is compromised regardless of how quickly the commit
was reverted.

**The Supabase service-role key bypasses Row Level Security.** RLS is the
tenancy boundary for the entire product (PRD §20), so that key is the one thing
that can defeat it. It is server-only, is never exposed as a `NEXT_PUBLIC_*`
variable, is never passed into a Docker build stage, and never reaches any code
path a PIN-authenticated user can invoke.

**Row Level Security is enabled and `FORCE`d on every table**, deny-by-default,
and proven by pgTAP tests asserting that a user of site A cannot read, write or
delete site B's rows. CI fails if a table exists without those tests. No table is
ever left unprotected "temporarily".

**The audit log is append-only.** `UPDATE` and `DELETE` are revoked from every
application role including Owner, and a trigger raises on either. Note the honest
limit: a Postgres superuser can drop a trigger and re-grant. Rows therefore carry
a hash chain, so tampering is detectable even where it cannot be prevented.

**Customer mobile numbers** are used only for that site's own service and
marketing messages. A marketing opt-out is permanent and cannot be overridden
anywhere in the UI (PRD BR-09). No data is shared across sites.

**Photographs** are purged on the retention schedule in PRD BR-16 (default 90
days) by a scheduled job, unless the ticket is flagged as disputed.

## Dependencies

Dependabot runs weekly with grouped minor updates. Versions are pinned exactly
(no `^`, no `~`) so an update is always a reviewed, deliberate change.
