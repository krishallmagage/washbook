import { afterEach, describe, expect, it } from 'vitest'
import {
  clientSchema,
  getServerEnv,
  resetEnvCacheForTests,
  serverSchema,
} from './env'

/**
 * Boundary validation is the first thing to prove works, because everything
 * else in the build assumes it does — bootstrap brief §2, "Zod at every
 * boundary". These tests also serve as the smoke test for the Vitest harness
 * itself (S0-06).
 */
describe('environment validation', () => {
  afterEach(() => {
    resetEnvCacheForTests()
  })

  const validClient = {
    NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
  }

  it('accepts a well-formed client environment', () => {
    expect(clientSchema.safeParse(validClient).success).toBe(true)
  })

  it('rejects a Supabase URL that is not a URL', () => {
    const result = clientSchema.safeParse({
      ...validClient,
      NEXT_PUBLIC_SUPABASE_URL: 'not-a-url',
    })
    expect(result.success).toBe(false)
  })

  it('rejects an empty anon key rather than silently starting', () => {
    const result = clientSchema.safeParse({
      ...validClient,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
    })
    expect(result.success).toBe(false)
  })

  it('names the missing variable so the error is actionable', () => {
    // Bootstrap brief §6.7: errors say what went wrong and what to do about it.
    const result = serverSchema.safeParse({ NODE_ENV: 'test' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path.join('.'))
      expect(paths).toContain('SUPABASE_SERVICE_ROLE_KEY')
    }
  })

  it('refuses to read server environment from a browser context', () => {
    // Bootstrap brief §7: the service-role key never reaches the browser. This
    // spec runs under jsdom, so `window` is defined — the same condition a real
    // client component would present.
    expect(typeof window).not.toBe('undefined')
    expect(() => getServerEnv()).toThrow(/never reach the client bundle/)
  })

  it('defaults BUILD_SHA so a local run is not blocked by build metadata', () => {
    const result = serverSchema.safeParse({
      SUPABASE_SERVICE_ROLE_KEY: 'service-key',
      NODE_ENV: 'test',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.BUILD_SHA).toBe('development')
    }
  })
})
