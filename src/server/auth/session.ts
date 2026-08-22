import 'server-only'

import {
  hasPermission,
  type PermissionAction,
  type SiteRole,
} from '@/domain/permissions'
import { getAuthClient, getPinClient } from '@/lib/supabase/server'
import { currentPinSession, currentPinToken } from './pin-session'

/**
 * One accessor for "who is asking", regardless of how they signed in.
 *
 * S1-08. Note what this is NOT: it is not the authorisation boundary. RLS is
 * (ADR-0006). `requirePermission` exists so a server action can fail early with
 * a sentence a user can act on, instead of surfacing a bare Postgres 42501 —
 * bootstrap brief §6.7. If it were ever bypassed, the database would still
 * refuse.
 */

type AuthMethod = 'supabase' | 'pin'

export interface CurrentUser {
  readonly appUserId: string
  readonly siteId: string
  readonly role: SiteRole
  readonly fullName: string
  readonly method: AuthMethod
  readonly deviceId: string | null
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  // PIN first: on a shared device it is the common case, and it avoids a
  // Supabase Auth round trip for a session that will not be there.
  const pin = await currentPinSession()
  if (pin !== null) {
    return {
      appUserId: pin.appUserId,
      siteId: pin.siteId,
      role: pin.role,
      fullName: pin.fullName,
      method: 'pin',
      deviceId: pin.deviceId,
    }
  }

  const supabase = await getAuthClient()
  const { data, error } = await supabase.auth.getUser()
  if (error !== null) return null

  // The claims come from the access-token hook (S1-05), not from user metadata,
  // which a user can edit. Anything a client can write is not an authorisation
  // input.
  const claims = data.user.app_metadata as Record<string, unknown>
  const siteId = claims.site_id
  const role = claims.site_role

  if (typeof siteId !== 'string' || typeof role !== 'string') return null

  return {
    appUserId: (claims.app_user_id as string | undefined) ?? data.user.id,
    siteId,
    role: role as SiteRole,
    fullName: data.user.email ?? 'Signed in',
    method: 'supabase',
    deviceId: null,
  }
}

/** A Supabase client acting as whoever is signed in, PIN or otherwise. */
export async function getScopedClient() {
  const token = await currentPinToken()
  if (token !== null) return getPinClient(token)
  return getAuthClient()
}

export class NotAuthorisedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotAuthorisedError'
  }
}

async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (user === null) {
    throw new NotAuthorisedError(
      'Your session has ended. Sign in again to continue.',
    )
  }
  return user
}

export async function requirePermission(
  action: PermissionAction,
  options: { readonly supervisorCanOverride?: boolean } = {},
): Promise<CurrentUser> {
  const user = await requireUser()
  const allowed = hasPermission(
    {
      role: user.role,
      ...(options.supervisorCanOverride === undefined
        ? {}
        : { supervisorCanOverride: options.supervisorCanOverride }),
    },
    action,
  )
  if (!allowed) {
    throw new NotAuthorisedError(
      `Your role (${user.role}) cannot do this. Ask an Owner or Manager.`,
    )
  }
  return user
}
