'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { isSiteRole } from '@/domain/permissions'
import { getAnonClient, getAuthClient } from '@/lib/supabase/server'
import { failure, success, type ActionResult } from '@/server/action-result'
import { DEVICE_COOKIE, endPinSession, startPinSession } from './pin-session'

/**
 * Sign-in actions — S1-05, S1-06.
 *
 * Two routes in, one outcome: a request carrying `site_id` and `site_role`
 * claims that RLS governs (ADR-0008). Owner and Manager go through Supabase
 * Auth; shared-device roles go through a PIN verified in the database, where
 * the hash lives and never leaves.
 */

const credentialsSchema = z.object({
  email: z.email({ error: 'Enter a valid email address.' }),
  password: z.string().min(1, { error: 'Enter your password.' }),
})

export async function signInWithPassword(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return failure(
      'invalid_input',
      parsed.error.issues[0]?.message ?? 'Check the details you entered.',
    )
  }

  const supabase = await getAuthClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error !== null) {
    // Deliberately not distinguishing "no such account" from "wrong password":
    // the difference tells an attacker which emails are real.
    return failure(
      'invalid_credentials',
      'That email and password do not match. Check them and try again.',
    )
  }

  redirect('/')
}

const pinSchema = z.object({
  userId: z.uuid({ error: 'Choose your name from the list.' }),
  pin: z
    .string()
    .regex(/^[0-9]{4,6}$/, { error: 'Your PIN is 4 to 6 digits.' }),
})

export async function signInWithPin(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const store = await cookies()
  const deviceId = store.get(DEVICE_COOKIE)?.value

  if (deviceId === undefined) {
    return failure(
      'device_not_enrolled',
      'This device is not set up yet. Ask an Owner or Manager to enrol it.',
    )
  }

  const parsed = pinSchema.safeParse({
    userId: formData.get('userId'),
    pin: formData.get('pin'),
  })
  if (!parsed.success) {
    return failure(
      'invalid_input',
      parsed.error.issues[0]?.message ?? 'Check what you entered.',
    )
  }

  // Verification happens in the database so the PIN hash never crosses a
  // process boundary, and so the lockout counter cannot be bypassed by calling
  // a different code path.
  const supabase = getAnonClient()
  const { data, error } = await supabase.rpc('fn_verify_pin', {
    p_device_id: deviceId,
    p_user_id: parsed.data.userId,
    p_pin: parsed.data.pin,
  })

  if (error !== null) {
    return failure(
      'verification_failed',
      'Could not check your PIN just now. Check your connection and try again.',
    )
  }

  const result = data as {
    ok: boolean
    user_id: string | null
    site_id: string | null
    site_role: string | null
    full_name: string | null
    locked_until: string | null
    failure_reason: string | null
  }

  if (!result.ok) {
    if (result.failure_reason === 'locked') {
      return failure(
        'locked',
        'Too many wrong PINs. This account is locked for 15 minutes. Ask a Manager if you need in sooner.',
      )
    }
    if (result.failure_reason === 'device_not_enrolled') {
      return failure(
        'device_not_enrolled',
        'This device is no longer enrolled. Ask an Owner or Manager to set it up again.',
      )
    }
    return failure('invalid_pin', 'That PIN is not right. Try again.')
  }

  // The database said yes, but the shape it returned is still input. A missing
  // claim here would mint a token that RLS reads as "no site", which denies
  // everything — better to fail loudly at sign-in than mysteriously later.
  if (
    result.user_id === null ||
    result.site_id === null ||
    result.full_name === null ||
    !isSiteRole(result.site_role)
  ) {
    return failure(
      'verification_failed',
      'Your account is not set up correctly. Ask an Owner to check it.',
    )
  }

  await startPinSession({
    appUserId: result.user_id,
    siteId: result.site_id,
    role: result.site_role,
    fullName: result.full_name,
    deviceId,
  })

  redirect('/')
}

export async function listDeviceUsers(): Promise<
  ActionResult<readonly { id: string; fullName: string; role: string }[]>
> {
  const store = await cookies()
  const deviceId = store.get(DEVICE_COOKIE)?.value
  if (deviceId === undefined) {
    return failure(
      'device_not_enrolled',
      'This device is not set up yet. Ask an Owner or Manager to enrol it.',
    )
  }

  const supabase = getAnonClient()
  const { data, error } = await supabase.rpc('fn_device_users', {
    p_device_id: deviceId,
  })

  if (error !== null) {
    return failure(
      'lookup_failed',
      'Could not load the staff list. Check your connection and try again.',
    )
  }

  return success(
    data.map((row) => ({
      id: row.id,
      fullName: row.full_name,
      role: row.role,
    })),
  )
}

export async function signOut(): Promise<void> {
  await endPinSession()
  const supabase = await getAuthClient()
  await supabase.auth.signOut()
  redirect('/sign-in')
}
