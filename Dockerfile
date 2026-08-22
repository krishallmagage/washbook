# syntax=docker/dockerfile:1

# WashBook production image — bootstrap brief §5.1.
#
# Multi-stage: deps -> builder -> runner. The runner carries only Next's
# standalone output and runs as a non-root user. Node is pinned to match
# .nvmrc and package.json `engines` so the image, CI and the developer machine
# all agree (§2.2 of docs/PLAN-M1.md covers the pending move to Node 24).

ARG NODE_VERSION=22.14.0

# ---------------------------------------------------------------------------
# deps — install exactly what the lockfile says, nothing more
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
# builder — produce the standalone server bundle
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS builder
WORKDIR /app
RUN corepack enable

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next inlines NEXT_PUBLIC_* at build time, so they must be present here. These
# are public by definition (see .env.example); the service-role key is not, and
# is never passed to a build stage.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm build

# ---------------------------------------------------------------------------
# runner — minimal, non-root
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs nextjs

# `standalone` contains a self-contained server plus a pruned node_modules.
# Static assets and `public/` are not included in it and must be copied
# alongside, or every stylesheet and icon 404s under the base path.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

ARG BUILD_SHA=unknown
ENV BUILD_SHA=${BUILD_SHA}

# node:alpine ships no curl or wget-with-https; Node's own fetch is the
# dependency-free way to probe. Non-2xx exits non-zero and marks the container
# unhealthy, which is what a degraded database should do.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/washbook/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
