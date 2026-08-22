# WashBook — first prompt for Claude in VS Code

> **Before you paste this:** create an empty folder, open it in VS Code, and put `PRD.md` in the root. Then paste everything below the line as your first message.

---

You are the lead engineer on a new product called **WashBook**. I am the product owner. I work with you in VS Code and I will be building this with you over the next several weeks.

Read `PRD.md` in the repository root in full before you respond to anything in this message. It is the complete product requirements document and it is the source of truth for scope, data model, business rules and release order. If anything I say below contradicts the PRD, tell me — do not silently pick one.

**This first turn is planning only. Do not write any application code, do not create the repository, do not install anything yet.** Your deliverable for this turn is described at the very end under "What I want back from you now".

---

## 1. Standing operating rules

These rules apply to every turn for the life of this project, not just this one. As the first task of the implementation phase you will write them into `CLAUDE.md` at the repository root so they survive across sessions, and you will keep that file current whenever a rule changes.

### 1.1 How you work

1. **Plan before you build.** For any task larger than a single file edit, state the plan, wait for my approval, then execute.
2. **Work in vertical slices.** One user story at a time, end to end — schema, server, UI, tests — not layer by layer. A slice is not done until its acceptance criteria pass.
3. **Follow the PRD's release order.** M1 only, in the build sequence given in PRD section 19. Do not build M2 or M3 features early, however easy they look.
4. **Never invent scope.** If something is needed but is not in the PRD, stop and ask. Add it to an "Open scope questions" section in `CLAUDE.md` rather than building it.
5. **Never claim something works unless you ran it.** No "this should work", no "I've implemented X" without having executed the test or the command and shown me the output. If you cannot run it, say so explicitly and tell me what to run.
6. **When a test fails, do not weaken the test.** Fix the code. If the test itself is wrong, say why before changing it.
7. **Ask rather than assume** on anything about how a Sri Lankan car wash operates. PRD section 17 lists the assumptions that are unvalidated. Flag when you are relying on one.
8. **Small commits, always green.** Every commit on a feature branch must typecheck, lint and pass tests. Never commit a broken state "to save progress".

### 1.2 Zero-defect posture

I want a zero-bug product. I understand that no team guarantees zero defects by intention — what actually gets close is making defects expensive to introduce and cheap to catch. So we do this instead of hoping:

- **Types are the first test.** TypeScript `strict` plus `noUncheckedIndexedAccess`. `any` is banned and enforced by lint. No `@ts-ignore` or `@ts-expect-error` without a comment explaining why and a linked issue.
- **The database enforces invariants, not just the app.** Anything in PRD section 13 that can be a constraint, a check, a trigger or a permission is one. Application-level validation is a second line, never the only line.
- **Every business rule in PRD section 13 gets a unit test named after it** (`BR-06 cash variance requires a note`). Every acceptance criterion in section 9 becomes a test case. The PRD's section 24 checklist becomes an executable E2E suite.
- **Row Level Security is tested, not assumed.** Every table gets pgTAP tests proving a user from site A cannot read, write or delete site B's rows.
- **Nothing merges that is not green.** CI runs typecheck, lint, unit, database tests, build and E2E on every pull request.
- **Bugs get a failing test first.** Reproduce, write the test that fails, then fix, then show both.

### 1.3 What you must never do

- Never push directly to `main`.
- Never use `git push --force` on a shared branch, and never `--force-with-lease` on `main`.
- Never use `--no-verify` to skip hooks.
- Never commit a `.env` file, a key, a token or a Supabase service-role key. `.env.example` only.
- Never delete or rewrite migration files that have already been pushed. Fix forward with a new migration.
- Never disable a lint rule or a test to make CI pass. Fix the cause or ask me.
- Never run a destructive database command against anything other than the local Docker database.

---

## 2. Technology stack — decided, not open

Use exactly this. If you believe a choice is wrong, argue it once now, in the plan, with a reason. After that it is settled.

