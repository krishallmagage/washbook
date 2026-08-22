import Link from 'next/link'
import { redirect } from 'next/navigation'
import { hasPermission } from '@/domain/permissions'
import { signOut } from '@/server/auth/actions'
import { getCurrentUser } from '@/server/auth/session'

/**
 * The signed-in home screen.
 *
 * Slice 4 replaces this with the intake screen, which is where a supervisor
 * should land. For now it proves the whole chain end to end: a session exists,
 * its claims came through, and the permission matrix reaches the UI.
 */
export default async function HomePage() {
  const user = await getCurrentUser()
  if (user === null) redirect('/sign-in')

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 py-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          WashBook
        </h1>
        <p className="text-base text-slate-600">
          Signed in as{' '}
          <span className="font-medium text-slate-900">{user.fullName}</span>{' '}
          <span className="capitalize">({user.role})</span>
        </p>
        <p className="text-sm text-slate-500">
          {user.method === 'pin'
            ? 'PIN session — signs out after 30 minutes idle.'
            : 'Signed in with email.'}
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">What is next</h2>
        <p className="text-base text-slate-600">
          The intake screen arrives in Slice 4. Until then this screen exists to
          prove the session and its permissions are real.
        </p>
      </section>

      {hasPermission({ role: user.role }, 'enrol_device') ? (
        <Link
          href="/settings/devices"
          className="inline-flex min-h-(--spacing-touch) w-full items-center justify-center rounded-lg border-2 border-slate-300 px-4 text-base font-semibold text-slate-900"
        >
          Enrol a device
        </Link>
      ) : null}

      <form action={signOut} className="mt-auto">
        <button
          type="submit"
          className="inline-flex min-h-(--spacing-touch) w-full items-center justify-center rounded-lg bg-slate-900 px-4 text-base font-semibold text-white"
        >
          Sign out
        </button>
      </form>
    </main>
  )
}
