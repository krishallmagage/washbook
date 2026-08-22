# WashBook — M1 Execution Backlog

**Companion to [`docs/PLAN-M1.md`](PLAN-M1.md).** Destination in the repo: `docs/TASKS-M1.md`.
**Status:** draft — nothing here is started. Phase A is blocking.

---

## How to read this

| Convention | Meaning                                                                                                   |
| ---------- | --------------------------------------------------------------------------------------------------------- |
| `S4-06`    | Slice 4, task 6. Stable ID — use it in branch names, commits (`Refs:`) and PR titles                      |
| **Est**    | Engineer-days of effort, including writing the tests and getting them green. Not calendar days            |
| **Refs**   | PRD user story, acceptance criterion, business rule, or a `docs/PLAN-M1.md` finding (`B-1`, `G-8`, `C-4`) |
| ⛔         | Blocked on a decision in Phase A. Cannot start                                                            |
| `[L1]`     | Dropped under Lever 1 in `docs/PLAN-M1.md` §1.5 (trim to keep the quality bar)                            |
| `[L2]`     | Dropped under Lever 2 (cut Must features to reach the floor)                                              |
| ★          | On the critical path to the field test — a slip here slips everything                                     |

**Estimate honesty.** These are bottom-up: each task estimated on its own, then summed. They total **~70 engineer-days**, against the top-down **53** in `docs/PLAN-M1.md` §5. That gap is the normal decomposition effect — top-down estimates omit the work you only see once you list it. I have not adjusted either number to meet the other. The truth is probably between them, and **the way to find out is to measure**: see "Re-baselining" at the end. Slices 0–4 are decomposed properly because they are next; Slices 5–13 are decomposed at task level and will be broken down again when reached.

**Definition of done** for every task with a `Refs` column entry: `docs/PLAN-M1.md`'s bar and your bootstrap §6. Specifically — the acceptance criterion has a test named after it, the business rule is enforced in the database and not only the app, every new table has four RLS pgTAP tests, loading/empty/error/offline states exist, `pnpm check` passes, CI is green.

---

## Phase A — Unblock (your time, not engineering days)

Nothing in Slice 0 starts until A-01 through A-04 are done. The rest are needed within the first week.

| ID   | Task                                                                             | Blocks                                 | Ref                   |
| ---- | -------------------------------------------------------------------------------- | -------------------------------------- | --------------------- |
| A-01 | Install `gh`, `gh auth login` with the `workflow` scope, verify `gh auth status` | All of Slice 0 GitHub work             | Bootstrap §3.1        |
| A-02 | Confirm repository name and visibility (`krishallmagage/washbook`, private?)     | S0-22                                  | Bootstrap §3.1.2      |
| A-03 | Choose `LICENSE` (default: private proprietary notice)                           | S0-18                                  | Bootstrap §3.2        |
| A-04 | **Decide production target: Vercel or self-hosted Docker at `/washbook`**        | S0-12, S0-13, ADR-0012                 | `docs/PLAN-M1.md` B-4 |
| A-05 | Decide ticket numbering scheme                                                   | S3-04, S4-01                           | B-1                   |
| A-06 | Decide M1 daily-summary delivery channel                                         | Slice 9 entirely                       | B-2                   |
| A-07 | Decide day open / opening float / day boundary cutoff                            | Slice 8 entirely                       | B-3                   |
| A-08 | Approve TypeScript 6.0.3, Node 24, `exceljs` over npm `xlsx`                     | S0-01, S0-02                           | §2.1–2.3              |
| A-09 | Approve minimal queue board in M1                                                | S6-07                                  | C-1                   |
| A-10 | Decide ticket-level vs line-level discount                                       | S4-08                                  | G-7                   |
| A-11 | **Choose the scope lever (53 / 45 / 38 days)**                                   | Which `[L1]`/`[L2]` tasks exist at all | §1.5                  |
| A-12 | Answer OQ-05 — printer make and model at the pilot site                          | S7-08                                  | PRD §17.2             |
| A-13 | Answer OQ-04 — WiFi in the bay area or mobile data only                          | S3-03 sizing                           | PRD §17.2             |
| A-14 | Answer OQ-01, OQ-02 — what is recorded today; how cash is handed over            | Slice 8                                | PRD §17.2             |
| A-15 | Answer OQ-03 — exact wage and commission structure                               | Slice 10                               | PRD §17.2             |
| A-16 | Supabase: cloud project now or local-only? Paid tier for NFR-09 backups?         | S0-10, S13-04                          | NFR-09                |
| A-17 | Sentry account / DSN, or confirm free tier                                       | S13-06                                 | Bootstrap §2          |
| A-18 | **Book the Saturday at the pilot site**                                          | The field-test gate after Slice 4      | PRD §22, R-02         |
| A-19 | Tell me the exact handset model the supervisor will use                          | S12-06                                 | NFR-05, US-11.4       |
| A-20 | Name a Sinhala reviewer                                                          | S12-03                                 | US-11.3, R-01         |
| A-21 | Send the pilot site's real price grid in rupees                                  | S13-01, validates A-03                 | PRD §17.1             |

