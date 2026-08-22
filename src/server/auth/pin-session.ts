import 'server-only'

import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { isSiteRole, type SiteRole } from '@/domain/permissions'
import { getServerEnv } from '@/lib/env'

/**
 * PIN sessions — ADR-0008.
 *
 * A verified PIN causes the server to mint a short-TTL JWT carrying `site_id`
 * and `site_role`, signed with the project's JWT secret. Every request that
 * follows is an ordinary RLS-governed Supabase request. The alternative — a
 * service-role path with permission checks in application code — would work on
 * day one and demolish the tenancy boundary the whole product rests on.
 *
 * `server-only` at the top is load bearing: importing this from a client
 * component is a build error, not a runtime surprise, because it would drag the
 * signing secret towards the browser bundle.
 */

const PIN_SESSION_COOKIE = 'wb_pin_session'
export const DEVICE_COOKIE = 'wb_device'

/** US-10.3 AC2 — sessions expire after a configurable idle period, default 30 minutes. */
export const PIN_SESSION_TTL_SECONDS = 30 * 60

export interface PinSession {
  readonly appUserId: string
  readonly siteId: string
  readonly role: SiteRole
  readonly fullName: string
  readonly deviceId: string
}

function signingKey(): Uint8Array {
  return new TextEncoder().encode(getServerEnv().SUPABASE_JWT_SECRET)
}

/**
 * Mint a Supabase-compatible token.
 *
 * `role: 'authenticated'` is what makes Postgres apply the `authenticated`
 * grants and policies; `site_id` and `site_role` are what `auth_site_id()` and
 * `auth_role()` read. `aud` and `sub` are required for Supabase to accept it.
 */
export async function mintPinToken(session: PinSession): Promise<string> {
  return new SignJWT({
    role: 'authenticated',
    site_id: session.siteId,
    site_role: session.role,
    app_user_id: session.appUserId,
    device_id: session.deviceId,
    full_name: session.fullName,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(session.appUserId)
    .setAudience('authenticated')
    .setIssuedAt()
    .setExpirationTime(`${String(PIN_SESSION_TTL_SECONDS)}s`)
    .sign(signingKey())
}

export async function readPinToken(token: string): Promise<PinSession | null> {
  try {
    const { payload } = await jwtVerify(token, signingKey(), {
      audience: 'authenticated',
    })

    const role = payload.site_role
    const siteId = payload.site_id
    const appUserId = payload.sub
    const deviceId = payload.device_id
    const fullName = payload.full_name

    // Every claim is re-validated rather than trusted. A token we signed is
    // still input, and a malformed one must produce "no session", never a
    // partially-populated one that later code treats as authorised.
    if (
      !isSiteRole(role) ||
      typeof siteId !== 'string' ||
      typeof appUserId !== 'string' ||
      typeof deviceId !== 'string' ||
      typeof fullName !== 'string'
    ) {
      return null
    }

    return { appUserId, siteId, role, fullName, deviceId }
  } catch {
    // Expired, tampered with, or signed by something else. All the same answer.
    return null
  }
}

export async function startPinSession(session: PinSession): Promise<void> {
  const token = await mintPinToken(session)
  const store = await cookies()
  store.set(PIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: PIN_SESSION_TTL_SECONDS,
  })
}

export async function endPinSession(): Promise<void> {
  const store = await cookies()
  store.delete(PIN_SESSION_COOKIE)
}

/** The raw token, for handing to a Supabase client as a bearer credential. */
export async function currentPinToken(): Promise<string | null> {
  const store = await cookies()
  return store.get(PIN_SESSION_COOKIE)?.value ?? null
}

export async function currentPinSession(): Promise<PinSession | null> {
  const token = await currentPinToken()
  return token === null ? null : readPinToken(token)
}
