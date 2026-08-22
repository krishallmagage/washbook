'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { failure, success, type ActionResult } from '@/server/action-result'
import { DEVICE_COOKIE } from '@/server/auth/pin-session'
import {
  NotAuthorisedError,
  getScopedClient,
  requirePermission,
} from '@/server/auth/session'

/**
 * Device enrolment — S1-07, US-10.3 AC3.
 *
 * A device is not a convenience record. It is the credential that lets a
 * browser see a site's staff list at the PIN screen, and its `short_code`
 * prefixes ticket numbers so two devices creating tickets offline cannot
 * collide (ADR-0007). Enrolling one is therefore an Owner/Manager act, checked
 * here for a readable error and enforced by RLS regardless.
 */

// An array, not a string: spreading a string yields code points, which is a
// trap for non-ASCII text and is flagged by lint for good reason.
const SHORT_CODES = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
] as const

const enrolSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, { error: 'Give the device a name, like "Gate phone".' })
    .max(60, { error: 'Keep the name under 60 characters.' }),
})

export async function enrolDevice(
  formData: FormData,
): Promise<ActionResult<string>> {
  const parsed = enrolSchema.safeParse({ label: formData.get('label') })
  if (!parsed.success) {
    return failure(
      'invalid_input',
      parsed.error.issues[0]?.message ?? 'Check the device name.',
    )
  }

  let user
  try {
    user = await requirePermission('enrol_device')
  } catch (error) {
    if (error instanceof NotAuthorisedError) {
      return failure('not_authorised', error.message)
    }
    throw error
  }

  const supabase = await getScopedClient()

  // Short codes are per-site and single-character, so a site can hold at most
  // 26 active devices. That is far beyond a 2-6 bay wash; the limit is stated
  // rather than silently truncating to a duplicate.
  const { data: existing, error: readError } = await supabase
    .from('devices')
    .select('short_code')
    .eq('site_id', user.siteId)
    .eq('is_active', true)

  if (readError !== null) {
    return failure(
      'lookup_failed',
      'Could not read the device list. Check your connection and try again.',
    )
  }

  const used = new Set(existing.map((d) => d.short_code))
  const shortCode = SHORT_CODES.find((letter) => !used.has(letter))

  if (shortCode === undefined) {
    return failure(
      'no_codes_left',
      'This site already has 26 active devices. Deactivate one before enrolling another.',
    )
  }

  const { data: device, error: insertError } = await supabase
    .from('devices')
    .insert({
      site_id: user.siteId,
      label: parsed.data.label,
      short_code: shortCode,
      enrolled_by: user.appUserId,
    })
    .select('id')
    .single()

  if (insertError !== null) {
    return failure(
      'enrolment_failed',
      'Could not enrol this device. Check your connection and try again.',
    )
  }

  // This cookie is what makes the browser "this device" from now on. It is not
  // a session — it survives sign-out, which is the point on a shared tablet.
  const store = await cookies()
  store.set(DEVICE_COOKIE, device.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })

  revalidatePath('/settings/devices')
  return success(shortCode)
}