---

## Slice 0 — Foundation `chore/bootstrap` · **8.4d**

> This is the sharpest example of the decomposition effect. `docs/PLAN-M1.md` §5 estimated Slice 0 at 3 days; listing the actual work items — two compose files, CI with pgTAP in the runner, twelve ADRs, twenty-eight GitHub issues, README, templates, Dependabot — sums to 8.4. The scope did not grow; it became visible.

**Exit:** `git clone && docker compose up` → `http://localhost:3000/washbook` loads in a real browser, health route green, CI passing on an empty PR.

| ID    | Task                                                                                                                                                                                                                                 | Refs                   | Est  | Deps           |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- | ---- | -------------- |
| S0-01 | ★ **Spike:** TypeScript 6.0.3 + Next 16.3.2 + Tailwind 4.3.3 + shadcn CLI. Verify `next build`, `tsc --noEmit` and `typescript-eslint` strict-type-checked all clean. Fall back to TS 5.9.3 and report if not                        | §2.1                   | 0.5  | ⛔ A-08        |
| S0-02 | `package.json`, Corepack pin, `.nvmrc` = 24, `engines`, exact pins from `docs/PLAN-M1.md` §2.5                                                                                                                                       | §2.5                   | 0.25 | S0-01          |
| S0-03 | Next scaffold: App Router, `basePath: '/washbook'`, `output: 'standalone'`, root `/` → `/washbook` redirect with `basePath: false`                                                                                                   | Bootstrap §5.1         | 0.5  | S0-02          |
| S0-04 | `tsconfig.json`: `strict`, `noUncheckedIndexedAccess`, path aliases, no implicit any                                                                                                                                                 | Bootstrap §1.2         | 0.15 | S0-02          |
| S0-05 | `eslint.config.mjs`: typescript-eslint strict-type-checked, `no-explicit-any` as error, `no-floating-promises`, `no-misused-promises`; Prettier; knip                                                                                | Bootstrap §1.2         | 0.5  | S0-04          |
| S0-06 | `vitest.config.ts` + one passing `src/domain` test; `playwright.config.ts` with a base-path-aware baseURL                                                                                                                            | Bootstrap §2           | 0.25 | S0-04          |
| S0-07 | Husky: `pre-commit` (lint-staged), `commit-msg` (commitlint), **`pre-push` refusing any push targeting `main`**                                                                                                                      | Bootstrap §1.3, §3.1.5 | 0.25 | S0-02          |
| S0-08 | `.gitignore`, `.gitattributes` (`* text=auto eol=lf`), `.editorconfig`, `.prettierrc`, `.env.example`                                                                                                                                | Bootstrap §3.2         | 0.25 | —              |
| S0-09 | `src/lib/env.ts` — Zod-validated environment, fails fast at boot, server/client split so no secret can be imported client-side                                                                                                       | Bootstrap §2           | 0.25 | S0-02          |
| S0-10 | `supabase init`, `config.toml`, `supabase start` green, empty first migration, `pnpm db:types` script producing a committed `src/types/database.ts`                                                                                  | Bootstrap §5.2         | 0.5  | ⛔ A-16        |
| S0-11 | `GET /washbook/api/health` — app status, DB connectivity, build SHA                                                                                                                                                                  | Bootstrap §5.1         | 0.25 | S0-10          |
| S0-12 | `Dockerfile`: multi-stage (deps → build → runner), non-root user, standalone output, `HEALTHCHECK` on the health route                                                                                                               | Bootstrap §5.1         | 0.75 | ⛔ A-04, S0-11 |
| S0-13 | `docker-compose.yml` (production-like) + `docker-compose.dev.yml` (bind mount, `node_modules` in-container, polling file watch for Docker Desktop), named volume for DB persistence                                                  | Bootstrap §5.1         | 0.5  | S0-12          |
| S0-14 | ★ **Verify in a real browser**, not by reading code: root redirect, static assets, service-worker scope and the PWA manifest all resolve under `/washbook`                                                                           | Bootstrap §5.1         | 0.25 | S0-13          |
| S0-15 | All 20 `package.json` scripts from bootstrap §5.3, including `check`                                                                                                                                                                 | Bootstrap §5.3         | 0.15 | S0-13          |
| S0-16 | `.github/workflows/ci.yml`: typecheck → lint → knip → unit → **pgTAP** → build → E2E. `--frozen-lockfile`, Node 24, Supabase CLI in the runner                                                                                       | Bootstrap §1.2         | 0.6  | S0-15          |
| S0-17 | `release-please.yml` + config, Conventional Commits driving SemVer from `0.1.0`                                                                                                                                                      | Bootstrap §4.3         | 0.15 | S0-16          |
| S0-18 | `README.md` (one-command run, ports, port-conflict guidance, Supabase-CLI-vs-compose explanation), `SECURITY.md`, `LICENSE`, PR template, story + bug issue templates, `dependabot.yml`                                              | Bootstrap §3.2         | 0.5  | ⛔ A-03        |
| S0-19 | `CLAUDE.md` — standing rules from bootstrap §1, stack from §2, workflow from §4, and the **Open scope questions** list seeded from `docs/PLAN-M1.md` §1.4                                                                            | Bootstrap §1, §3.2     | 0.25 | —              |
| S0-20 | ADRs 0001–0011 per `docs/PLAN-M1.md` §3 (0012 once A-04 lands)                                                                                                                                                                       | Bootstrap §3.2         | 0.5  | —              |
| S0-21 | Move `PRD.md` → `docs/`, `docs/PLAN-M1.md` → `docs/PLAN-M1.md`, `TASKS.md` → `docs/TASKS-M1.md`; link all from README                                                                                                                | Bootstrap §3.2         | 0.1  | S0-18          |
| S0-22 | `gh repo create krishallmagage/washbook --private --source=. --remote=origin --push`; `main` as default; **attempt branch protection and report the result honestly** — if the API rejects it on this plan, say so and rely on S0-07 | Bootstrap §3.1         | 0.25 | ⛔ A-01, A-02  |
| S0-23 | Milestones `M1 — Pilot`, `M2 — Launch`, `M3 — Expansion`; labels `epic:intake` … `epic:platform`, `type:bug`, `type:chore`, `type:docs`, `security`                                                                                  | Bootstrap §3.1.6       | 0.25 | S0-22          |
| S0-24 | One GitHub issue per **M1** user story (28 of them), titled `US-x.y — Name`, body carrying the story statement and its acceptance criteria verbatim, labelled by epic, assigned to M1. **No M2/M3 issues**                           | Bootstrap §3.1.7       | 0.5  | S0-23          |

