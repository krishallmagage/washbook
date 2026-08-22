# CLAUDE.md — how we work on WashBook

This file is the standing contract for every session. It survives across
conversations; the chat history does not. If a rule changes, this file changes
in the same pull request.

**Source of truth for scope:** [`docs/PRD.md`](docs/PRD.md).
**Source of truth for how we build it:** [`docs/PLAN-M1.md`](docs/PLAN-M1.md) and
[`docs/TASKS-M1.md`](docs/TASKS-M1.md).

If anything here contradicts the PRD, say so — do not silently pick one.

---

## 1. How we work

1. **Plan before you build.** For any task larger than a single file edit, state
   the plan, wait for approval, then execute.
2. **Work in vertical slices.** One user story at a time, end to end — schema,
   server, UI, tests — not layer by layer. A slice is not done until its
   acceptance criteria pass.
3. **Follow the PRD's release order.** M1 only, in the sequence in PRD §19 as
   refined by `docs/TASKS-M1.md`. Do not build M2 or M3 features early, however
   easy they look.
4. **Never invent scope.** If something is needed but is not in the PRD, stop and
   ask. Add it to §6 below rather than building it.
5. **Never claim something works unless you ran it.** No "this should work". No
   "I've implemented X" without having executed the test or the command and shown
   the output. If you cannot run it, say so explicitly and say what to run.
6. **When a test fails, do not weaken the test.** Fix the code. If the test
   itself is wrong, say why before changing it.
7. **Ask rather than assume** about how a Sri Lankan car wash operates. PRD §17
   lists the unvalidated assumptions. Flag when you are relying on one.
8. **Small commits, always green.** Every commit on a feature branch must
   typecheck, lint and pass tests. Never commit a broken state "to save
   progress".

## 2. Zero-defect posture

We do not hope for zero defects. We make them expensive to introduce and cheap
to catch.

- **Types are the first test.** `strict` plus `noUncheckedIndexedAccess` (and
  `exactOptionalPropertyTypes`). `any` is banned and enforced by lint. No
  `@ts-ignore`; `@ts-expect-error` only with a description of at least 20
  characters and a linked issue.
- **The database enforces invariants, not just the app.** Anything in PRD §13
  that can be a constraint, a check, a trigger or a permission is one.
  Application validation is a second line, never the only line.
- **Every business rule gets a test named after it** — `BR-06 cash variance
requires a note`. Every acceptance criterion in PRD §9 becomes a test case. The
  PRD §24 checklist becomes an executable E2E suite.
- **RLS is tested, not assumed.** Every table gets pgTAP tests proving a user
  from site A cannot read, write or delete site B's rows. CI fails if a table
  has no RLS tests.
- **Nothing merges that is not green.** CI runs typecheck, lint, format, unit,
  database, build and E2E on every pull request.
- **Bugs get a failing test first.** Reproduce, write the failing test, fix, then
  show both.

## 3. Never

- Never push directly to `main`. The `pre-push` hook enforces this locally.
- Never `git push --force` on a shared branch, and never `--force-with-lease` on
  `main`.
- Never use `--no-verify` to skip hooks.
- Never commit a `.env` file, a key, a token, or a Supabase service-role key.
  `.env.example` only.
- Never delete or rewrite a migration that has already been pushed. Fix forward.
- Never disable a lint rule or a test to make CI pass. Fix the cause or ask.
- Never run a destructive database command against anything but the local Docker
  database.

## 4. Stack — decided, not open

Exact versions are pinned in `package.json` (no `^`, no `~`). Rationale and the
version evidence are in `docs/PLAN-M1.md` §2.

| Layer          | Choice                                                                                                               |
| -------------- | -------------------------------------------------------------------------------------------------------------------- |
| Language       | TypeScript **6.0.3** — highest version `typescript-eslint` supports; TS 7 would disable type-aware linting           |
| Runtime        | Node **22.14.0** — pending the move to 24 (see §6, OQ-A)                                                             |
| Packages       | pnpm 11.17.0 via Corepack, lockfile committed, `--frozen-lockfile` in CI                                             |
| Framework      | Next.js 16.3.2, App Router, RSC, `basePath: '/washbook'`, `output: 'standalone'`                                     |
| Styling        | Tailwind CSS 4.3.3                                                                                                   |
| Validation     | Zod 4.4.3 at every boundary — forms, server actions, route handlers, env                                             |
| Database       | PostgreSQL via Supabase; SQL migrations in `supabase/migrations` are the single source of truth. No ORM schema layer |
| Types from DB  | `pnpm db:types`, generated file committed                                                                            |
| Tenancy        | Postgres Row Level Security per `site_id`, `FORCE`d, deny-by-default                                                 |
| Unit tests     | Vitest 4.1.11                                                                                                        |
| Database tests | pgTAP via `pnpm test:db`                                                                                             |
| E2E            | Playwright 1.62.1, including offline and PWA scenarios                                                               |
| Lint           | ESLint **9.39.5** + `typescript-eslint` 8.67.0 strict-type-checked, Prettier, knip                                   |
| Hooks          | Husky + lint-staged + commitlint                                                                                     |
| CI             | GitHub Actions                                                                                                       |
| Releases       | release-please with Conventional Commits                                                                             |

**Two pins that are not the newest available, deliberately:**

