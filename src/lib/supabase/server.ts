import 'server-only'

import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { getClientEnv, getServerEnv } from '@/lib/env'
import type { Database } from '@/types/database'

/**
 * Server-side Supabase clients.
 *
 * There are two, and the difference matters:
 *
 *  - `getAuthClient()` for Owner and Manager, who sign in through Supabase Auth
 *    and whose session lives in cookies managed by @supabase/ssr.
 *  - `getPinClient()` for shared-device roles, whose credential is a token we
 *    minted ourselves (ADR-0008) and pass as a bearer header.
 *
 * Both end up as an ordinary `authenticated` Postgres role with `site_id` and
 * `site_role` claims, so RLS governs them identically. Neither ever touches the
 * service-role key.
 */

/** Server-to-server address; inside a container 127.0.0.1 is the container. */
function supabaseUrl(): string {
  return (
    getServerEnv().SUPABASE_INTERNAL_URL ??
    getClientEnv().NEXT_PUBLIC_SUPABASE_URL
  )
}

export async function getAuthClient() {
  const store = await cookies()

  return createServerClient<Database>(
    supabaseUrl(),
    getClientEnv().NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return store.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              store.set(name, value, options)
            }
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // Harmless: the middleware refreshes the session on every request,
            // which is the supported arrangement.
          }
        },
      },
    },
  )
}

/**
 * A client acting as a PIN-authenticated user.
 *
 * The minted token goes in the Authorization header rather than the cookie jar,
 * because it is not a Supabase Auth session — Supabase never issued it. PostgREST
 * only cares that it verifies against the project's JWT secret.
 */
export function getPinClient(token: string) {
  return createClient<Database>(
    supabaseUrl(),
    getClientEnv().NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    },
  )
}

/**
 * An unauthenticated client, for the sign-in screens only.
 *
 * It reaches exactly two SECURITY DEFINER functions — `fn_device_users` and
 * `fn_verify_pin` — both of which treat device enrolment as the credential.
 * Everything else is denied by RLS, which is the point of deny-by-default.
 */
export function getAnonClient() {
  return createClient<Database>(
    supabaseUrl(),
    getClientEnv().NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