---

## Slice 1 — Tenancy, auth and roles `feat/e10-auth-tenancy` · **6d**

**Exit:** an Owner signs in, a Supervisor signs in by PIN on an enrolled device, and pgTAP proves site A cannot touch site B's rows. This is the foundation `docs/PLAN-M1.md` §6 calls the riskiest thing in the build — it is deliberately first.

| ID    | Task                                                                                                                                                     | Refs                   | Est  | Deps  |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ---- | ----- |
| S1-01 | Migration: `sites` (typed threshold columns, not JSON), `app_users`, `devices` (G-1, `UNIQUE(site_id, short_code)`), `site_role` enum                    | §11.2, G-1             | 0.5  | S0-16 |
| S1-02 | ★ `auth_site_id()`, `auth_role()`, `fn_has_permission(action)` encoding the full §13.1 matrix in one place                                               | §13.1, US-10.1 AC2     | 0.75 | S1-01 |
| S1-03 | RLS policies on all three tables; `ENABLE` **and** `FORCE ROW LEVEL SECURITY`; deny-by-default, explicit per-operation policies                          | §4.4                   | 0.5  | S1-02 |
| S1-04 | ★ **pgTAP RLS harness**: generated four-test suite (SELECT/INSERT/UPDATE/DELETE cross-site) per table, plus a CI check that fails if any table lacks one | Bootstrap §1.2         | 1.0  | S1-03 |
| S1-05 | Supabase Auth for Owner/Manager via `@supabase/ssr`; base-path-aware middleware and callback routes                                                      | US-10.1                | 0.5  | S1-03 |
| S1-06 | ★ **PIN → minted scoped JWT** (`site_id`, `role`, `user_id`, short TTL); 4–6 digits; rate-limited; hashed at rest; 30-minute idle expiry                 | US-10.3 AC1–2          | 1.0  | S1-05 |
| S1-07 | Device enrolment requiring an Owner/Manager credential; `short_code` assignment                                                                          | US-10.3 AC3, G-1       | 0.5  | S1-06 |
| S1-08 | Server-side role guards + unit tests covering every cell of §13.1, including the Supervisor-override per-site setting                                    | US-10.1 AC2–3          | 0.5  | S1-02 |
| S1-09 | ★ Build-time assertion that the service-role key appears in no client bundle and no PIN-reachable code path. Fails CI                                    | Bootstrap §7           | 0.25 | S1-06 |
| S1-10 | Sign-in and PIN screens with loading, empty, error and offline states; 44px targets from the start                                                       | NFR-12, Bootstrap §6.6 | 0.5  | S1-06 |

