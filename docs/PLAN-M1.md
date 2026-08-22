# WashBook — Engineering Plan for Approval

**Status:** Draft for product-owner approval. No code written, no repository created, nothing installed.
**Date:** 22 August 2026
**Prepared by:** Lead engineer (Claude), for Krishall Magage
**Inputs:** `PRD.md` v1.0 (read in full), `00-BOOTSTRAP-PROMPT.md` (read in full)

> Destination in the repo after approval: `docs/PLAN-M1.md`.

---

## 0. Environment check (done first, because two things block Section 3 of your brief)

| Tool                  | Found             | Verdict                                    |
| --------------------- | ----------------- | ------------------------------------------ |
| Node.js               | v22.14.0          | Works. See §2.2 — I want to move you to 24 |
| pnpm                  | 11.17.0           | Fine                                       |
| Docker                | 28.0.4            | Fine                                       |
| git                   | 2.49.0.windows.1  | Fine                                       |
| **GitHub CLI (`gh`)** | **not installed** | **Blocker for your §3 setup sequence**     |

Per your own rule ("if the CLI is missing, stop and tell me exactly what to run — do not attempt to work around it"):

```powershell
winget install --id GitHub.cli -e
# restart the terminal, then:
gh auth login          # choose GitHub.com → HTTPS → login with a web browser
gh auth status         # must show your account and the repo, workflow scopes
```

`gh auth login` must be granted the `workflow` scope, otherwise pushing `.github/workflows/*` will be rejected later.

One more note on encoding: the copy of `PRD.md` that reached me through the editor had its table glyphs mangled (✔ and — rendered as `â`). **The file on disk is clean UTF-8** — I verified it and re-read §13.1 and §6.1 directly from disk. Nothing is wrong with your file; but it is a live argument for the `.gitattributes` `* text=auto eol=lf` rule you already specified, and I'd add `*.md text working-tree-encoding=UTF-8` handling to the README so this never bites us on a Windows/Docker/CI round-trip.

---

## 1. PRD read — and what is wrong with it

I have read all 24 sections. It is an unusually good PRD: the domain model, the state machine and the business rules are genuinely buildable as written, and §22 (the discovery script) is worth more than most of the rest. The list below is not a criticism of the document. It is the list of things that, if we don't settle them now, will each cost a day or more mid-build, and several of which will silently produce wrong money figures.

I've ordered them by what they cost to fix later.

### 1.1 Blockers — must be resolved before the first line of code

**B-1. Ticket numbering is specified in a way that cannot be built.**
BR-13 requires ticket numbers "unique per site per business day and never reused". US-11.1 AC4 requires that numbers "issued offline never collide across devices". Journey 10.1 prints `#0412` on a slip handed to the customer at the gate — and 412 is far past a single day's 20–80 vehicles, so the example implies a _site-lifetime_ sequence, contradicting "per business day".

You cannot have all of: (a) offline issuance, (b) a gapless per-day sequence, (c) a number that is final at the moment the slip prints. Pick two.

My recommendation: **device-prefixed, permanent, unique-but-not-gapless.** Each enrolled device gets a one-character short code; the number is `B-014` (device B, 14th ticket that device made that business day). It is unique per site per day, never reused, correct offline with zero coordination, and — critically — **never changes after sync**, so the slip in the customer's hand stays valid. Note BR-13 asks for _unique_ and _never reused_; it does not ask for gapless. The cost is that the owner cannot infer "how many vehicles today" from the highest number, which he shouldn't do anyway — the daily summary tells him.

The alternative (provisional local number replaced by a server number on sync) is worse: the printed slip goes stale, and disputes at the counter become "the paper says 412, the screen says 389".

**Decision needed from you.**

**B-2. The M1 owner daily summary cannot be delivered by the M1 messaging mechanism.**
US-5.3 is `M`/`M1` and AC1 says "at a configurable time, a summary **is delivered** by WhatsApp (or SMS fallback)". AC3 says "delivery failures are retried and surfaced in-app". §16 says M1 messaging is `wa.me` deep links — "zero cost, manual send".

A `wa.me` deep link cannot push anything. It opens WhatsApp on the _sender's_ phone with a pre-filled message that a human must tap Send on. So in M1, either (i) someone at the site taps Send at close, which makes the summary a thing the cashier controls — and the cashier is exactly the person the summary exists to check; or (ii) it isn't delivered.

This matters more than it looks. R-03 (owner buys, never opens it, churns) is rated High impact, and its stated mitigation is "push the daily summary rather than waiting for a login". §4.4 makes "owner opened the daily summary ≥80% of days" a success metric. The whole retention thesis rests on a delivery mechanism §16 doesn't provide until M2.

Options, cheapest first:

1. **Web Push to the owner's installed PWA** (VAPID, no vendor, no per-message cost). Works on Android Chrome. Works on iOS 16.4+ _only if the PWA is installed to the home screen_. Given P1 Nuwan is on mid-range Android, this covers him. ~1 day.
2. **SMS gateway in M1** rather than M2 — real per-message cost, a vendor contract, and Sinhala SMS is 70 chars per part. Reliable, boring, costs money.
3. **Accept manual send in M1** and be honest that the metric is unmeasurable until M2.

My recommendation: **(1) + (3)** — Web Push is the delivery channel, the in-app summary is the record, and a `wa.me` deep link is offered as a _share_ action so the owner can forward it. Retry and failure surfacing then mean something real (push subscription expired → shown in-app).

**Decision needed from you.**

**B-3. There is no opening cash float in the model, so expected cash is wrong.**
§11.3 defines expected cash as `Σ cash payments + Σ CashMovement IN − Σ CashMovement OUT`. A wash starts the day with change money in the box. If the box opens with Rs. 5,000 of change and the day takes Rs. 96,200, the counted cash is Rs. 101,200 and the system reports a Rs. 5,000 surplus every single day — or the cashier removes the float first and nobody records it. Journey 10.4 even features a "Rs.500 change shortfall", which is exactly the class of error a float makes unreadable.

Also missing: **who opens a business day, and when.** Only closing has a story (US-5.1). If nobody opens the day, does the first ticket auto-open it? What is the day boundary — midnight Asia/Colombo, or a configurable cutoff? A ticket created offline at 00:15 and synced at 08:00 belongs to which day? This is not pedantry; it is the difference between the cash reconciling and not.

My recommendation: add `business_days.opening_float_cents` and `opened_by`; a day is opened explicitly by a Cashier/Manager/Owner with a counted float; the first ticket of a day on which no day is open is **blocked** with a clear "Open the day first" screen (one tap for the common case). Day boundary = a per-site `day_cutoff_time`, default 04:00 local, so a late Saturday night belongs to Saturday. Offline tickets are stamped with the _local_ business date at creation, not at sync.

**Decision needed from you.**