- **TypeScript 6.0.3, not 7.0.2.** `typescript-eslint@8.67.0` declares
  `typescript: ">=4.8.4 <6.1.0"`. TS 7 silently disables type-aware linting.
  Revisit when typescript-eslint ships TS 7 support.
- **ESLint 9.39.5, not 10.9.0.** typescript-eslint 8.67.0 declares peer support
  for ESLint 10 but its scope manager does not implement ESLint 10.9's
  `scopeManager.addGlobals()`; linting crashes at runtime. Verified, not
  assumed — see §6, OQ-B.

## 5. Branching, commits, and the "push" contract

Trunk-based, short-lived branches. `main` is always deployable and is only ever
updated by a merged pull request.

| Branch                       | Purpose                                             |
| ---------------------------- | --------------------------------------------------- |
| `feat/<epic>-<short-name>`   | One user story or a tight group                     |
| `fix/<issue>-<short-name>`   | A defect                                            |
| `chore/` `docs/` `refactor/` | Tooling, documentation, behaviour-preserving change |

Commits are Conventional Commits, enforced by commitlint. **The body is not
optional** for anything but a trivial chore: what changed, why, what was
considered and rejected, and any follow-up now owed. `Refs: #<issue>`.

When the product owner says **"push"** — do all of this, in order, reporting each
step:

1. Refuse if the current branch is `main`; offer to move the work to a branch.
2. `git status` and `git diff` — show what will be staged; stop if anything
   unexpected is there.
3. Confirm no secret, `.env`, key, token or large binary is in the diff.
4. Run `pnpm check`. If any step fails, stop and fix. Never push a failing state,
   never skip hooks.
5. Stage deliberately by path, not a blanket `git add .`.
6. Write the Conventional Commit with a real body, referencing the issue.
7. Push and set upstream.
8. Open a PR with `gh pr create` using the template, filled in.
9. Report the PR URL and CI status once checks have started.

Stop at the first step that cannot be completed and say why.

## 6. Open scope questions

Things the PRD does not settle, or where a default has been chosen and needs
confirmation. Full analysis in `docs/PLAN-M1.md` §1.

**Blocking decisions** (`docs/TASKS-M1.md` Phase A):

| ID   | Question                                                                                | Default in use                                       |
| ---- | --------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| B-1  | Ticket numbering: offline issuance vs gapless daily sequence vs a number final at print | Device-prefixed, permanent, unique-not-gapless       |
| B-2  | M1 daily summary delivery — `wa.me` deep links cannot push                              | Web Push + in-app + `wa.me` share                    |
| B-3  | Opening cash float, who opens a business day, day boundary                              | Explicit open with counted float; 04:00 local cutoff |
| B-4  | Production target: Vercel or self-hosted Docker at `/washbook`                          | Unresolved — Docker built either way                 |
| A-11 | Scope lever: 53 / 45 / 38 days                                                          | Unresolved                                           |

**Defaults chosen while building** — change any of these by saying so:

| ID   | Question                                                                            | Default in use                                                         |
| ---- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| OQ-A | Node 22.14.0 vs 24                                                                  | 22.14.0 for now; 24 recommended (22 is in maintenance, EOL 2027-04-30) |
| OQ-B | ESLint 9 vs 10                                                                      | 9.39.5 — 10.x crashes with typescript-eslint 8.67.0                    |
| OQ-C | Money representation                                                                | Integer cents (`*_cents`), formatted only at the display edge          |
| OQ-D | Commission rounding when a ticket splits unevenly                                   | Remainder to the earliest-assigned staff; proposed as BR-17            |
| OQ-E | `US-1.4 AC4` override threshold — percentage of line or of ticket total             | Ticket total                                                           |
| OQ-F | `US-1.1 AC3` partial entry — server DRAFT row or local only                         | Local only; ticket number issued at `QUEUED`                           |
| OQ-G | Which transitions can the `Staff` role make                                         | `IN_PROGRESS → FINISHING` only, on tickets they are assigned to        |
| OQ-H | Is the day-close screen a "report" (Cashier lacks report permission)?               | Operational screen; granted with Close-day                             |
| OQ-I | Ticket-level vs line-level discount (PRD journey 10.4 implies ticket-level)         | Line-level; ticket percentage computed                                 |
| OQ-J | Supabase `project_id` is `WashBook`; container and network names inherit the casing | Left as-is; `SUPABASE_NETWORK` overrides in compose                    |

**PRD gaps being carried** — entities and columns the stories need and PRD §11.2
does not define: `Device`, `staff.user_id`, `tickets.is_disputed`, vehicle owner
history, `payments.business_day_id`, ticket carry-forward, and intake timing
instrumentation. See `docs/PLAN-M1.md` §1.3.

## 7. Definition of done

A story is done when all of these are true, and you state them explicitly when
claiming completion:

1. Every acceptance criterion has a passing automated test named after it.
2. Relevant PRD §13 business rules are enforced in the database, not only the app.
3. RLS policies exist for every new table and are proven by pgTAP.
4. The UI works on a small screen, in Sinhala and English, with 44px targets.
5. Offline behaviour is implemented and tested where PRD §11 requires it.
6. Loading, empty, error and offline states all exist. No blank screen.
7. Errors say what went wrong and what to do. No raw stack traces reach a user.
8. `pnpm check` passes and CI is green.
9. The pull request is merged and the issue closed by the merge.
10. This file is updated if anything about how we work changed.
