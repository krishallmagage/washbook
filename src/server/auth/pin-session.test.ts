// @vitest-environment node
//
// jose validates key types by realm. Under jsdom the Uint8Array from
// TextEncoder belongs to a different realm than jose's check, so signing
// fails on a value that IS a Uint8Array. Nothing here touches the DOM.

import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Token minting is the hinge the whole tenancy story turns on (ADR-0008). If a
 * forged or expired token were accepted, RLS would faithfully enforce whatever
 * site and role the attacker asked for.
 *
 * `next/headers` is mocked because these tests exercise the crypto, not the
 * cookie jar.
 */
vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({
      get: () => undefined,
      set: () => undefined,
      delete: () => undefined,
    }),
}))

const SECRET = 'test-jwt-secret-at-least-32-characters-long'

vi.mock('@/lib/env', () => ({
  getServerEnv: () => ({
    SUPABASE_SERVICE_ROLE_KEY: 'test',
    SUPABASE_JWT_SECRET: SECRET,
    BUILD_SHA: 'test',
    NODE_ENV: 'test',
  }),
}))

const { mintPinToken, readPinToken, PIN_SESSION_TTL_SECONDS } =
  await import('./pin-session')

const SESSION = {
  appUserId: '11111111-1111-4111-8111-111111111111',
  siteId: '22222222-2222-4222-8222-222222222222',
  role: 'supervisor',
  fullName: 'Sanjeewa',
  deviceId: '33333333-3333-4333-8333-333333333333',
} as const

describe('PIN session tokens', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  it('round-trips a session unchanged', async () => {
    const token = await mintPinToken(SESSION)
    await expect(readPinToken(token)).resolves.toEqual(SESSION)
  })

  it('US-10.3 AC2 — expires after the idle period', async () => {
    const token = await mintPinToken(SESSION)

    // jose validates `exp` against the real clock, so move the clock rather
    // than waiting 30 minutes.
    vi.useFakeTimers()
    vi.setSystemTime(Date.now() + (PIN_SESSION_TTL_SECONDS + 60) * 1000)

    await expect(readPinToken(token)).resolves.toBeNull()
  })

  it('rejects a token signed with a different secret', async () => {
    // A token minted elsewhere — the shape is right, the signature is not.
    const forged =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
      'eyJzdWIiOiIxMTExMTExMS0xMTExLTQxMTEtODExMS0xMTExMTExMTExMTEiLCJhdWQiOiJhdXRoZW50aWNhdGVkIn0.' +
      'not-a-valid-signature'
    await expect(readPinToken(forged)).resolves.toBeNull()
  })

  it('rejects a tampered payload', async () => {
    const token = await mintPinToken(SESSION)
    const [header, payload, signature] = token.split('.')
    // Flip a character in the payload; the signature no longer matches.
    const tampered = `${header ?? ''}.${(payload ?? '').slice(0, -2)}XY.${signature ?? ''}`
    await expect(readPinToken(tampered)).resolves.toBeNull()
  })

  it('rejects rubbish rather than throwing', async () => {
    for (const bad of ['', 'not.a.token', 'a.b', 'null']) {
      await expect(readPinToken(bad)).resolves.toBeNull()
    }
  })

  it('carries role=authenticated so Postgres applies the right grants', async () => {
    const token = await mintPinToken(SESSION)
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8'),
    ) as Record<string, unknown>

    expect(payload.role).toBe('authenticated')
    expect(payload.site_id).toBe(SESSION.siteId)
    expect(payload.site_role).toBe(SESSION.role)
  })

  it('never puts the signing secret in the token', async () => {
    const token = await mintPinToken(SESSION)
    expect(token).not.toContain(SECRET)
  })
})