---

## Slice 2 — Catalogue and price grid `feat/e2-pricing` · **4.75d** (3.25 under `[L1]`)

**Exit:** the owner edits his own price grid, saves a new version, and yesterday's tickets keep yesterday's prices.

| ID    | Task                                                                                                                    | Refs              | Est  | Deps  |
| ----- | ----------------------------------------------------------------------------------------------------------------------- | ----------------- | ---- | ----- |
| S2-01 | Migration: `vehicle_classes`, `services`, `price_lists`, `price_list_items` (`price_cents`, `is_offered`) + RLS + pgTAP | §11.2             | 0.75 | S1-04 |
| S2-02 | BR-10 trigger: a price list is immutable once `effective_from` has passed; new prices create a new version              | BR-10, US-2.1 AC3 | 0.25 | S2-01 |
| S2-03 | `src/domain/pricing.ts` — resolution, "not offered" handling, running total. Unit tests named `US-1.3-AC1/2/3`          | US-1.3, BR-02     | 0.5  | S2-01 |
| S2-04 | Price grid editor: services × classes, empty cell means not offered                                                     | US-2.1 AC1–2      | 0.75 | S2-03 |
| S2-05 | Versioned save with effective date + audit entry                                                                        | US-2.1 AC3–4      | 0.5  | S2-02 |
| S2-06 | Vehicle class management: seven defaults, rename, reorder, add, deactivate-never-delete                                 | US-2.2, BR-15     | 0.5  | S2-01 |
| S2-07 | `[L1]` Setup wizard: site details → classes → services → grid → bays → staff → roles, progress saved and resumable      | US-10.4           | 1.5  | S2-06 |

---

## Slice 3 — Offline foundation `feat/e11-offline-core` · **6.25d**

**Exit:** two browser contexts, both offline, create five tickets each; both reconnect; ten tickets land in order with no number collisions — and that runs in CI from this point on.

| ID    | Task                                                                                                                                               | Refs                    | Est  | Deps           |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---- | -------------- |
| S3-01 | `src/offline/db.ts` — Dexie schema with versioned upgrade paths (a schema migration on a phone with unsynced data must not lose it)                | NFR-02                  | 0.5  | S0-16          |
| S3-02 | `src/offline/outbox.ts` — append-only mutation intents, discriminated union, Zod-validated on write and on replay                                  | Bootstrap §2            | 0.75 | S3-01          |
| S3-03 | ★ `src/offline/sync.ts` — drain, ordering by device sequence, retry with backoff, idempotency keys, 60s target after reconnect                     | US-11.1 AC2, NFR-03     | 1.25 | S3-02, ⛔ A-13 |
| S3-04 | ★ `src/offline/ticket-number.ts` — device-prefixed issuance + unit tests proving cross-device uniqueness                                           | B-1, BR-13, US-11.1 AC4 | 0.5  | ⛔ A-05        |
| S3-05 | ★ `POST /washbook/api/sync` — **re-evaluates every §12 guard against current server state**, rejects and audits losers rather than last-write-wins | C-4, US-11.2 AC1–2      | 1.0  | S3-03          |
| S3-06 | Serwist service worker, manifest, install prompt, cache strategy — all base-path-correct                                                           | US-11.4 AC3             | 0.75 | S0-14          |
| S3-07 | Online/offline indicator with unsynced count, visible on every screen                                                                              | US-11.1 AC3             | 0.25 | S3-03          |
| S3-08 | Conflict surfacing: a rejected transition reaches a Manager for review                                                                             | US-11.2 AC2             | 0.5  | S3-05          |
| S3-09 | ★ E2E: two offline contexts, five tickets each, reconnect, assert count, order and uniqueness                                                      | §24, US-11.1            | 0.75 | S3-05          |

---

## Slice 4 — ★ INTAKE `feat/e1-vehicle-intake` · **6.5d**

**The make-or-break screen.** Everything before this exists to make this screen correct; everything after it is downstream. Nothing proceeds past this slice until the field test passes.