**B-4. Where does this actually run in production?**
PRD §20 says "Vercel + Supabase managed — near-zero ops for one person". Your bootstrap §5 mandates `basePath: '/washbook'`, `output: 'standalone'`, a multi-stage Dockerfile, a `HEALTHCHECK`, and two compose files. A `/washbook` base path is the shape of a self-hosted app sitting behind a reverse proxy on a shared domain — it is not a Vercel shape.

These are not incompatible (Docker can be purely a local-dev convenience), but they lead to different work: if Vercel is production, the Dockerfile is dev-only and I won't harden it; if a VPS is production, we need a proxy config, TLS, backups, deploy scripts and an ADR, and Vercel-specific features (image optimisation defaults, ISR) must be avoided.

I will build the Docker stack you asked for either way. **Tell me which one is production**, because it changes roughly 2 days of work and one ADR.

**B-5. Type-aware linting caps our TypeScript version. See §2.1** — verified against npm, not assumed. Short version: the latest TypeScript is 7.0.2, but `typescript-eslint@8.67.0` declares `typescript: ">=4.8.4 <6.1.0"`. Installing TS 7 disables the type-aware lint layer that is pillar one of your zero-defect posture. Resolvable, but it's a version decision you need to make before install day.

### 1.2 Contradictions inside the PRD

**C-1. The mitigation for the only "Fatal" risk is scheduled in the wrong release.**
R-01 (staff sabotage adoption — Likelihood High, Impact **Fatal**) says: _"Ship the commission view **and the queue board** in the same release as intake, so staff gain something visible on day one."_ P2 (Sanjeewa, the gatekeeper) is won over by "the queue board that ends 'is my car ready?' interruptions". §19 then **explicitly excludes** "bays and queue board" from M1.

You are shipping the thing that threatens the supervisor (a record of every vehicle) without the thing that pays him for it.

My recommendation: pull a **minimal read-only queue board** into M1 — tickets grouped by state, plate, elapsed time, no bay model, no drag-and-drop, no estimated ready times. That is about half a day on top of the ticket list we're building anyway, because US-3.3 (bays) and US-2.3 (durations) are what make Epic 3 expensive, and we skip both. Full US-3.3/3.4 stays in M2. I've costed this into Slice 6.

**C-2. Four M1 "Must" stories depend on M2 features.**

- US-4.1 AC2 (M1) requires payment methods "Package redemption" and "Corporate account" — Epic 7 and US-4.4 are M2.
- US-5.1 AC1 (M1) requires the close screen to show "package redemptions at zero cash" — Epic 7 is M2. Journey 10.4 shows Rs. 10,200 of it.
- US-1.2 AC3 (M1) requires an active package and balance shown at intake — Epic 7 is M2.
- US-8.4 AC1 (M1 wage sheet) requires an "advances taken" column — US-8.5 (advances) is `S`/`M2`.

Proposed resolution, which I'll apply unless you say otherwise: build the **schema and the money arithmetic** for these paths in M1 (so a package redemption line is a real, zero-cash payment row and the close arithmetic is correct by construction), but ship **no UI** to create packages, corporate accounts or advances. The close screen shows the package line as Rs. 0 with the row present. When Epic 7 lands in M2, nothing in billing or cash close has to change. Cost: about half a day. Benefit: we never have to re-open the day-close arithmetic, which is the code I least want to touch twice.

**C-3. `Epic N` in §19 contradicts the per-story release tags.**
§19 lists "Epics 1, 2, 4 (except 4.3, 4.4), 5, 8, 10, 11" as M1. But Epic 1 contains US-1.7 (`S`/`M2`), Epic 2 contains US-2.3 and US-2.4 (`S`/`M2`), Epic 5 contains US-5.5 (`S`/`M2`), Epic 8 contains US-8.5 (`S`/`M2`).
I will treat the **per-story tags as authoritative** and the epic list as shorthand. Say so if you disagree.

**C-4. US-11.2 AC1 says "last-write-wins" for state transitions. That is unsafe on a state machine.**
Last-write-wins means a stale offline `IN_PROGRESS → READY` arriving after an online `VOID` would resurrect a voided ticket — and BR-12 then pays commission on it. AC2 already implies the correct behaviour ("the losing action is recorded in the audit log and surfaced to a Manager").

What I will actually build: transitions are applied **in the order they were performed on the device** (each carries a device clock and a monotonic sequence), and **each transition re-evaluates its §12 guard against current server state**. A transition whose guard now fails is rejected, written to the audit log, and raised to a Manager. That is not LWW; it is server-authoritative guard re-evaluation, and it is the only version that can't corrupt money. I'd like §11 amended to say that.

**C-5. Web Bluetooth printing is impossible on the device class NFR-05 requires.**
NFR-13 requires 58mm/80mm thermal printing over Web Bluetooth. NFR-05 requires iOS Safari 15+ support. **Safari does not implement Web Bluetooth on any iOS version.** So iOS users get the PDF fallback only, permanently — that's fine, but it should be stated, not discovered. Also OQ-05 ("is there an existing printer, and what size?") is unanswered and US-4.2 is an M1 Must. I am not writing ESC-POS byte sequences against a printer model I can't test on.

My recommendation: M1 ships **PDF/share receipt first** (works everywhere, always). ESC-POS is added in the same slice _only after_ you tell me the make and model at the pilot site, and I test against that unit. Otherwise it slips one slice.

**C-6. US-1.1 AC1 vs US-1.5 AC5 vs the §12 `DRAFT → QUEUED` guard.**
AC1: "a Save control is enabled and **no other field is mandatory**." AC5: "given the site has configured photographs as mandatory, then the ticket **cannot be saved** without at least one." The §12 guard adds "photo if site requires".

Readable as consistent only if AC1 is scoped to `photo_required = false`. I'll implement it that way and write the test as `US-1.1-AC1 (photo_required=false)`. Flagging because a test named after an acceptance criterion should not need a footnote.

**C-7. US-5.4 AC1 flags "tickets edited after completion" — an event BR-04 makes impossible.**
BR-04: a billed ticket is immutable, corrections are adjustments. So either the flag is dead code, or "completion" means `READY`, i.e. edits between READY and BILLED (adding a service after the quality check). I'll implement it as the latter — edits to a ticket in `READY` — unless you mean something else.

### 1.3 Gaps in the data model (§11.2)

These are entities or columns the stories require and the model doesn't have.

