import Link from 'next/link'
import { ErrorNote } from '@/components/ui/field'
import { listDeviceUsers } from '@/server/auth/actions'
import { PinForm } from './pin-form'

/**
 * PIN sign-in — US-10.3.
 *
 * Every state this screen can be in has a rendering: not enrolled, enrolled but
 * nobody has a PIN yet, the staff list, and a failed lookup. No blank screens
 * (bootstrap brief §6.6).
 */
export default async function PinPage() {
  const result = await listDeviceUsers()

  if (!result.ok) {
    return (
      <div className="space-y-4">
        <ErrorNote>{result.message}</ErrorNote>
        <p className="text-base text-slate-600">
          An Owner or Manager can enrol this device after signing in with their
          email and password.
        </p>
        <Link
          href="/sign-in"
          className="inline-flex min-h-(--spacing-touch) w-full items-center justify-center rounded-lg border-2 border-slate-300 px-4 text-base font-semibold text-slate-900"
        >
          Sign in with email instead
        </Link>
      </div>
    )
  }

  if (result.data.length === 0) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg border-2 border-amber-300 bg-amber-50 px-3 py-2 text-base text-amber-900">
          Nobody at this site has a PIN yet. An Owner can set one for each
          person from Settings.
        </p>
        <Link
          href="/sign-in"
          className="inline-flex min-h-(--spacing-touch) w-full items-center justify-center rounded-lg border-2 border-slate-300 px-4 text-base font-semibold text-slate-900"
        >
          Sign in with email instead
        </Link>
      </div>
    )
  }

  return <PinForm users={result.data} />
}