| ID    | Task                                                                                                                                                                               | Refs                   | Est  | Deps         |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ---- | ------------ |
| S4-01 | Migration: `customers`, `vehicles` (`plate_normalised` GENERATED + `UNIQUE(site_id, plate_normalised)`), `vehicle_owner_changes` (G-4), `tickets`, `ticket_services` + RLS + pgTAP | §11.2, G-4, BR-11      | 1.0  | S2-01        |
| S4-02 | `src/domain/plate.ts` — BR-11 normalisation, tests covering `CAB 1234` / `cab-1234` / `CAB1234`                                                                                    | BR-11, US-1.2 AC4      | 0.25 | —            |
| S4-03 | `src/domain/money.ts` — integer cents, exact split, rounding. The foundation every money figure sits on                                                                            | §1.4.1                 | 0.5  | —            |
| S4-04 | `fn_ticket_transition()` with the `DRAFT → QUEUED` guard (plate-or-no-plate, class, ≥1 service, photo if required); direct `UPDATE` on `tickets.state` revoked                     | §12, §4.2              | 0.5  | S4-01        |
| S4-05 | Intake screen: layout for one thumb, 44px targets, all strings externalised for Sinhala from day one                                                                               | US-1.1, NFR-12         | 0.75 | S4-04        |
| S4-06 | Returning-vehicle recall: debounced plate lookup showing name, class, last visit, last services; one-tap **Repeat last**                                                           | US-1.2 AC1–2           | 0.75 | S4-02, S4-05 |
| S4-07 | Price resolution wired to class + service selection; running total                                                                                                                 | US-1.3                 | 0.25 | S2-03, S4-05 |
| S4-08 | Override: reason from a configured list or typed, role-gated, stores list/final/variance/user/reason/timestamp, threshold breach flagged                                           | US-1.4 AC1–4, BR-02/03 | 0.75 | ⛔ A-10      |
| S4-09 | Mobile capture, focused by default for a new vehicle, normalised to `+947XXXXXXXX`                                                                                                 | US-1.6 AC1–2           | 0.25 | S4-05        |
| S4-10 | ★ Local-first save: acknowledged in <300ms, screen reset to blank in <1s                                                                                                           | US-1.1 AC1–2, NFR-01   | 0.5  | S3-02, S4-05 |
| S4-11 | Partial-entry restore within 10 minutes, held in IndexedDB only — no phantom server rows                                                                                           | US-1.1 AC3, §1.4.4     | 0.25 | S4-10        |
| S4-12 | ★ Intake timing instrumentation — `tickets.intake_duration_ms`, screen-open to save. Without it AC4 and the pilot exit criterion are unmeasurable                                  | G-8, US-1.1 AC4, §4.4  | 0.25 | S4-10        |
| S4-13 | E2E: full intake, online and offline, including override rejection with no reason                                                                                                  | US-1.1–1.6             | 0.5  | S4-12        |

---

## ★ GATE — Field test at the pilot site · **1d**

**Do not start Slice 5 until this passes.** R-02 is rated Fatal and §19 says the same thing.

| ID    | Task                                                                                                                                | Refs            | Est  |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------- | ---- |
| FT-01 | Run PRD §22's observation protocol: count vehicles for an hour, time the gate interaction, note every spoken price, follow the cash | PRD §22         | 0.5  |
| FT-02 | Time **ten consecutive intakes** on the supervisor's actual handset, using the real price grid                                      | US-1.1 AC4, §24 | 0.25 |
| FT-03 | Ask P2 Sanjeewa §22's four supervisor questions, especially the last one                                                            | R-01            | 0.1  |
| FT-04 | Write up: median time, capture-rate observation, and a go / redesign call on the intake screen                                      | R-02, §4.4      | 0.15 |

**Gate condition:** median ≤ 20 seconds. If not, Slice 4 is redesigned before anything else is built. That is the whole point of putting the gate here rather than at the end.

---

## Slice 5 — Intake photographs `feat/e1-intake-photos` · **3.5d**

| ID    | Task                                                                                                                                                          | Refs              | Est  |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ---- |
| S5-01 | Migration: `ticket_photos`, `tickets.is_disputed` (G-3); Storage bucket with `{site_id}/{ticket_id}/` path policy + pgTAP proving cross-site signed URLs fail | US-1.5, G-3, §4.4 | 0.5  |
| S5-02 | Capture UI, up to six photographs per ticket                                                                                                                  | US-1.5 AC1        | 0.5  |
| S5-03 | Client-side compression to 1600px on the long edge                                                                                                            | US-1.5 AC4        | 0.25 |
| S5-04 | Blob persistence in Dexie surviving an app restart with no network                                                                                            | US-1.5 AC3, §24   | 0.5  |
| S5-05 | Background upload via signed URLs, with retry; ticket saveable before upload completes                                                                        | US-1.5 AC3        | 0.75 |
| S5-06 | Stamping: date, time, ticket number, plate                                                                                                                    | US-1.5 AC2        | 0.25 |
| S5-07 | `site.photo_required` gate blocking save with zero photographs                                                                                                | US-1.5 AC5, §12   | 0.25 |
| S5-08 | E2E: six photographs, airplane mode, app restart, reconnect, all six upload                                                                                   | §24               | 0.5  |