| #   | Missing                                     | Required by                                                                                                                                                                             | Proposed                                                                                                                                                                                                                                                                                   |
| --- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| G-1 | **`Device` entity**                         | US-10.3 AC3 (enrolment), `TicketPhoto.device_id`, `AuditEntry.device_id`, and B-1's ticket prefix                                                                                       | `devices(id, site_id, label, short_code, enrolled_by, enrolled_at, last_seen_at, is_active)`, `UNIQUE(site_id, short_code)`                                                                                                                                                                |
| G-2 | **Relationship between `User` and `Staff`** | US-8.3 AC2 ("a staff member can view **his own** commission") implies staff log in; US-8.1 says a staff record needs only name and role                                                 | `staff.user_id` nullable FK. A staff member with no user simply can't log in — commission is still attributed                                                                                                                                                                              |
| G-3 | **`Ticket.is_disputed`**                    | BR-16 (retain photos beyond 90 days if the ticket is disputed) — there is nowhere to record that                                                                                        | boolean, default false, settable by Manager/Owner                                                                                                                                                                                                                                          |
| G-4 | **Vehicle ownership history**               | US-6.1 AC2 ("one vehicle may change owner, and history is preserved **with the change recorded**")                                                                                      | `vehicle_owner_changes(vehicle_id, from_customer_id, to_customer_id, changed_by, changed_at)`. Also: `Ticket.customer_id` must be a **snapshot** of the owner at service time, never derived from `Vehicle.customer_id`, or every historic receipt silently re-attributes to the new owner |
| G-5 | **`Payment.business_day_id`**               | §11.3's expected-cash formula sums cash payments for a business day, but `Payment` only has `ticket_id`                                                                                 | Add it. A ticket carried from yesterday and billed today puts its cash in _today's_ box, which is what actually happened                                                                                                                                                                   |
| G-6 | **Ticket carry-forward**                    | US-5.1 AC5 allows an open ticket to be "explicitly carried to the next day" — no state, no flag, no field                                                                               | `tickets.carried_from_business_day_id`. The ticket re-points to the new day; the old day's "vehicles served" count keeps it (it arrived that day), the new day's cash gets the payment. This distinction must be explicit or the two numbers will disagree                                 |
| G-7 | **Ticket-level discount**                   | Journey 10.4 flags "discount of **22% on ticket** #0389". The model only supports per-line override (`TicketService.override_reason`); `Ticket.discount_total` is a sum, not a lever    | Decide: line-level only (my preference — it's auditable and the 22% is then computed), or add a ticket-level discount with its own reason. **Needs your answer**                                                                                                                           |
| G-8 | **Intake timing instrumentation**           | §4.4 makes "median time to create a ticket ≤ 20s" the measure of US-1.1 AC4, and calls intake capture rate "the single gating metric" — no story, no field, no mechanism records either | `tickets.intake_duration_ms` (screen-open to save, captured client-side). Costs minutes to add, and without it AC4 is untestable and the pilot exit criterion in §19 is unmeasurable                                                                                                       |
| G-9 | **Advance recovery**                        | US-8.5 AC2 (M2) has `advance.outstanding_balance` as a stored column with no entity recording recoveries                                                                                | M2, but noting now: derive the balance from `advances` minus `advance_recoveries`, don't store a mutable balance                                                                                                                                                                           |

### 1.4 Under-specified — I will pick a default and note it

I'll proceed on these unless you object; each is recorded in `CLAUDE.md` under "Open scope questions".

1. **Money representation.** Not specified anywhere. Floating-point money is the single most common source of "the day doesn't balance by one rupee". I will use **integer cents** in every column (`*_cents integer`) and in all TypeScript, formatted to LKR only at the display edge. US-4.1 AC3 (split must sum _exactly_) then becomes trivially exact.
2. **Commission rounding.** US-8.3 AC3 splits a ticket across staff. Rs. 1,000 across three people is not divisible. Rule I'll use: split in cents, distribute the remainder to the earliest-assigned staff, and assert `Σ shares = ticket commission` in a test. Needs to be a business rule, so I'd add it as **BR-17**.
3. **`US-1.4 AC4` "override beyond a configured percentage"** — percentage of the line, or of the ticket total? I'll use **ticket total**, since that's what the owner sees in journey 10.4.
4. **`US-1.1 AC3` partial-entry restore (10 minutes).** Is a partial entry a `DRAFT` row on the server? If so it consumes a ticket number (BR-13 "never reused") and appears in counts. I'll keep partial entries **local-only in IndexedDB**; `DRAFT` becomes a client-side state and a ticket number is issued at `QUEUED`. Clean, and no phantom tickets in reports.
5. **Which transitions can a `Staff` role make?** §13.1 grants Staff "change own job state" but §12 doesn't say which transitions that is. I'll allow **`IN_PROGRESS → FINISHING`** only, on tickets they are assigned to. `READY` stays with Supervisor+ because it is the quality gate (and in M3 it fires the customer notification).
6. **Can a Cashier see the close figures?** §13.1 gives Cashier "Close day ✔" but "View reports ✘". The close screen _is_ a report. I'll treat the close screen as an operational screen, not a report, and grant it with Close-day permission.
7. **Vehicles are per-site.** `plate_normalised` is unique _per site_, which is correct for tenancy — but it means the same car at two sites is two rows, and M3's "multi-site consolidated view" will double-count vehicles and lifetime value. Correct decision, known consequence, worth an ADR now.
8. **Denormalised vehicle stats** (`visit_count`, `lifetime_value`, `avg_interval_days`) will drift if maintained by application code. I'll maintain them by **database trigger on ticket → BILLED**, with a pgTAP test proving they match a recomputation.
9. **Timezone.** All timestamps `timestamptz`; all business-day logic in `site.timezone` (Asia/Colombo, UTC+5:30 — a half-hour offset, which breaks naive date maths). Non-negotiable and tested.
10. **Sinhala copy has no author.** US-11.3 is an M1 Must. I can produce a first pass, but a washer reading machine-translated Sinhala on a gate screen is exactly the failure R-01 predicts. **Who reviews the Sinhala?** (See §7.)
11. **Sinhala font weight vs NFR-01.** NFR-06 requires verified Sinhala rendering on low-end Android; NFR-01 requires interactive in 2s over 3G. Bundling Noto Sans Sinhala is heavy. Plan: subset the font to the glyphs our strings actually use, `font-display: swap`, and measure against the perf budget. If it doesn't fit, we rely on the device font and verify on the actual pilot handset — which is why I need to know what handset that is.

### 1.5 One thing I think is wrong, not just unclear

**The 4-week M1 estimate in §19 and §1 is not achievable at the quality bar in your bootstrap.** My slice-by-slice estimate in §5 is **53 engineer-days** — roughly 10–11 weeks solo full-time, and R-09 already notes you are part-time.

That gap is not padding. It is: RLS policies with pgTAP proof on every table, an offline outbox with real conflict tests, a Playwright suite that actually goes offline, two languages, a PWA, thermal printing, and the §24 checklist as executable E2E. The PRD's 3–4 week figure is a reasonable estimate for _the features_; it is not an estimate for the features **plus** the verification regime your bootstrap mandates — and the verification regime is the whole reason you'd get a low-defect product.

There are three levers, and this is your call, not mine. Be warned that trimming does not get you anywhere near four weeks — the arithmetic below is honest about that.

**Lever 1 — trim the soft edges. 53 → 45 days.**

| Cut                                                                                                                     | Saves |
| ----------------------------------------------------------------------------------------------------------------------- | ----- |
| Thermal ESC-POS printing; PDF/share receipt only (C-5)                                                                  | −1    |
| Setup wizard US-10.4 — for _one_ pilot site you do setup by hand, and I build the wizard when site two arrives          | −1.5  |
| Weekly wage sheet US-8.4 — keep attendance and the staff-facing commission view, which are the R-01 mitigation          | −1.5  |
| Day book report; keep the audit log itself                                                                              | −0.5  |
| Full data export and the backup-restore drill, moved to before the first _paying_ customer rather than before the pilot | −1    |
| Sinhala on operational screens only — already the PRD's own position in US-11.3 AC2                                     | −0.5  |
| Period reporting beyond the daily summary                                                                               | −2    |

Nothing there touches intake, cash close, photographs, or staff visibility.

**Lever 2 — cut Must features. 45 → ~38 days.** The floor for something defensible at a pilot is Slices 0–9 plus a minimal Sinhala pass and the §24 E2E suite: ticket at the gate → worked → billed → day closed → summary on the owner's phone, offline-tolerant. That means dropping attendance and commission from M1 entirely — which I'd argue against, because it is R-01's mitigation, but it is the only remaining lever that is worth days rather than hours.

**38 days is about 7.5 weeks full-time. That is the floor.** Four weeks is not reachable from here with the verification regime in your §1.2.

**Lever 3 — lower the quality bar.** RLS tested on the money tables only, E2E on the §24 checklist only, no pgTAP on catalogue tables. Worth roughly 6–8 days. I'll do it if you say so, but I want it in an ADR with your name on it, because it directly contradicts §1.2 of your brief and it is the lever most likely to be regretted.

**My recommendation: Lever 1 only — 45 days, bar intact.** A narrow product that is right beats a broad one that loses the owner's trust in week two, which is what R-09's own mitigation says. If the calendar genuinely cannot hold 45 days, take Lever 2 before Lever 3: shipping fewer features well is recoverable, shipping cash software you haven't proved is not.

---

## 2. The stack — where I agree, and the three places I don't

I agree with essentially all of §2 of your brief, and I want to say why briefly, because it isn't flattery: Postgres RLS as the tenancy boundary (§20) and SQL migrations with no ORM schema layer are the two decisions that will do the most to keep this product correct, and they are the two most people get wrong. The explicit hand-rolled outbox over a sync framework is the right call for the same reason. No argument from me on Next.js, Tailwind v4, shadcn/ui, Zod-at-every-boundary, TanStack Query, Vitest, Playwright, pgTAP, or release-please.

Three disagreements, argued once.

### 2.1 TypeScript: not 5.x, and definitely not the latest — pin **6.0.3**

Your brief says TypeScript 5.x. It also says "do not assume the versions in your training data are current — check the latest stable release". I checked. Both instructions can't be followed at once, so here's the evidence:

```
typescript                    dist-tags.latest = 7.0.2   (stable versions: 5.9.3, 6.0.3, 7.0.2)
typescript-eslint@8.67.0      peerDependencies.typescript = ">=4.8.4 <6.1.0"
typescript-eslint             dist-tags.latest = 8.67.0   (no v9/v10 exists)
```

TypeScript 7 is out and stable, but **no released version of `typescript-eslint` supports it**. Installing TS 7 means no `strict-type-checked` rules, no `no-explicit-any` enforcement with type information, no `no-floating-promises`, no `no-misused-promises`. That is pillar one of your zero-defect posture, traded for a compiler version. Not worth it.

The highest version the linter accepts is **6.0.3**, so that's my pin. TS 6.0 is the transitional release — same compiler as 5.9 plus deprecation warnings for what 7 removes — so it costs us nothing now and shortens the eventual jump to 7. Fallback is 5.9.3 if the Next 16 / TS 6 combination misbehaves, which is a **day-1 spike** in Slice 0 (30 minutes: install, `next build`, `tsc --noEmit`, run the lint config).

Revisit when `typescript-eslint` ships TS 7 support. I'll open a tracking issue.

### 2.2 Node: **24**, not 22

Verified against `nodejs/Release/schedule.json`:

| Version | Active LTS from | Maintenance from | End of life    |
| ------- | --------------- | ---------------- | -------------- |
| 22      | 2024-10-29      | **2025-10-21**   | 2027-04-30     |
| 24      | 2025-10-28      | 2026-10-20       | **2028-04-30** |

As of today, Node 22 has been in maintenance for ten months and dies in April 2027 — inside the window where this product will be running at paying sites. Node 24 is the current Active LTS. Pinning 22 buys nothing and schedules a forced runtime migration during M2/M3.

`next@16.3.2` declares `engines.node >= 20.9.0` and `vitest@4.1.11` accepts `^20 || ^22 || >=24`, so both are happy either way.

You'd need to install it (you're on 22.14.0): `winget install OpenJS.NodeJS.LTS` or `nvm install 24 && nvm use 24`. `.nvmrc` and `engines` get `24`, and CI matches.

