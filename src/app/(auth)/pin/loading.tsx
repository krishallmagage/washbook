export default function PinLoading() {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      <p className="text-base text-slate-600">Loading the staff list…</p>
      <div className="h-12 animate-pulse rounded-lg bg-slate-200" />
      <div className="h-12 animate-pulse rounded-lg bg-slate-200" />
      <div className="h-12 animate-pulse rounded-lg bg-slate-200" />
    </div>
  )
}