## Slice 6 — Ticket lifecycle and staff `feat/e3-ticket-lifecycle` · **4.5d**

| ID    | Task                                                                                                                                    | Refs                        | Est  |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ---- |
| S6-01 | Migration: `staff` (`user_id` nullable, G-2), `ticket_staff`, `ticket_state_changes` + RLS + pgTAP                                      | §11.2, G-2                  | 0.75 |
| S6-02 | ★ Full §12 transition table in SQL with every guard; every transition writes `ticket_state_changes` and an audit row in one transaction | US-3.1 AC1–3, §12           | 1.0  |
| S6-03 | `src/domain/ticket-state.ts` mirroring the SQL machine; a test per legal and illegal transition, each naming its guard                  | US-3.1 AC2                  | 0.5  |
| S6-04 | Staff register: add in under a minute, deactivate preserving history                                                                    | US-8.1, BR-15               | 0.5  |
| S6-05 | Assignment with history retained; cannot reach `READY` with nobody assigned                                                             | US-3.2 AC1, AC3             | 0.5  |
| S6-06 | Washer's own-job view — claim and complete, minimum taps, Sinhala-first                                                                 | US-8.3, P3, R-01            | 0.5  |
| S6-07 | `[A-09]` Minimal read-only queue board: state, plate, elapsed time. No bays, no durations                                               | C-1, US-3.4 (partial), R-01 | 0.5  |
| S6-08 | Void: Manager/Owner only, reason required, stays visible in reports as voided                                                           | US-3.1 AC4                  | 0.25 |

## Slice 7 — Billing, payment and receipts `feat/e4-billing` · **5d** (4d under `[L1]`)

| ID    | Task                                                                                                                                      | Refs                    | Est         |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------- |
| S7-01 | Migration: `payments` with `business_day_id` (G-5) and a method enum already including `PACKAGE` and `ACCOUNT` (C-2) + RLS + pgTAP        | G-5, C-2, US-4.1 AC2    | 0.5         |
| S7-02 | ★ BR-04 immutability triggers on `tickets`, `payments`, `ticket_services` once billed; pgTAP proving **every** role fails, Owner included | BR-04, §24              | 0.5         |
| S7-03 | Billing action computing the total from prices recorded on the ticket, never re-read from the price list                                  | US-4.1 AC1, BR-10       | 0.5         |
| S7-04 | Split payment: exact-sum validation in the domain layer **and** as a database check                                                       | US-4.1 AC3, §24         | 0.5         |
| S7-05 | Connectivity requirement for billing, stated in the UI rather than silently failing                                                       | US-11.1 AC5             | 0.25        |
| S7-06 | Receipt content: site, ticket no, date/time, plate, services, unit prices, discount, total, method, staff                                 | US-4.2 AC3              | 0.5         |
| S7-07 | PDF/share receipt + `wa.me` send where a mobile number exists                                                                             | US-4.2 AC2, C-5         | 0.75        |
| S7-08 | `[L1]` ESC-POS over Web Bluetooth, 58mm and 80mm; documented iOS Safari limitation and PDF fallback                                       | US-4.2 AC1, NFR-13, C-5 | 1.0 ⛔ A-12 |
| S7-09 | E2E: bill a ticket, reject a split that doesn't sum, prove a billed ticket cannot be edited                                               | §24                     | 0.5         |

## Slice 8 — Business day and cash close `feat/e5-cash-close` · **5d**

The commercial heart of the product, and the code I least want to touch twice.

| ID    | Task                                                                                                                                                      | Refs              | Est          |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------ |
| S8-01 | Migration: `business_days` with `opening_float_cents` and `opened_by` (B-3), `cash_movements`, `tickets.carried_from_business_day_id` (G-6) + RLS + pgTAP | B-3, G-6          | 0.75 ⛔ A-07 |
| S8-02 | `src/domain/business-day.ts` — cutoff, boundary and Asia/Colombo half-hour-offset tests                                                                   | B-3, §1.4.9       | 0.5          |
| S8-03 | `src/domain/cash.ts` — expected cash including the opening float, variance                                                                                | §11.3, B-3        | 0.5          |
| S8-04 | Day open with counted float; a ticket on a day with no open day is blocked by a one-tap screen                                                            | B-3               | 0.5          |
| S8-05 | Petty cash out: amount, category, note required; optional bill photograph                                                                                 | US-5.2 AC1–2      | 0.5          |
| S8-06 | Close screen: vehicles, gross, by method, package redemptions at zero cash (C-2), petty cash, expected cash, counted, variance                            | US-5.1 AC1–2      | 0.75         |
| S8-07 | ★ BR-06 as a database `CHECK` (no role, no code path bypasses it) and `fn_close_business_day()` enforcing BR-05 + pgTAP for both                          | BR-05, BR-06, §24 | 0.5          |
| S8-08 | Open-ticket resolution at close: complete, void, or carry forward                                                                                         | US-5.1 AC5, G-6   | 0.5          |
| S8-09 | Day lock; corrections as adjustment entries referencing the closed day                                                                                    | US-5.1 AC4, BR-04 | 0.5          |

