/**
 * Placeholder shell. Slice 1 replaces this with the authenticated app; Slice 4
 * makes the intake screen the landing surface for a signed-in supervisor.
 *
 * It exists now so that S0-14 can verify in a real browser that the base path,
 * the root redirect and the stylesheet all resolve under /washbook.
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
        WashBook
      </h1>
      <p className="text-base text-slate-600">
        Foundation is up. The intake screen arrives in Slice 4.
      </p>
      <a
        className="inline-flex min-h-(--spacing-touch) items-center justify-center rounded-lg bg-slate-900 px-4 text-base font-medium text-white"
        href="/washbook/api/health"
      >
        Check service health
      </a>
    </main>
  )
}
