import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getClientEnv, getServerEnv } from '@/lib/env'

/**
 * GET /washbook/api/health — bootstrap brief §5.1.
 *
 * Reports application status, database connectivity and the build SHA. The
 * Dockerfile HEALTHCHECK hits this, so it must be cheap and must not require
 * authentication. It returns 503 when the database is unreachable so that
 * Docker marks the container unhealthy rather than routing traffic to it.
 */

export const dynamic = 'force-dynamic'
export const revalidate = 0

type DatabaseStatus =
  | { readonly reachable: true; readonly latencyMs: number }
  | { readonly reachable: false; readonly error: string }

async function checkDatabase(): Promise<DatabaseStatus> {
  const startedAt = performance.now()
  try {
    const env = getClientEnv()
    const supabase = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false } },
    )

    // Cheapest possible round trip that proves PostgREST and Postgres are both
    // up. Slice 1 replaces this with a count against `sites`, which also proves
    // RLS is loaded.
    const { error } = await supabase.rpc('version_check').select()

    // `version_check` does not exist yet (no migrations before Slice 1). A
    // "function not found" reply still proves the database answered, which is
    // exactly what this check is for.
    const answered = !error || error.code === 'PGRST202'
    if (!answered) {
      return { reachable: false, error: error.message }
    }
    return {
      reachable: true,
      latencyMs: Math.round(performance.now() - startedAt),
    }
  } catch (cause) {
    return {
      reachable: false,
      error: cause instanceof Error ? cause.message : 'Unknown database error',
    }
  }
}

export async function GET(): Promise<NextResponse> {
  const { BUILD_SHA, NODE_ENV } = getServerEnv()
  const database = await checkDatabase()

  return NextResponse.json(
    {
      status: database.reachable ? 'ok' : 'degraded',
      service: 'washbook',
      environment: NODE_ENV,
      buildSha: BUILD_SHA,
      database,
      checkedAt: new Date().toISOString(),
    },
    {
      status: database.reachable ? 200 : 503,
      headers: { 'cache-control': 'no-store' },
    },
  )
}