## Slice 9 — Owner summary and exception flags `feat/e5-owner-summary` · **3.5d**

| ID    | Task                                                                                                 | Refs                   | Est         |
| ----- | ---------------------------------------------------------------------------------------------------- | ---------------------- | ----------- |
| S9-01 | Summary computation covering every field in US-5.3 AC2, including tickets without a mobile number    | US-5.3 AC2, US-1.6 AC3 | 0.75        |
| S9-02 | All six exception flags with per-site typed thresholds                                               | US-5.4 AC1–2           | 0.75        |
| S9-03 | ★ Delivery channel per A-06: VAPID keys, subscription storage, scheduled send at `site.summary_time` | US-5.3 AC1, B-2        | 1.0 ⛔ A-06 |
| S9-04 | In-app summary screen + `wa.me` share action                                                         | US-5.3 AC1, §16        | 0.5         |
| S9-05 | Delivery-failure retry and in-app surfacing                                                          | US-5.3 AC3             | 0.5         |

## Slice 10 — Attendance and commission `feat/e8-staff-pay` · **4.75d** `[L2]`

Dropping this slice is Lever 2. Note that S10-06 is R-01's mitigation — cutting it removes the only thing the washers get out of the product.

| ID     | Task                                                                                                                   | Refs                          | Est          |
| ------ | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------ |
| S10-01 | Migration: `attendance`, `commission_rules` + RLS + pgTAP                                                              | §11.2                         | 0.5          |
| S10-02 | `src/domain/commission.ts` — BR-12, split rule, remainder distribution (proposed BR-17), `Σ shares = total` asserted   | BR-12, US-8.3 AC1/AC3, §1.4.2 | 0.75 ⛔ A-15 |
| S10-03 | Attendance day view: Present / Half / Absent in one tap each, markable offline                                         | US-8.2 AC1–2                  | 0.75         |
| S10-04 | Manager correction of a past day, logged                                                                               | US-8.2 AC3                    | 0.25         |
| S10-05 | Commission accrual on `→ BILLED`, reversal on `VOID`                                                                   | BR-12                         | 0.5          |
| S10-06 | Staff-facing own-jobs and accrued-commission view                                                                      | US-8.3 AC2, R-01              | 0.5          |
| S10-07 | `[L1]` Weekly wage sheet: days present, wage, jobs, commission, advances column, net payable; printable and exportable | US-8.4, C-2                   | 1.5          |

## Slice 11 — Audit log and day book `feat/e10-audit` · **3d** (2.5d under `[L1]`)

| ID     | Task                                                                                                                                                                                             | Refs               | Est  |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ | ---- |
| S11-01 | ★ Migration: `audit_entries`; `REVOKE UPDATE, DELETE` from every application role; `BEFORE UPDATE OR DELETE` trigger that raises unconditionally; `FORCE ROW LEVEL SECURITY`; insert-only policy | BR-07, US-10.2 AC3 | 0.5  |
| S11-02 | Hash chain (`prev_hash`, `row_hash`) per site + a verification query, making tampering detectable                                                                                                | §4.3               | 0.5  |
| S11-03 | Audit writes on every action in US-10.2 AC1, with before/after JSON, actor, device and timestamp                                                                                                 | US-10.2 AC1–2      | 0.75 |
| S11-04 | pgTAP proving an Owner cannot update or delete an audit row                                                                                                                                      | §24, US-10.2 AC3   | 0.25 |
| S11-05 | Audit trail screen: filter by actor, action, entity, date; CSV export                                                                                                                            | §14                | 0.5  |
| S11-06 | `[L1]` Day book report: every ticket for a day, in-app + PDF + XLSX                                                                                                                              | §14                | 0.5  |

## Slice 12 — Sinhala and the cheap phone `feat/e11-i18n-perf` · **3.75d** (3.25d under `[L1]`)