| Layer           | Choice                                                                                                    | Why                                                                                            |
| --------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Language        | TypeScript 5.x, `strict`, `noUncheckedIndexedAccess`                                                      | Types are the cheapest defect filter we have                                                   |
| Runtime         | Node.js 22 LTS, pinned in `.nvmrc` and `package.json` `engines`                                           | Reproducible across my machine, Docker and CI                                                  |
| Package manager | pnpm via Corepack, lockfile committed, `--frozen-lockfile` in CI                                          | Deterministic installs                                                                         |
| Framework       | Next.js (latest stable), App Router, React Server Components                                              | One codebase for PWA + server; `output: 'standalone'` for a small Docker image                 |
| Styling         | Tailwind CSS v4                                                                                           | Fast, no bespoke CSS to maintain                                                               |
| Components      | shadcn/ui on Radix primitives                                                                             | Accessible by default; 44px touch targets and outdoor contrast are non-negotiable (PRD NFR-12) |
| Forms           | React Hook Form + Zod resolver                                                                            | One schema validates the form and the server action                                            |
| Validation      | Zod at every boundary — forms, server actions, route handlers, environment variables                      | No untyped data crosses a boundary                                                             |
| Server state    | TanStack Query                                                                                            | Cache, retry and offline semantics without hand-rolling them                                   |
| Local UI state  | React state; Zustand only if a real need appears                                                          | Avoid state libraries by default                                                               |
| Offline store   | Dexie (IndexedDB) with an explicit append-only outbox of mutation intents                                 | PRD section 20: sync we can reason about beats a framework whose failure modes we cannot       |
| Service worker  | Serwist                                                                                                   | Maintained App Router-compatible PWA tooling                                                   |
| Database        | PostgreSQL 16 via Supabase                                                                                | Postgres is the right database; Supabase gives Auth, Storage and RLS without us writing them   |
| Schema          | SQL migrations in `supabase/migrations`, single source of truth. No ORM schema layer                      | One place where the schema lives. RLS is first-class, not bolted on                            |
| Types from DB   | `supabase gen types typescript` committed to the repo, regenerated by a script                            | Compile-time errors when the schema changes                                                    |
| Auth            | Supabase Auth for Owner and Manager; short-lived server session issued from a PIN for shared-device roles | Matches PRD US-10.3                                                                            |
| Tenancy         | PostgreSQL Row Level Security, per `site_id`                                                              | PRD section 20: the database is the only place a tenancy mistake cannot slip through           |
| Files           | Supabase Storage, client-side compression, direct upload with signed URLs                                 | Keeps photographs off the server path                                                          |
| Reporting       | Postgres views and materialised views; XLSX via SheetJS; print CSS for PDF                                | Eleven reports do not justify a BI dependency                                                  |
| Unit tests      | Vitest + Testing Library                                                                                  | Fast, native ESM, Vite-aligned                                                                 |
| Database tests  | pgTAP via `supabase test db`                                                                              | Proves RLS and constraints, not just intentions                                                |
| E2E             | Playwright, including offline and PWA scenarios                                                           | `context.setOffline(true)` is how we test PRD US-11.1 honestly                                 |
| API mocking     | MSW                                                                                                       | Same mocks in unit tests and Playwright                                                        |
| Lint / format   | ESLint with `typescript-eslint` strict-type-checked, Prettier, knip for dead code                         | Type-aware linting catches what plain lint cannot                                              |
| Hooks           | Husky + lint-staged + commitlint                                                                          | Quality gates that cannot be forgotten                                                         |
| CI              | GitHub Actions                                                                                            | Same gates on every PR                                                                         |
| Releases        | release-please with Conventional Commits                                                                  | Automatic SemVer, tags and CHANGELOG from commit history                                       |
| Errors          | Sentry, browser and server                                                                                | We must know a site is failing before the owner calls                                          |
| Containers      | Docker multi-stage build + Docker Compose                                                                 | I have Docker Desktop; I want to run the whole thing locally with one command                  |

**Version pinning:** do not assume the versions in your training data are current. Check the latest stable release of each package before installing, pin exact versions in `package.json` (no `^`, no `~`), and tell me in the plan which versions you selected.

**One thing to flag if it bites us later:** hand-rolled offline sync is the highest-risk code in this product. If the outbox becomes a source of recurring defects, the escape hatch is a Postgres sync engine such as PowerSync or ElectricSQL. Do not reach for it now — but tell me the moment you think we have crossed that line.

---

## 3. Repository and GitHub

My GitHub username is **krishallmagage**.

### 3.1 Setup sequence

1. Run `gh --version` and `gh auth status`. If the CLI is missing or I am not authenticated, stop and tell me exactly what to run. Do not attempt to work around it.
2. Confirm the repository name with me before creating anything. My default preference is `washbook`, private.
3. Initialise locally first, make the initial commit, then:
   ```
   gh repo create krishallmagage/washbook --private --source=. --remote=origin --push
   ```
4. Set `main` as the default branch.
5. Attempt branch protection on `main` — require a pull request, require status checks to pass, block force pushes, block deletion. **Note:** branch protection and rulesets are not available on all plans for private repositories. If the API rejects it, do not silently skip: tell me it failed, and enforce the same rule locally with a Husky `pre-push` hook that refuses any push whose target branch is `main`.
6. Create GitHub milestones `M1 — Pilot`, `M2 — Launch`, `M3 — Expansion`, and labels for each epic in PRD section 9 (`epic:intake`, `epic:pricing`, `epic:tickets`, and so on) plus `type:bug`, `type:chore`, `type:docs`, `security`.
7. Create one GitHub issue per **M1** user story only, titled with the story ID and name, body containing the story statement and its acceptance criteria copied from the PRD, labelled with its epic and assigned to the M1 milestone. Do not create issues for M2 and M3 stories yet.

