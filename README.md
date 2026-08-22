# WashBook

Vehicle wash and detailing operations platform for the Sri Lankan market.

Every vehicle that enters a wash gets a ticket at the gate. The ticket carries
the vehicle class, the services chosen, the price from the owner's own price
list, the staff assigned, and photographs taken before work starts. The ticket
becomes the bill. The bills become the day's cash reconciliation, which reaches
the owner's phone whether he is at the site or not.

**Status:** pre-pilot. Building Release M1 — see [`docs/PLAN-M1.md`](docs/PLAN-M1.md).

| Document                               | What it is                                                                                             |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| [`docs/PRD.md`](docs/PRD.md)           | Product requirements — the source of truth for scope, data model and business rules                    |
| [`docs/PLAN-M1.md`](docs/PLAN-M1.md)   | Engineering plan: PRD defects found, stack rationale with pinned versions, schema plan, build sequence |
| [`docs/TASKS-M1.md`](docs/TASKS-M1.md) | The execution backlog, task by task                                                                    |
| [`CLAUDE.md`](CLAUDE.md)               | Standing rules for how we work on this repository                                                      |
| [`docs/adr/`](docs/adr/)               | Architecture decision records                                                                          |

---

## Prerequisites

| Tool           | Version                | Check                        |
| -------------- | ---------------------- | ---------------------------- |
| Node.js        | 22.14.0 (see `.nvmrc`) | `node -v`                    |
| pnpm           | 11.x via Corepack      | `corepack enable && pnpm -v` |
| Docker Desktop | 28.x                   | `docker --version`           |
| GitHub CLI     | any recent             | `gh --version`               |

Docker Desktop must be **running** before any database command — the Supabase
CLI runs its services as Docker containers.

## Run it locally

```bash
git clone https://github.com/krishallmagage/washbook.git
cd washbook
corepack enable
pnpm install

# Start Postgres, Auth, Storage, PostgREST and Studio. First run pulls several
# GB of images and takes a while; later runs take seconds.
pnpm db:start

# Copy the anon key and service-role key that db:start prints into .env.local
cp .env.example .env.local

pnpm dev
```

Open **<http://localhost:3000/washbook>**.

`http://localhost:3000/` redirects there — the app is served under a base path,
not at the root.

### Or run the whole thing in Docker

```bash
pnpm db:start          # Supabase containers (see below for why this is separate)
pnpm docker:up         # builds and starts WashBook, joined to the Supabase network
pnpm docker:logs
pnpm docker:down
```

For development with hot reload against a bind mount:

```bash
docker compose -f docker-compose.dev.yml up
```

## How the Supabase CLI and our compose stack relate

This trips people up, so it is worth being explicit.

The Supabase CLI runs **its own** containers under Docker Desktop — Postgres,
GoTrue (Auth), PostgREST, Storage, Realtime, Studio and a Kong gateway. Our
`docker-compose.yml` deliberately does **not** define a second Postgres. Two
databases on one machine — one migrated by `supabase db reset`, one not — is the
most reliable way to produce "it works on my machine".

So the division is:

- **`pnpm db:start` owns the data plane.** Migrations, seed data, auth, storage.
- **`pnpm docker:up` owns the application.** The app container joins the network
  the CLI created (`supabase_network_WashBook`; override with `SUPABASE_NETWORK`).

Database data persists in the CLI's own named volume across restarts.

### Reset everything cleanly

```bash
pnpm db:reset          # drop, re-run every migration, re-seed. Local only.
pnpm exec supabase stop --no-backup   # nuclear: discards the local database
pnpm db:start
```

`pnpm db:reset` is destructive and must never be pointed at anything other than
the local Docker database.

## Ports

| Port  | Service                     | If it is already taken                                              |
| ----- | --------------------------- | ------------------------------------------------------------------- |
| 3000  | WashBook (Next.js)          | `PORT=3001 pnpm dev`, or set `PORT` in `.env.local` for Docker      |
| 54321 | Supabase API gateway (Kong) | Change `[api].port` in `supabase/config.toml`, then `pnpm db:start` |
| 54322 | Postgres                    | Change `[db].port` in `supabase/config.toml`                        |
| 54323 | Supabase Studio             | Change `[studio].port` in `supabase/config.toml`                    |
| 54324 | Inbucket (test mail)        | Change `[inbucket].port` in `supabase/config.toml`                  |

Find what is holding a port on Windows:

```powershell
Get-NetTCPConnection -LocalPort 3000 | Select-Object OwningProcess
Get-Process -Id <OwningProcess>
```

## Tests

```bash
pnpm typecheck      # tsc --noEmit
pnpm lint           # eslint + knip (dead code and unused dependencies)
pnpm test           # Vitest unit tests
pnpm test:watch
pnpm test:coverage
pnpm test:db        # pgTAP — RLS policies and database constraints
pnpm e2e            # Playwright, including offline and PWA scenarios
pnpm e2e:ui
pnpm check          # typecheck + lint + test + build, as one command
```

`pnpm check` is what CI runs and what must pass before anything is pushed.

## Health

```bash
curl http://localhost:3000/washbook/api/health
```

Returns application status, database connectivity and the build SHA. The Docker
`HEALTHCHECK` hits this endpoint; a degraded database marks the container
unhealthy rather than quietly serving errors.

## Security

No key, token or `.env` file ever enters this repository — see
[`SECURITY.md`](SECURITY.md). The Supabase service-role key bypasses Row Level
Security, which is the tenancy boundary for the entire product; it is
server-only and never reaches the browser.

## Licence

Proprietary. See [`LICENSE`](LICENSE).