### 2.3 XLSX: **not the `xlsx` package from npm**

Your brief and PRD §20 both specify SheetJS. SheetJS left npm in 2023; the `xlsx` package on the public registry is frozen at **0.18.5** and carries unpatched prototype-pollution and ReDoS advisories. The maintained SheetJS is distributed from their own CDN, which means a non-npm registry entry in the lockfile — awkward with `--frozen-lockfile` in CI and with Dependabot.

Recommendation: **`exceljs@4.4.0`** for XLSX, generated **server-side only** (it's heavy for a browser bundle, and every export in §14 is a server-rendered report anyway). CSV exports get a 20-line writer with proper quoting — no dependency. Same output, maintained, clean lockfile.

If you'd rather have SheetJS Pro, that's a purchase decision and I'll wire it instead.

### 2.4 Additions the brief's table doesn't cover but M1 requires

| Need                               | Story            | Package                                    |
| ---------------------------------- | ---------------- | ------------------------------------------ |
| i18n (Sinhala/English per user)    | US-11.3 `M`/`M1` | `next-intl@4.13.7` (peer-supports Next 16) |
| Sri Lankan mobile → `+947XXXXXXXX` | US-1.6 AC2       | `libphonenumber-js@1.13.11`                |
| Photo compression to 1600px        | US-1.5 AC4       | `browser-image-compression@2.0.2`          |
| Web Push for the daily summary     | US-5.3 (see B-2) | `web-push` — version checked at install    |
| Seed data                          | Bootstrap §5.1   | `@faker-js/faker@10.6.0` (devDependency)   |

### 2.5 Proposed pins — all verified against the live npm registry today

Exact versions, no `^`, no `~`, as you specified.

**Runtime**

| Package                    | Version |     | Package                     | Version |
| -------------------------- | ------- | --- | --------------------------- | ------- |
| `next`                     | 16.3.2  |     | `@supabase/supabase-js`     | 2.112.3 |
| `react`                    | 19.2.8  |     | `@supabase/ssr`             | 0.12.4  |
| `react-dom`                | 19.2.8  |     | `dexie`                     | 4.4.5   |
| `typescript`               | 6.0.3   |     | `serwist`                   | 9.5.12  |
| `tailwindcss`              | 4.3.3   |     | `@serwist/next`             | 9.5.12  |
| `zod`                      | 4.4.3   |     | `next-intl`                 | 4.13.7  |
| `react-hook-form`          | 7.86.0  |     | `libphonenumber-js`         | 1.13.11 |
| `@hookform/resolvers`      | 5.9.1   |     | `browser-image-compression` | 2.0.2   |
| `@tanstack/react-query`    | 5.101.4 |     | `exceljs`                   | 4.4.0   |
| `class-variance-authority` | 0.7.1   |     | `date-fns`                  | 4.4.0   |
| `tailwind-merge`           | 3.6.0   |     | `@sentry/nextjs`            | 10.70.0 |
| `lucide-react`             | 1.33.0  |     | `pino`                      | 10.3.1  |

**Development**

| Package                     | Version |     | Package                                          | Version |
| --------------------------- | ------- | --- | ------------------------------------------------ | ------- |
| `vitest`                    | 4.1.11  |     | `eslint`                                         | 10.9.0  |
| `@vitejs/plugin-react`      | 6.1.0   |     | `typescript-eslint`                              | 8.67.0  |
| `@testing-library/react`    | 16.3.2  |     | `prettier`                                       | 3.9.6   |
| `@testing-library/jest-dom` | 7.0.1   |     | `knip`                                           | 6.32.2  |
| `jsdom`                     | 30.0.1  |     | `husky`                                          | 9.1.7   |
| `@playwright/test`          | 1.62.1  |     | `lint-staged`                                    | 17.3.0  |
| `msw`                       | 2.15.0  |     | `commitlint` / `@commitlint/config-conventional` | 21.2.2  |
| `supabase` (CLI)            | 2.115.0 |     | `@faker-js/faker`                                | 10.6.0  |
| `@types/node`               | 24.13.3 |     |                                                  |         |

`@types/node` is pinned to the **24.x** line to match the runtime, not to the registry's newest (26.2.0) — types ahead of the runtime describe APIs that aren't there.

`shadcn/ui` is not a dependency; components are generated into `src/components/ui` and owned by us. Radix primitive versions get pinned as the CLI adds them. Confirming the shadcn CLI is clean on Next 16 + Tailwind 4.3 is part of the Slice 0 spike.

Every version above was read from npm today. Anything not in this table gets checked the same way before it's installed, and none of it goes in without appearing in a PR you approve.

---

## 3. Repository structure

```
washbook/
├─ .github/
│  ├─ workflows/
│  │  ├─ ci.yml                     # typecheck → lint → knip → unit → db(pgTAP) → build → e2e
│  │  ├─ release-please.yml
│  │  └─ photo-purge.yml            # scheduled; BR-16 retention job (tested, per your §7)
│  ├─ ISSUE_TEMPLATE/{story.yml,bug.yml}
│  ├─ pull_request_template.md
│  └─ dependabot.yml                # weekly, grouped minors
├─ .husky/
│  ├─ pre-commit                    # lint-staged
│  ├─ commit-msg                    # commitlint
│  └─ pre-push                      # refuse pushes targeting main (fallback for §3.1 step 5)
├─ docs/
│  ├─ PRD.md                        # moved here, linked from README
│  ├─ PLAN-M1.md                    # this document
│  ├─ adr/
│  │  ├─ 0001-record-architecture-decisions.md
│  │  ├─ 0002-supabase-over-self-managed-stack.md
│  │  ├─ 0003-sql-migrations-over-orm-schema.md
│  │  ├─ 0004-hand-rolled-offline-outbox.md
│  │  ├─ 0005-pwa-over-native.md
│  │  ├─ 0006-postgres-rls-as-tenancy-boundary.md
│  │  ├─ 0007-device-prefixed-ticket-numbers.md          # B-1
│  │  ├─ 0008-pin-sessions-as-minted-supabase-jwts.md    # the §6 risk
│  │  ├─ 0009-money-as-integer-cents.md
│  │  ├─ 0010-state-transitions-via-database-function.md
│  │  ├─ 0011-vehicles-are-per-site.md                   # §1.4.7 consequence
│  │  └─ 0012-production-target.md                       # written once you answer B-4
│  └─ runbooks/
│     ├─ local-development.md       # ports, Supabase CLI vs compose, clean reset
│     ├─ backup-restore-drill.md    # NFR-09 / §24
│     └─ pilot-field-test.md        # the Saturday protocol, §22 + timing capture
├─ supabase/
│  ├─ config.toml
│  ├─ migrations/                   # NNNN_description.sql — append-only, never rewritten
│  ├─ seed/                         # demo site, SL price grid, staff, 5 days of tickets
│  └─ tests/                        # pgTAP: one file per table for RLS + one per BR-xx
│     ├─ rls/{sites,tickets,payments,audit_entries,...}.sql
│     └─ rules/{br-04-billed-immutable,br-06-variance-note,br-07-audit-append-only,...}.sql
├─ src/
│  ├─ app/
│  │  ├─ [locale]/
│  │  │  ├─ (auth)/{sign-in,pin}/
│  │  │  └─ (app)/{intake,tickets,queue,billing,day,staff,reports,settings,setup}/
│  │  └─ api/
│  │     ├─ health/route.ts         # status + db connectivity + build SHA
│  │     └─ sync/route.ts           # outbox drain endpoint
│  ├─ domain/                       # ← PURE. No React, no Supabase, no fetch, no Date.now
│  │  ├─ money.ts                   # cents, split, rounding (BR-17)
│  │  ├─ plate.ts                   # BR-11 normalisation
│  │  ├─ pricing.ts                 # US-1.3 resolution, US-1.4 override, BR-02/03/10
│  │  ├─ ticket-state.ts            # §12 machine + guards, mirrored in SQL
│  │  ├─ commission.ts              # BR-12, US-8.3
│  │  ├─ cash.ts                    # §11.3 expected cash, float, variance, BR-06
│  │  └─ business-day.ts            # cutoff, boundary, carry-forward
│  ├─ server/
│  │  ├─ actions/                   # server actions; Zod in, Result out
│  │  ├─ auth/                      # session, PIN → minted JWT, role guards
│  │  └─ repositories/              # the only place a Supabase client is constructed
│  ├─ offline/
│  │  ├─ db.ts                      # Dexie schema + versioned upgrades
│  │  ├─ outbox.ts                  # append-only mutation intents
│  │  ├─ sync.ts                    # drain, ordering, retry, backoff, conflict surfacing
│  │  └─ ticket-number.ts           # device-prefixed issuance (B-1)
│  ├─ components/{ui,intake,ticket,cash,staff,shared}/
│  ├─ lib/{env.ts,supabase/,i18n/,format/,telemetry/}
│  └─ types/database.ts             # generated, committed, `pnpm db:types`
├─ messages/{en.json,si.json}
├─ e2e/
│  ├─ specs/                        # one spec per §24 checklist line
│  └─ fixtures/                     # offline, multi-device, PWA-install contexts
├─ public/{manifest.webmanifest,icons/,fonts/}
├─ Dockerfile                       # deps → build → runner, non-root, HEALTHCHECK
├─ docker-compose.yml               # production-like
├─ docker-compose.dev.yml           # bind mount, node_modules in-container, polling watch
├─ next.config.ts                   # basePath '/washbook', standalone, root redirect basePath:false
├─ CLAUDE.md  README.md  SECURITY.md  LICENSE
└─ .gitattributes .gitignore .env.example .nvmrc .editorconfig .prettierrc
   eslint.config.mjs commitlint.config.js vitest.config.ts playwright.config.ts
```

**The one structural decision worth defending:** `src/domain` imports nothing. No React, no Supabase, no `fetch`, no ambient clock. Every business rule in PRD §13 is a pure function tested in milliseconds, and the SQL constraint in §4 is its mirror. This is what makes "every business rule gets a unit test named after it" cheap enough that we'll actually keep doing it in week six.

---

## 4. Database schema plan

Principles, in priority order:

1. **Deny by default.** RLS enabled _and_ `FORCE`d on every table. No policy means no access. There is no window in which a table exists unprotected — the migration that creates a table creates its policies.
2. **Every table carries `site_id`**, denormalised onto child tables (maintained by trigger, never by application code) so every policy is one indexed comparison rather than a join.
3. **State changes go through functions, not `UPDATE`s.** `UPDATE` on `tickets.state` is revoked from every application role. The only path is `fn_ticket_transition()`, which re-evaluates the §12 guard, writes `ticket_state_changes`, and writes the audit entry in one transaction. This is the single highest-value correctness decision in the schema.
4. **Money is `integer` cents** (`*_cents`), `CHECK (>= 0)` where a negative is meaningless.
5. **Nothing is deleted.** `DELETE` is not granted on any business table (BR-15). Deactivation is a flag.

### 4.1 Tables

| Group                         | Tables                                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Tenancy & identity            | `sites`, `app_users`, `devices`, `staff`                                                                                             |
| Catalogue                     | `vehicle_classes`, `services`, `price_lists`, `price_list_items`, `commission_rules`                                                 |
| Customers                     | `customers`, `vehicles`, `vehicle_owner_changes` **(G-4)**                                                                           |
| Operations                    | `business_days`, `tickets`, `ticket_services`, `ticket_staff`, `ticket_photos`, `ticket_state_changes`, `payments`, `cash_movements` |
| Staff ops                     | `attendance`                                                                                                                         |
| Audit                         | `audit_entries`                                                                                                                      |
| M2 schema, no M1 UI **(C-2)** | `packages`, `customer_packages`, `package_redemptions`                                                                               |

`payments.method` includes `PACKAGE` and `ACCOUNT` from day one so the cash arithmetic and the close screen never need reworking when Epic 7 lands.

### 4.2 Constraints and triggers, mapped to PRD §13

| Rule          | How the **database** enforces it                                                                                                                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BR-01         | `tickets.state` cannot begin at `IN_PROGRESS`; `fn_ticket_transition` is the only writer                                                                                                                                                   |
| BR-02 / BR-03 | `ticket_services CHECK (final_price_cents = list_price_cents OR (override_reason IS NOT NULL AND overridden_by IS NOT NULL))`; `discount_cents` is a `GENERATED` column, never supplied by the client                                      |
| BR-04         | `BEFORE UPDATE` trigger on `tickets` raising if `OLD.state IN ('BILLED','CLOSED')` and any non-whitelisted column changed. `payments` and `ticket_services` get the same guard keyed to the parent's state                                 |
| BR-05         | `fn_close_business_day()` raises if any ticket on that day is in a pre-`BILLED` state and is not voided or carried forward                                                                                                                 |
| BR-06         | `business_days CHECK (variance_cents = 0 OR btrim(coalesce(variance_note,'')) <> '')` — a database check, so no role and no code path can bypass it                                                                                        |
| BR-07         | See §4.3 — this one needs its own explanation                                                                                                                                                                                              |
| BR-08         | `customer_packages CHECK (balance_qty >= 0 AND balance_value_cents >= 0)` (M2)                                                                                                                                                             |
| BR-09         | Send path is a function that raises on `customers.marketing_opt_out` (M2)                                                                                                                                                                  |
| BR-10         | `price_lists` are immutable after `effective_from` (trigger); tickets copy resolved prices onto `ticket_services` at creation and never re-read the list                                                                                   |
| BR-11         | `vehicles.plate_normalised GENERATED ALWAYS AS (upper(regexp_replace(plate_display,'[^A-Za-z0-9]','','g'))) STORED`, `UNIQUE (site_id, plate_normalised)`. The database computes it, so `CAB 1234` / `cab-1234` / `CAB1234` cannot diverge |
| BR-12         | Commission rows are written only by the `→ BILLED` branch of `fn_ticket_transition`; `VOID` writes none and reverses any                                                                                                                   |
| BR-13         | `UNIQUE (site_id, business_day_id, ticket_no)`; `ticket_no` composed as `<device.short_code>-<per-device daily counter>` (B-1)                                                                                                             |
| BR-15         | No `DELETE` grant on any business table for any application role                                                                                                                                                                           |
| BR-16         | Scheduled purge honours `tickets.is_disputed` (G-3); the job has its own test, per your §7                                                                                                                                                 |
| §12           | Transition table encoded in SQL and re-evaluated server-side on every sync (C-4)                                                                                                                                                           |
| §13.1         | Permission matrix as `fn_has_permission(action)` reading the JWT role claim, referenced from every policy — one place to change, one place to test                                                                                         |

### 4.3 BR-07 (append-only audit log) — and the honest limit

You asked for `UPDATE` and `DELETE` revoked "for every role, including the owner". Here is exactly what I can and cannot guarantee.

**What I will do:** `REVOKE UPDATE, DELETE ON audit_entries FROM PUBLIC, anon, authenticated, service_role`; a `BEFORE UPDATE OR DELETE` trigger that unconditionally raises; `FORCE ROW LEVEL SECURITY` so the table owner doesn't bypass RLS; insert-only policy; §24's "verified by attempting one as Owner" becomes a pgTAP test that asserts the exception.

**What nobody can do in Postgres:** a database superuser (`postgres`, which Supabase exposes through the SQL editor and the connection string) can drop the trigger, re-grant, and delete rows. That is a property of Postgres, not a gap in our design. Any product claiming an audit log that a DB admin cannot alter is either lying or storing it somewhere else.

**So I propose one extra thing, which is cheap and closes most of the gap:** each `audit_entries` row stores `prev_hash` and `row_hash`, forming a hash chain per site. Deleting or altering a row breaks the chain, and a verification query detects it. Tamper-**evident** rather than tamper-**proof** — which is the honest and, for settling a dispute with a supervisor, entirely sufficient property. Roughly half a day.

### 4.4 RLS policy shape

Two helpers read the JWT and are the foundation everything else stands on:

```sql
auth_site_id()  -- uuid, from the JWT claim
auth_role()     -- site_role enum, from the JWT claim
```

Every policy is then `USING (site_id = auth_site_id())` plus a role predicate from `fn_has_permission()`. Storage buckets get the same treatment — photo object paths are prefixed `{site_id}/{ticket_id}/` and the Storage policy compares the first path segment to `auth_site_id()`, so a signed URL cannot be steered across sites.

**Every table gets four pgTAP tests before its feature is called done:** a user of site A cannot `SELECT`, `INSERT`, `UPDATE` or `DELETE` site B's rows. Generated from a table list, so adding a table without its RLS tests fails CI.

### 4.5 Where the PRD's model needed extending

Beyond the gaps in §1.3, three notes:

- **`Site.thresholds` as a JSON blob** — I'll make these typed columns (`threshold_cash_variance_cents`, `threshold_discount_pct`, `threshold_consumable_variance_pct`). JSON can't carry a `CHECK`, and these values gate the exception flags the owner acts on.
- **`Ticket.tax_total`** stays as `tax_total_cents DEFAULT 0` even though VAT is M3. Adding a money column to a live table later is a migration and a rounding audit; adding it now is free.
- **`Vehicle`'s derived stats** are trigger-maintained with a pgTAP test that recomputes from `tickets` and asserts equality — otherwise §14's "Customer value" report drifts and nobody notices for months.

---

## 5. M1 build sequence

Vertical slices: schema → RLS + pgTAP → server → UI → unit tests → E2E, each one demonstrable. This follows §19's build sequence with two deliberate departures, both flagged.

**Departures from §19:** (a) I've inserted the offline foundation _before_ intake rather than building intake and retrofitting offline — retrofitting an outbox is a rewrite, not a refactor; (b) I've pulled a minimal read-only queue board into Slice 6 per C-1, because the mitigation for a Fatal risk shouldn't be in the next release.

| #   | Slice                                                                                                                                                                                                                                  | PRD stories                | Days   |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ------ |
| 0   | **Foundation.** Repo, CI, hooks, Docker + compose, Supabase local, `basePath: '/washbook'` + root redirect verified in a real browser, health route, ADRs, `CLAUDE.md`. Includes the TS 6 / Next 16 / shadcn spike (§2.1)              | —                          | 3      |
| 1   | **Tenancy, auth, roles.** `sites`, `app_users`, `devices`; Supabase Auth for Owner/Manager; **PIN → minted scoped JWT**; `auth_site_id()` / `auth_role()` / `fn_has_permission()`; the pgTAP RLS harness that every later slice reuses | US-10.1, US-10.3, §13.1    | 5      |
| 2   | **Catalogue & price grid.** Vehicle classes, services, versioned price lists, the editable grid, "not offered" cells, setup wizard skeleton                                                                                            | US-2.1, US-2.2, US-10.4    | 3      |
| 3   | **Offline foundation.** Dexie schema, append-only outbox, sync engine with ordering + retry + backoff, device-prefixed ticket numbers (B-1), Serwist PWA shell, online/offline indicator with unsynced count, conflict surfacing (C-4) | US-11.1, US-11.2           | 5      |
| 4   | **★ INTAKE.** Plate normalisation + returning-vehicle recall, class→price resolution, override with reason, mobile capture + E.164, local-first save, partial-entry restore, **intake timing instrumentation (G-8)**                   | US-1.1, 1.2, 1.3, 1.4, 1.6 | 5      |
|     | **→ FIELD TEST: a real Saturday at the pilot site before Slice 5 starts.** Non-negotiable — R-02 is Fatal and §19 says the same                                                                                                        |                            | 1      |
| 5   | **Intake photographs.** Capture, compress to 1600px, persist locally, background upload to Storage with signed URLs, stamping, `photo_required` gate, Storage RLS                                                                      | US-1.5                     | 3      |
| 6   | **Ticket lifecycle & staff.** `fn_ticket_transition` + guards, assignment with history, staff register, washer's own-job view, **minimal read-only queue board (C-1)**                                                                 | US-3.1, 3.2, 8.1, 3.4(min) | 4      |
| 7   | **Billing & receipts.** Bill from `READY`, all payment methods incl. zero-cash package rows (C-2), split summing exactly, immutability (BR-04), PDF/share receipt. ESC-POS **only after** you confirm the printer (C-5)                | US-4.1, US-4.2             | 4      |
| 8   | **Business day & cash close.** Day open with float (B-3), petty cash out, close screen, expected vs counted, mandatory variance note, open-ticket resolution and carry-forward (G-6), day lock                                         | US-5.1, US-5.2             | 4      |
| 9   | **Owner summary & exception flags.** Summary computation, Web Push delivery + in-app record + `wa.me` share (B-2), thresholds, all six flags, delivery-failure surfacing                                                               | US-5.3, US-5.4             | 3      |
| 10  | **Attendance & commission.** One-tap day view, offline marking, manager correction with log, commission rules, split with rounding (BR-17), staff-facing earnings view, wage sheet                                                     | US-8.2, 8.3, 8.4           | 4      |
| 11  | **Audit log & day book.** Full coverage of US-10.2 AC1's action list, before/after capture, hash chain (§4.3), filterable trail, day book report                                                                                       | US-10.2, §14               | 2.5    |
| 12  | **Sinhala & the cheap phone.** Translation pass on all operational screens, font subsetting, per-user language, 44px targets, outdoor contrast, perf budget verified on the pilot's actual handset over throttled 3G                   | US-11.3, US-11.4, NFR-12   | 3      |
| 13  | **Pilot readiness.** Seed data, full export, backup/restore drill, and **the §24 checklist as an executable Playwright suite** — including two-device offline ticket numbering and airplane-mode replay                                | §24, NFR-08, NFR-09        | 3.5    |
|     | **Total**                                                                                                                                                                                                                              |                            | **53** |

> These are top-down slice estimates. [`TASKS-M1.md`](TASKS-M1.md) decomposes them into 132 individual work items which sum bottom-up to **70 days**. Both numbers are stated there rather than reconciled by adjusting one to fit the other; the plan is to re-baseline from measured velocity after Slice 2.

Something demonstrable exists from Slice 2 (the owner can build his own price grid on day 11), and the thing the whole product stands on is in your hands and tested at a real gate by day 22.

Under Lever 1 in §1.5 (53 → 45), every slice survives: Slice 2 loses the setup wizard, Slice 7 loses ESC-POS, Slice 10 loses the wage sheet, Slice 11 loses the day book, Slice 12 narrows to operational screens, Slice 13 defers the export and restore drill. Under Lever 2 (45 → ~38), Slice 10 goes entirely.

---

## 6. The riskiest part of the build

**Technically: the intersection of PIN sessions, RLS, and the offline outbox.** Not any one of them — the point where all three meet.

Here's why that specific point. US-10.3 requires a supervisor to sign in with a 4–6 digit PIN on a shared device. Supabase RLS derives everything from a JWT. So a PIN session must _become_ a JWT with `site_id` and `role` claims, minted server-side. The tempting shortcut — route PIN-user traffic through server actions using the service-role key and check permissions in application code — would work on day one and would demolish the single best decision in your architecture: PRD §20's "the database is the only place a tenancy mistake cannot slip through". Once one code path holds the service-role key, every future feature will reach for it.

Now add the outbox. Mutations are created offline under one identity and replayed later, possibly after that PIN session expired (US-10.3 AC2: 30-minute idle default), possibly after a shift change on a shared device. So every queued intent must carry the identity that _created_ it, sync must re-authenticate as that identity or explicitly record "replayed by X on behalf of Y", and RLS must still hold at replay time. Get this wrong and the audit log — the thing you sell — attributes a supervisor's discount to whoever happened to be holding the phone at 6pm.

And the failure mode is silent. A tenancy bug doesn't crash; it shows one site's tickets to another site's owner, once, and you find out from a customer.

**Second, and it is close:** the 20-second intake (R-02, Fatal). No amount of correct architecture survives a supervisor deciding the app is slower than shouting a price.

### Week one — how I de-risk both before writing product code

**Days 1–2: a walking skeleton that proves the hard part.** Not a prototype to throw away — the real Slice 0 and the identity core of Slice 1, built thin and proven:

1. PIN → server mints a scoped JWT (`site_id`, `role`, `user_id`, short TTL) → an RLS-protected insert succeeds.
2. The same insert with site B's JWT is **rejected by the database**, proven by pgTAP, not by reading policy code.
3. A Dexie outbox holding an intent created under identity A, replayed 40 minutes later after that session expired, lands attributed to A.
4. Two browser contexts, both offline, each create five tickets; both reconnect; **ten tickets, zero collisions, correct order** — the §24 line item, running in CI from week one.
5. No service-role key exists anywhere in the client bundle or in any code path a PIN user can reach. Asserted by a build-time check that fails CI.

If (2) or (4) doesn't hold by end of day 2, that's a design problem I bring to you immediately, not something I discover in Slice 8 with the cash close half-built.

**Days 3–4: intake, clickable, measured.** A throwaway front end over the real pricing logic — plate entry, recall, class, service, price, save. Instrumented with the timing capture from G-8.

**Day 5 (or the first Saturday): the pilot site, with a stopwatch.** Run §22's observation protocol. Time ten consecutive intakes on the actual handset the site will use. If the median is over 20 seconds, the intake screen gets redesigned before Slice 4 is written — which is far cheaper than after.

That week costs 5 days and retires the two risks that can kill this product. Everything after it is ordinary engineering.

---

## 7. What I need from you before I start

### 7.1 Blocking — I cannot start without these

1. **Install `gh` and authenticate** (commands in §0). Blocks your entire §3 setup sequence.
2. **Confirm the repository name** — `washbook`, private, under `krishallmagage`?
3. **`LICENSE`** — your brief says ask, default to a private proprietary notice. Confirm, or name one.
4. **B-4: production target.** Vercel + Supabase managed, or self-hosted Docker behind a reverse proxy at `/washbook`? Changes ~2 days and one ADR.

### 7.2 Decisions I need in the first week

| #    | Decision                                   | My recommendation                                              |
| ---- | ------------------------------------------ | -------------------------------------------------------------- |
| B-1  | Ticket numbering scheme                    | Device-prefixed, permanent, unique-not-gapless (`B-014`)       |
| B-2  | M1 daily-summary delivery                  | Web Push to the owner's installed PWA + in-app + `wa.me` share |
| B-3  | Opening float, day open, day boundary      | Explicit day open with counted float; 04:00 local cutoff       |
| B-5  | TypeScript version                         | 6.0.3 (highest `typescript-eslint` supports)                   |
| §2.2 | Node version                               | 24 (22 is in maintenance, EOL April 2027)                      |
| §2.3 | XLSX library                               | `exceljs@4.4.0` server-side, not the abandoned npm `xlsx`      |
| C-1  | Minimal queue board in M1?                 | Yes — it's the R-01 mitigation, ~0.5 day                       |
| C-5  | Receipt printing in M1                     | PDF/share first; ESC-POS after you confirm the printer         |
| G-7  | Ticket-level discount, or line-level only? | Line-level only; the ticket percentage is computed             |
| §1.5 | **Scope vs timeline vs quality bar**       | **Lever 1: trim to 45 days, quality bar intact**               |

### 7.3 PRD open questions — which ones block which slice

| OQ           | Question                                                 | Blocks                                                         |
| ------------ | -------------------------------------------------------- | -------------------------------------------------------------- |
| OQ-05        | Is there a printer at the pilot site, make and model?    | Slice 7 (US-4.2, M1 Must)                                      |
| OQ-04        | WiFi in the bay area, or mobile data only?               | Slice 3 — determines how aggressive the offline window must be |
| OQ-03        | Exact wage and commission structure at the pilot site    | Slice 10                                                       |
| OQ-01, OQ-02 | What is recorded today, by whom; how cash is handed over | Slice 8 — the close screen has to match a real handover        |
| OQ-08        | Repeat-customer proportion                               | Not M1, but it sizes the value of Slice 4's recall             |

OQ-06, OQ-07, OQ-09 are M3 / commercial and don't block me.

### 7.4 Access and accounts

- **Supabase**: do I create a cloud project now, or stay local-only until the pilot? NFR-09 (daily backup, 30-day retention) needs a paid tier — **budget decision**.
- **Sentry**: free tier is fine for a pilot. Confirm, or give me a DSN.
- **Web Push** needs no vendor — VAPID keys are self-generated. If we go the SMS route instead (B-2), you need a gateway account.
- No credentials go in the repo. `.env.example` only, per your §1.3, and CI enforces it.

### 7.5 Things only you can give me

1. **A Saturday at the pilot site**, with the owner's permission to observe and time intakes. This is the highest-value four hours in the whole project — §22 says so and I agree.
2. **The exact handset model** the supervisor will use. NFR-11.4, NFR-06 and the font-subsetting decision all resolve against a real device, not a spec sheet.
3. **A Sinhala reviewer.** I can produce a first pass; a washer reading awkward machine Sinhala at a gate is precisely the R-01 failure. Who checks it?
4. **The pilot site's actual price grid** — the real one, in rupees. It seeds the demo data and validates A-03 (price is a service × class grid), which is the assumption the entire pricing model rests on. If A-03 is wrong, we find out on day 2, not day 20.

---

## Next step

Reply with your decisions on §7.1 and §7.2 — particularly the scope-versus-timeline call in §1.5, since it determines what Slice 10 onward looks like.

On approval I'll start with Slice 0: `gh` check, repository creation, `CLAUDE.md` carrying the standing rules from your §1, the ADRs listed in §3, milestones and labels, one GitHub issue per M1 user story, and the Docker + Supabase local stack — verified by loading `http://localhost:3000/washbook` in a real browser and showing you the result, not by telling you it should work.

No code until you say go.
