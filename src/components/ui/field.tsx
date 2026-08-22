/**
 * Shared form primitives.
 *
 * NFR-12 is a product requirement, not styling: 16px minimum text, 44px
 * minimum touch targets, and contrast that survives Sri Lankan daylight on a
 * cheap screen. Centralised so no screen can quietly ship a 32px button.
 */

export function Label({
  htmlFor,
  children,
}: Readonly<{ htmlFor: string; children: React.ReactNode }>) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-base font-medium text-slate-800"
    >
      {children}
    </label>
  )
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="min-h-(--spacing-touch) w-full rounded-lg border-2 border-slate-300 bg-white px-3 text-base text-slate-900 outline-none focus:border-slate-900"
    />
  )
}

export function SubmitButton({
  pending,
  children,
}: Readonly<{ pending: boolean; children: React.ReactNode }>) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-(--spacing-touch) w-full items-center justify-center rounded-lg bg-slate-900 px-4 text-base font-semibold text-white disabled:opacity-60"
    >
      {pending ? 'Working…' : children}
    </button>
  )
}

/**
 * Errors say what went wrong and what to do about it (bootstrap brief §6.7).
 * `role="alert"` so a screen reader announces it without the user hunting.
 */
export function ErrorNote({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <p
      role="alert"
      className="rounded-lg border-2 border-red-300 bg-red-50 px-3 py-2 text-base text-red-900"
    >
      {children}
    </p>
  )
}
