'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import {
  ErrorNote,
  Label,
  SubmitButton,
  TextInput,
} from '@/components/ui/field'
import { signInWithPassword } from '@/server/auth/actions'
import type { ActionResult } from '@/server/action-result'

/**
 * Owner and Manager sign-in — US-10.1.
 *
 * Staff on a shared device do not come here; they use the PIN screen, which is
 * two taps rather than a typed email at a gate (US-10.3).
 */
export default function SignInPage() {
  const [state, formAction, pending] = useActionState<
    ActionResult | null,
    FormData
  >(signInWithPassword, null)

  return (
    <div className="space-y-5">
      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <TextInput
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            inputMode="email"
            required
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <TextInput
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>

        {state !== null && !state.ok ? (
          <ErrorNote>{state.message}</ErrorNote>
        ) : null}

        <SubmitButton pending={pending}>Sign in</SubmitButton>
      </form>

      <p className="text-center text-base text-slate-600">
        Working on a shared phone?{' '}
        <Link
          href="/pin"
          className="font-semibold text-slate-900 underline underline-offset-4"
        >
          Sign in with your PIN
        </Link>
      </p>
    </div>
  )
}
