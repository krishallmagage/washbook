'use client'

import { useActionState, useState } from 'react'
import { ErrorNote, Label, SubmitButton } from '@/components/ui/field'
import { signInWithPin } from '@/server/auth/actions'
import type { ActionResult } from '@/server/action-result'

export interface DeviceUser {
  readonly id: string
  readonly fullName: string
  readonly role: string
}

/**
 * PIN entry — US-10.3 AC1.
 *
 * Two interactions: tap your name, tap your PIN. P3 (Kasun, the washer) has
 * limited English literacy and wet hands, so there is no typing and every
 * target is at least 44px (NFR-12).
 */
export function PinForm({ users }: Readonly<{ users: readonly DeviceUser[] }>) {
  const [state, formAction, pending] = useActionState<
    ActionResult | null,
    FormData
  >(signInWithPin, null)
  const [selected, setSelected] = useState<string | null>(
    users.length === 1 ? (users[0]?.id ?? null) : null,
  )
  const [pin, setPin] = useState('')

  const chosen = users.find((u) => u.id === selected)

  if (chosen === undefined) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Who are you?</h2>
        <ul className="space-y-2">
          {users.map((user) => (
            <li key={user.id}>
              <button
                type="button"
                onClick={() => {
                  setSelected(user.id)
                }}
                className="flex min-h-(--spacing-touch) w-full items-center justify-between rounded-lg border-2 border-slate-300 bg-white px-4 py-2 text-left text-base font-medium text-slate-900"
              >
                <span>{user.fullName}</span>
                <span className="text-sm text-slate-500 capitalize">
                  {user.role}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    )
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="userId" value={chosen.id} />
      <input type="hidden" name="pin" value={pin} />

      <div className="flex items-center justify-between">
        <p className="text-lg font-semibold text-slate-900">
          {chosen.fullName}
        </p>
        {users.length > 1 ? (
          <button
            type="button"
            onClick={() => {
              setSelected(null)
              setPin('')
            }}
            className="min-h-(--spacing-touch) px-2 text-base font-medium text-slate-600 underline underline-offset-4"
          >
            Not you?
          </button>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="pin-display">PIN</Label>
        <div
          id="pin-display"
          aria-live="polite"
          className="flex min-h-(--spacing-touch) items-center gap-2 rounded-lg border-2 border-slate-300 bg-white px-4 text-2xl tracking-[0.4em] text-slate-900"
        >
          {pin.length === 0 ? (
            <span className="text-base tracking-normal text-slate-400">
              Enter 4 to 6 digits
            </span>
          ) : (
            '•'.repeat(pin.length)
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <PinKey
            key={digit}
            label={digit}
            onPress={() => {
              setPin((current) =>
                current.length < 6 ? current + digit : current,
              )
            }}
          />
        ))}
        <PinKey
          label="Clear"
          onPress={() => {
            setPin('')
          }}
        />
        <PinKey
          label="0"
          onPress={() => {
            setPin((current) => (current.length < 6 ? current + '0' : current))
          }}
        />
        <PinKey
          label="⌫"
          onPress={() => {
            setPin((current) => current.slice(0, -1))
          }}
        />
      </div>

      {state !== null && !state.ok ? (
        <ErrorNote>{state.message}</ErrorNote>
      ) : null}

      <SubmitButton pending={pending || pin.length < 4}>Sign in</SubmitButton>
    </form>
  )
}

function PinKey({
  label,
  onPress,
}: Readonly<{ label: string; onPress: () => void }>) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="min-h-14 rounded-lg border-2 border-slate-300 bg-white text-xl font-semibold text-slate-900 active:bg-slate-100"
    >
      {label}
    </button>
  )
}