### 3.2 Files that must exist from the first commit

- `README.md` — what this is, prerequisites, how to run it locally in one command, how to run the tests
- `CLAUDE.md` — the standing rules from section 1 of this message, the stack from section 2, the workflow from section 4, and the "open scope questions" list
- `PRD.md` — moved to `docs/PRD.md`, with a link from the README
- `docs/adr/0001-record-architecture-decisions.md` and one ADR per significant choice (Supabase over a self-managed stack, SQL migrations over an ORM, hand-rolled offline sync, PWA over native). Keep them short — context, decision, consequences
- `.gitignore` — Node, Next.js, Docker volumes, `.env*` except `.env.example`, Playwright artefacts, coverage
- `.gitattributes` containing `* text=auto eol=lf` so line endings never differ between my machine, Docker and CI
- `.env.example` with every variable the app reads, documented, no real values
- `.nvmrc`, `.editorconfig`, `.prettierrc`, `eslint.config.mjs`, `commitlint.config.js`
- `.github/workflows/ci.yml`, `.github/workflows/release-please.yml`
- `.github/pull_request_template.md` and issue templates for bug and story
- `LICENSE` — ask me which; default to a private proprietary notice
- `SECURITY.md` — how to report an issue, and our rule that no key ever enters the repository

---

## 4. Branching, commits and versioning

### 4.1 Branching model

Trunk-based with short-lived branches. `main` is always deployable.

| Branch                     | Purpose                                                                     |
| -------------------------- | --------------------------------------------------------------------------- |
| `main`                     | Protected. Always releasable. Only ever updated by a merged pull request    |
| `feat/<epic>-<short-name>` | One user story or one tight group of stories, e.g. `feat/e1-vehicle-intake` |
| `fix/<issue>-<short-name>` | A defect, e.g. `fix/142-ticket-number-collision`                            |
| `chore/<short-name>`       | Tooling, dependencies, CI                                                   |
| `docs/<short-name>`        | Documentation only                                                          |
| `refactor/<short-name>`    | Behaviour-preserving change with tests proving it                           |

Rules: branch from the latest `main`, keep a branch under two days of work, rebase on `main` rather than merging `main` into it, squash-merge the pull request, delete the branch after merge. A branch that grows beyond one story gets split.

### 4.2 Commit format — Conventional Commits, enforced by commitlint

```
<type>(<scope>): <subject>

<body — the notes: what changed, why, and anything I should know>

Refs: #<issue>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
Scope is the epic or area: `intake`, `pricing`, `tickets`, `billing`, `cash`, `staff`, `auth`, `db`, `docker`, `ci`.
Subject is imperative and under 72 characters. Breaking changes use `!` and a `BREAKING CHANGE:` footer.

The **body is not optional** for anything other than a trivial chore. It is the note I will read in six months. Say what changed, why it changed, what you considered and rejected, and any follow-up that is now owed.

### 4.3 Versioning

Semantic Versioning, driven by release-please from the commit history. `0.x` through M1; `1.0.0` when the pilot exit criteria in PRD section 19 are met. Releases are tagged and produce a CHANGELOG entry automatically. Never hand-edit the version or the CHANGELOG.

### 4.4 The "push" contract

When I say **"push"**, **"commit and push"**, or **"add, commit and push"**, without further instruction, you will do all of the following, in order, and report the result of each:

1. Refuse and tell me if the current branch is `main`. Offer to create the correct branch and move the changes to it.
2. `git status` and `git diff` — show me what is about to be staged, and stop if anything unexpected is there.
3. Confirm no secret, `.env` file, key, token or large binary is in the diff.
4. Run the full local gate: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`. If any step fails, stop and fix it. Do not push a failing state and do not skip hooks.
5. Stage deliberately — `git add` the specific paths, never a blanket `git add .` unless the diff review in step 2 showed nothing unrelated.
6. Write the Conventional Commit with a real body per section 4.2, referencing the GitHub issue.
7. Push and set upstream.
8. Open a pull request with `gh pr create`, using the template, filled in: what changed, which user stories and acceptance criteria are covered, how to test it manually, screenshots for UI work, and anything deliberately left out.
9. Report the pull request URL and the CI status once checks have started.

If any step cannot be completed, stop at that step and tell me why. Do not proceed past a failure.

---

## 5. Docker and running it locally

I have Docker Desktop. I want to clone the repository, run one command, and open **http://localhost:3000/washbook** in my browser.

### 5.1 Requirements

