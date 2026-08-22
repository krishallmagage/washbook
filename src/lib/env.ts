import { z } from 'zod'

/**
 * Environment validation — bootstrap brief §2: "Zod at every boundary … no
 * untyped data crosses a boundary", and §7: "the Supabase service-role key
 * never reaches the browser".
 *
 * The server/client split here is the mechanism that enforces the second rule.
 * `getClientEnv()` may only return NEXT_PUBLIC_* values, because Next inlines
 * those into the browser bundle. `getServerEnv()` throws if called in a browser
 * rather than shipping a secret. S1-09 adds a build-time assertion over the
 * emitted bundles, so this is the first of two lines of defence, not the only
 * one.
 *
 * Both accessors validate lazily and memoize. Validating at module load would
 * mean that merely importing this file — in a unit test, in a Docker build
 * stage, in a tooling script — requires a complete production environment. The
 * failure still happens at first use, which for any real request is startup.
 */

export const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({
    error: 'NEXT_PUBLIC_SUPABASE_URL must be the full Supabase project URL.',
  }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, {
    error: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required.',
  }),
})

export const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, {
    error: 'SUPABASE_SERVICE_ROLE_KEY is required on the server.',
  }),
  /**
   * Server-to-server Supabase URL, used when the app cannot reach Supabase at
   * the same address the browser uses.
   *
   * In Docker this matters: NEXT_PUBLIC_SUPABASE_URL is baked at build time and
   * must be an address the *browser* can reach (127.0.0.1:54321), but inside
   * the container that address is the container itself. Server code needs the
   * Supabase network hostname instead. Optional — falls back to the public URL,
   * which is correct for local dev and for a hosted deployment.
   */
  SUPABASE_INTERNAL_URL: z.url().optional(),
  /**
   * The project's JWT signing secret. A verified PIN causes the server to mint
   * a short-TTL token with this (ADR-0008), so a shared-device user is governed
   * by the same RLS policies as everyone else rather than by a second
   * authorisation system.
   *
   * Minimum 32 characters because HS256 with a short key is not meaningfully
   * signed. This value is as dangerous as the service-role key: anything that
   * can sign a token can mint one for any site and any role.
   */
  SUPABASE_JWT_SECRET: z
    .string()
    .min(32, { error: 'SUPABASE_JWT_SECRET must be at least 32 characters.' }),
  /** Injected by the Docker build; surfaced by the health route. */
  BUILD_SHA: z.string().default('development'),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
})

export type ClientEnv = z.infer<typeof clientSchema>
export type ServerEnv = z.infer<typeof serverSchema>

function parseOrThrow<T extends z.ZodType>(
  schema: T,
  source: unknown,
): z.infer<T> {
  const result = schema.safeParse(source)
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    throw new Error(
      `Invalid environment configuration:\n${detail}\n\nSee .env.example for every variable this app reads.`,
    )
  }
  return result.data
}

let cachedClientEnv: ClientEnv | undefined
let cachedServerEnv: ServerEnv | undefined

export function getClientEnv(): ClientEnv {
  /*
   * Next replaces `process.env.NEXT_PUBLIC_*` at build time only for statically
   * analysable member expressions, so these must be written out in full rather
   * than iterated or accessed by computed key.
   */
  cachedClientEnv ??= parseOrThrow(clientSchema, {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  })
  return cachedClientEnv
}

export function getServerEnv(): ServerEnv {
  if (typeof window !== 'undefined') {
    throw new Error(
      'getServerEnv() was called in the browser. Server environment variables — including the Supabase service-role key — must never reach the client bundle.',
    )
  }
  cachedServerEnv ??= parseOrThrow(serverSchema, process.env)
  return cachedServerEnv
}

/** Test-only: clears memoized values so a spec can vary the environment. */
export function resetEnvCacheForTests(): void {
  cachedClientEnv = undefined
  cachedServerEnv = undefined
}
