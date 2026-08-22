#!/usr/bin/env node
/**
 * S1-09 — fail the build if a server secret reached a browser bundle.
 *
 * ADR-0008 and SECURITY.md both rest on one claim: the service-role key and the
 * JWT signing secret never leave the server. The `server-only` import and the
 * getServerEnv() browser guard are the first line; this is the one that checks
 * the artefact that actually ships.
 *
 * It scans Next's client output for the literal secret values, plus a couple of
 * shapes that indicate a service-role token even if the value differs from what
 * this machine has configured.
 *
 * Run after `pnpm build`. Part of `pnpm check` and of CI.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const CLIENT_DIRS = ['.next/static']
const MIN_SECRET_LENGTH = 16

function readEnvFile(path) {
  if (!existsSync(path)) return {}
  const out = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
    if (match) out[match[1]] = match[2]
  }
  return out
}

function collectFiles(dir) {
  const found = []
  if (!existsSync(dir)) return found
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) found.push(...collectFiles(full))
    else if (/\.(js|mjs|json|map|css)$/.test(entry)) found.push(full)
  }
  return found
}

const fileEnv = readEnvFile('.env.local')
const env = { ...fileEnv, ...process.env }

/** Literal values we know are secret on this machine. */
const literals = ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_JWT_SECRET']
  .map((name) => ({ name, value: env[name] }))
  .filter(
    ({ value }) =>
      typeof value === 'string' &&
      value.length >= MIN_SECRET_LENGTH &&
      // Placeholders used in CI are not secrets and would produce noise.
      !/^(ci|local|test)-/.test(value),
  )

/**
 * Shape-based checks, so this still catches a leak on a machine where the real
 * secret is not configured — CI, for instance.
 */
const patterns = [
  {
    name: 'a service_role JWT',
    // The role claim of a Supabase service key, base64url-encoded.
    regex: /InNlcnZpY2Vfcm9sZSI/,
  },
  {
    name: 'a literal SUPABASE_SERVICE_ROLE_KEY reference',
    regex: /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']{16,}["']/,
  },
]

const files = CLIENT_DIRS.flatMap(collectFiles)

if (files.length === 0) {
  console.error(
    'assert-no-secrets-in-bundle: no client bundle found. Run `pnpm build` first.',
  )
  process.exit(1)
}

const violations = []

for (const file of files) {
  const contents = readFileSync(file, 'utf8')

  for (const { name, value } of literals) {
    if (contents.includes(value)) {
      violations.push(`${file}: contains the value of ${name}`)
    }
  }
  for (const { name, regex } of patterns) {
    if (regex.test(contents)) {
      violations.push(`${file}: looks like it contains ${name}`)
    }
  }
}

if (violations.length > 0) {
  console.error('\n  A SERVER SECRET REACHED THE BROWSER BUNDLE\n')
  for (const v of violations) console.error(`  - ${v}`)
  console.error(
    [
      '',
      '  The service-role key bypasses Row Level Security, which is the tenancy',
      '  boundary for the entire product (ADR-0006). If this key has been served',
      '  to a browser, ROTATE IT before doing anything else.',
      '',
      '  Usual cause: a module importing `getServerEnv()` or `pin-session.ts` was',
      '  pulled into a Client Component. Check the import chain from the file',
      '  above and add `server-only` to whatever should not have crossed.',
      '',
    ].join('\n'),
  )
  process.exit(1)
}

console.log(
  `assert-no-secrets-in-bundle: scanned ${String(files.length)} client files, no secrets found.`,
)
