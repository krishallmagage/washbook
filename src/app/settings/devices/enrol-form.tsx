'use client'

import { useActionState } from 'react'
import {
  ErrorNote,
  Label,
  SubmitButton,
  TextInput,
} from '@/components/ui/field'
import { enrolDevice } from '@/server/devices/actions'
import type { ActionResult } from '@/server/action-result'

/**
 * US-10.3 AC3 — enrolment requires an Owner or Manager credential.
 *
 * Enrolling also assigns the device its short code, which prefixes every ticket
 * number it issues (ADR-0007). That is why the code is shown back: a supervisor
 * looking at ticket `B-014` should be able to tell which phone made it.
 */
export function EnrolForm() {
  const [state, formAction, pending] = useActionState<
    ActionResult<string> | null,
    FormData
  >(async (_previous, formData) => enrolDevice(formData), null)

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="label">Device name</Label>
        <TextInput
          id="label"
          name="label"
          required
          maxLength={60}
          placeholder="Gate phone"
        />
        <p className="text-sm text-slate-500">
          Something a person would recognise, like &ldquo;Gate phone&rdquo; or
          &ldquo;Counter tablet&rdquo;.
        </p>
      </div>

      {state !== null && !state.ok ? (
        <ErrorNote>{state.message}</ErrorNote>
      ) : null}

      {state?.ok === true ? (
        <p
          role="status"
          className="rounded-lg border-2 border-green-300 bg-green-50 px-3 py-2 text-base text-green-900"
        >
          Enrolled. This device is now <strong>{state.data}</strong> — its
          tickets will be numbered {state.data}-001, {state.data}-002 and so on.
        </p>
      ) : null}

      <SubmitButton pending={pending}>Enrol this device</SubmitButton>
    </form>
  )
}
