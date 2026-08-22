/**
 * What every server action returns.
 *
 * Actions return a result rather than throwing, because bootstrap brief §6.7
 * requires that errors say what went wrong and what to do about it — a thrown
 * exception becomes a generic error boundary and a raw stack trace, which is
 * exactly what must not reach a user standing at a gate.
 *
 * `code` is for the UI to branch on; `message` is what a person reads.
 */
export type ActionResult<T = undefined> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly code: string; readonly message: string }

export function success(): ActionResult
export function success<T>(data: T): ActionResult<T>
export function success<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data }
}

export function failure(code: string, message: string): ActionResult<never> {
  return { ok: false, code, message }
}