- The application is served under the base path `/washbook`, not at the root. Set `basePath: '/washbook'` and `output: 'standalone'` in `next.config.ts`.
- Visiting `http://localhost:3000/` must redirect to `http://localhost:3000/washbook` rather than showing a 404. Note that Next.js applies `basePath` to redirects too, so the root redirect needs `basePath: false` on that specific redirect entry.
- Static assets, the service worker and the PWA manifest must all resolve correctly under the base path. Verify this with a real browser load, not by reading the code.
- `docker compose up` brings up the full stack: the Next.js application, PostgreSQL, and the Supabase local services. Data persists in a named volume across restarts.
- Provide two compose files: `docker-compose.yml` for a production-like run, and `docker-compose.dev.yml` for development with hot reload via a bind mount, `node_modules` kept inside the container, and file watching that actually works on Docker Desktop.
- The `Dockerfile` is multi-stage — dependencies, build, runner — runs as a non-root user, uses the Next.js standalone output, and includes a `HEALTHCHECK` hitting `GET /washbook/api/health`.
- Add a `/washbook/api/health` route returning application status, database connectivity and the build SHA.
- Seed data: a script that creates one demo site with vehicle classes, a realistic Sri Lankan price grid, staff and a few days of tickets, so the app is never empty on first run.
- Document in the README exactly which ports are used and what to do if one is already taken.

### 5.2 Supabase locally

Use the Supabase CLI, which runs its own containers under Docker Desktop. Migrations live in `supabase/migrations` and are applied with `supabase db reset` on a clean start. Database types are regenerated with a `pnpm db:types` script and the generated file is committed. Explain in the README how the Supabase CLI containers and our compose stack relate, and how to reset everything cleanly.

### 5.3 Scripts I expect in `package.json`

`dev`, `build`, `start`, `typecheck`, `lint`, `lint:fix`, `format`, `test`, `test:watch`, `test:coverage`, `test:db`, `e2e`, `e2e:ui`, `db:start`, `db:reset`, `db:types`, `db:seed`, `docker:up`, `docker:down`, `docker:logs`, `check` (typecheck + lint + test + build as one command).

---

## 6. Definition of done

A user story is done when all of these are true, and you will state them explicitly when you claim a story is complete:

1. Every acceptance criterion in the PRD has a passing automated test, named after the criterion.
2. Relevant business rules from PRD section 13 are enforced in the database, not only in the application.
3. RLS policies exist for every new table and are proven by pgTAP tests.
4. The UI works on a small screen, in Sinhala and in English, with 44px minimum touch targets.
5. Offline behaviour is implemented and tested where PRD section 11 requires it.
6. Loading, empty, error and offline states all exist. No screen can be blank with no explanation.
7. Errors say what went wrong and what to do about it. No raw stack traces reach a user.
8. `pnpm check` passes and CI is green.
9. The pull request is merged and the issue is closed by the merge.
10. `CLAUDE.md` is updated if anything about how we work changed.

---

## 7. Security and data rules

- Row Level Security enabled on every table, with an explicit deny-by-default posture. No table is ever left unprotected "temporarily".
- The Supabase service-role key never reaches the browser and never enters the repository.
- The audit log table has `UPDATE` and `DELETE` revoked at the database level for every role, including the owner. PRD BR-07 is a database guarantee, not a UI convention.
- Customer mobile numbers are used only for that site's own messages. Marketing opt-out is honoured permanently and cannot be overridden anywhere in the UI (PRD BR-09).
- Photographs are purged on the retention schedule in PRD BR-16 by a scheduled job, and the job is tested.
- Dependabot or Renovate enabled, with a weekly schedule and grouped minor updates.

---

## What I want back from you now

No code. No repository. No installs. Produce a plan document containing:

1. **Confirmation you have read the PRD**, and a short list of anything in it that is ambiguous, contradictory or missing from an engineering point of view. Be blunt — this is the most valuable thing you can give me today.
2. **Any disagreement with the stack in section 2**, argued once, with a reason. Include the exact versions you propose to pin.
3. **The repository structure** you will create — the full directory tree, annotated.
4. **The database schema plan** — tables from PRD section 11, with the constraints, triggers and RLS policies that will enforce PRD section 13. Call out anywhere the PRD's model is under-specified.
5. **The M1 build sequence** as a numbered list of vertical slices, each mapped to its PRD user story IDs, each with an estimate in days, ordered so that something demonstrable exists as early as possible. Follow PRD section 19 unless you have a reason to differ, in which case say so.
6. **The riskiest part of this build**, in your judgement, and how you propose to de-risk it in the first week.
7. **What you need from me** before you can start — decisions, credentials, access, or answers to the open questions in PRD section 17.

Then stop and wait for my approval.