| ID     | Task                                                                                                                | Refs              | Est          |
| ------ | ------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------ |
| S12-01 | `next-intl` wiring, `[locale]` routing, language as a **per-user** preference                                       | US-11.3 AC1       | 0.5          |
| S12-02 | Extract every string; complete `en.json`; lint rule failing on hard-coded user-facing text                          | US-11.3 AC2       | 0.5          |
| S12-03 | `si.json` first pass plus a review round with your reviewer                                                         | US-11.3 AC2, R-01 | 0.75 ⛔ A-20 |
| S12-04 | Noto Sans Sinhala subset to the glyphs actually used, `font-display: swap`, measured against the performance budget | NFR-06, §1.4.11   | 0.5          |
| S12-05 | Audit every screen for 44px targets and outdoor-daylight contrast                                                   | NFR-12            | 0.5          |
| S12-06 | Measure on the pilot's actual handset over throttled 3G: FCP under 2s on a repeat visit                             | NFR-01, US-11.4   | 0.5 ⛔ A-19  |
| S12-07 | `[L1]` Translate reports (PRD says these may stay English in M1)                                                    | US-11.3 AC2       | 0.5          |

## Slice 13 — Pilot readiness `feat/pilot-readiness` · **4.25d** (3d under `[L1]`)

| ID     | Task                                                                                                                                        | Refs                | Est          |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------------ |
| S13-01 | Seed script: one demo site, realistic Sri Lankan price grid from A-21, staff, several days of tickets — the app is never empty on first run | Bootstrap §5.1      | 0.75 ⛔ A-21 |
| S13-02 | ★ **PRD §24 checklist as an executable Playwright suite** — one spec per line, twenty lines                                                 | §24                 | 1.5          |
| S13-03 | `[L1]` Full data export, XLSX and CSV, opening correctly in Excel                                                                           | NFR-08, §24         | 0.75         |
| S13-04 | `[L1]` Backup and restore drill against a test environment, with a runbook                                                                  | NFR-09, §24         | 0.5 ⛔ A-16  |
| S13-05 | Photo purge scheduled job honouring `is_disputed`, with its own test                                                                        | BR-16, Bootstrap §7 | 0.5          |
| S13-06 | Sentry browser + server, release tagging tied to the build SHA                                                                              | Bootstrap §2        | 0.25 ⛔ A-17 |

---

## Totals

| Scope                                              | Days      | Weeks full-time |
| -------------------------------------------------- | --------- | --------------- |
| Everything in this backlog (132 engineering tasks) | **70.15** | ~14             |
| Lever 1 — drop all `[L1]` (6.25d)                  | **63.9**  | ~12.8           |
| Lever 2 — also drop the rest of Slice 10 (3.25d)   | **60.65** | ~12.1           |

Against `docs/PLAN-M1.md` §5's top-down 53 / 45 / 38. **I am not going to reconcile these by adjusting one to match the other** — that would be inventing a number. Bottom-up estimates run high because listing the work reveals it; top-down estimates run low for the same reason. Both are stated so you can see the spread rather than a false precision.

What I will do instead is measure.

### Re-baselining

**After Slice 2 completes**, I will report actual days spent on S0-01 through S2-06 against the estimates above, compute the ratio, and re-forecast the remainder from real velocity. That is roughly 16 estimated days in — enough signal to be meaningful, early enough to still change the scope decision.

If the ratio is below 1.0 (faster than estimated, which is plausible with AI-assisted implementation on well-specified work), the 4-week target may come back into range and Lever 1 may be unnecessary. If it is above 1.0, you will know in week three rather than week nine, and R-09 stays manageable.

**Until that measurement exists, plan against the bottom-up numbers.** They are the ones derived from actual work items.

---

## Sequencing at a glance

```
Phase A ──► S0 Foundation ──► S1 Auth/RLS/PIN ──┬─► S2 Price grid ──┐
                                                 │                   ├─► S4 ★ INTAKE ──► ★ FIELD TEST
                                                 └─► S3 Offline ─────┘                        │
                                                                                              ▼
   S5 Photos ──► S6 Lifecycle+Staff ──► S7 Billing ──► S8 Cash close ──► S9 Owner summary
                                                                                              │
                                            S10 Attendance/Commission ◄────────────────────────┘
                                                        │
                                     S11 Audit ──► S12 Sinhala/Perf ──► S13 Pilot readiness
```

S2 and S3 are independent and could run in parallel if you ever add a second pair of hands. Everything else is a chain.

---

## Working agreement per task

One branch per slice, one commit per task (or tighter), squash-merged. Every commit typechecks, lints and passes tests — never a broken state committed "to save progress". Each PR states which user stories and acceptance criteria it covers, how to test it by hand, and what was deliberately left out. A bug gets a failing test before it gets a fix, and both are shown.

When I claim a task is done I will have run it, and I will show you the output. If I could not run something, I will say so and tell you exactly what to run.
