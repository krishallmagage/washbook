import Link from 'next/link'
import { redirect } from 'next/navigation'
import { hasPermission } from '@/domain/permissions'
import { getCurrentUser } from '@/server/auth/session'
import { EnrolForm } from './enrol-form'

export default async function DevicesPage() {
  const user = await getCurrentUser()
  if (user === null) redirect('/sign-in')

  // The database refuses this regardless (RLS on `devices`); this check is here
  // so a Supervisor sees a sentence instead of a failed action.
  if (!hasPermission({ role: user.role }, 'enrol_device')) {
    return (
      <main className="mx-auto w-full max-w-md space-y-4 px-5 py-8">
        <h1 className="text-2xl font-semibold text-slate-900">Devices</h1>
        <p
          role="alert"
          className="rounded-lg border-2 border-amber-300 bg-amber-50 px-3 py-2 text-base text-amber-900"
        >
          Only an Owner or Manager can enrol a device. Ask one of them to set
          this phone up.
        </p>
        <Link
          href="/"
          className="inline-flex min-h-(--spacing-touch) items-center text-base font-semibold text-slate-900 underline underline-offset-4"
        >
          Back
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-md space-y-6 px-5 py-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">
          Enrol this device
        </h1>
        <p className="text-base text-slate-600">
          Enrolling lets staff at this site sign in on this phone with a PIN,
          and gives it a letter used in its ticket numbers.
        </p>
      </header>

      <EnrolForm />

      <Link
        href="/"
        className="inline-flex min-h-(--spacing-touch) items-center text-base font-semibold text-slate-900 underline underline-offset-4"
      >
        Back
      </Link>
    </main>
  )
}
