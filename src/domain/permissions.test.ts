import { describe, expect, it } from 'vitest'
import {
  hasPermission,
  isSiteRole,
  permittedActions,
  type PermissionAction,
  type SiteRole,
} from './permissions'

/**
 * PRD §13.1, cell by cell.
 *
 * These expectations are the SAME ones asserted against the database in
 * `supabase/tests/permission_matrix.sql`. Keeping them identical is what stops
 * the UI mirror drifting from the enforcement point — if someone changes the
 * SQL without changing this table, the two suites disagree and one fails.
 */

const EXPECTED: Readonly<Record<string, readonly PermissionAction[]>> = {
  owner: [
    'assign_staff',
    'bill_ticket',
    'change_own_job_state',
    'close_day',
    'create_ticket',
    'edit_price_list',
    'enrol_device',
    'manage_users',
    'override_price',
    'record_petty_cash',
    'set_thresholds',
    'view_audit_log',
    'view_own_commission',
    'view_reports',
    'void_ticket',
  ],
  manager: [
    'assign_staff',
    'bill_ticket',
    'change_own_job_state',
    'close_day',
    'create_ticket',
    'enrol_device',
    'override_price',
    'record_petty_cash',
    'view_audit_log',
    'view_own_commission',
    'view_reports',
    'void_ticket',
  ],
  cashier: [
    'bill_ticket',
    'close_day',
    'create_ticket',
    'record_petty_cash',
    'view_own_commission',
  ],
  supervisor: [
    'assign_staff',
    'bill_ticket',
    'change_own_job_state',
    'create_ticket',
    'view_own_commission',
  ],
  staff: ['change_own_job_state', 'view_own_commission'],
  readonly: ['view_reports'],
}

describe('PRD §13.1 permission matrix', () => {
  for (const [role, expected] of Object.entries(EXPECTED)) {
    it(`§13.1 — ${role} holds exactly its stated permissions`, () => {
      // Comparing the COMPLETE set, so an accidentally granted permission
      // fails as loudly as a missing one.
      expect(permittedActions({ role: role as SiteRole })).toEqual(expected)
    })
  }

  it('§13.1 footnote — supervisor cannot override price by default', () => {
    expect(hasPermission({ role: 'supervisor' }, 'override_price')).toBe(false)
  })

  it('§13.1 footnote — supervisor can override price where the site enables it', () => {
    expect(
      hasPermission(
        { role: 'supervisor', supervisorCanOverride: true },
        'override_price',
      ),
    ).toBe(true)
  })

  it('§13.1 footnote — the site setting does not grant anything else', () => {
    expect(
      permittedActions({ role: 'supervisor', supervisorCanOverride: true }),
    ).toEqual([
      'assign_staff',
      'bill_ticket',
      'change_own_job_state',
      'create_ticket',
      'override_price',
      'view_own_commission',
    ])
  })

  it('§13.1 footnote — the site setting cannot promote a Cashier', () => {
    // The flag is scoped to supervisors. A site enabling it must not
    // accidentally hand discounting to whoever is on the till.
    expect(
      hasPermission(
        { role: 'cashier', supervisorCanOverride: true },
        'override_price',
      ),
    ).toBe(false)
  })

  it('denies everything when there is no role — deny by default', () => {
    expect(permittedActions({ role: null })).toEqual([])
  })

  it('US-10.1 AC3 — only Owner may edit the price list, users or thresholds', () => {
    const ownerOnly: PermissionAction[] = [
      'edit_price_list',
      'manage_users',
      'set_thresholds',
    ]
    for (const action of ownerOnly) {
      expect(hasPermission({ role: 'owner' }, action)).toBe(true)
      for (const role of [
        'manager',
        'cashier',
        'supervisor',
        'staff',
        'readonly',
      ] as const) {
        expect(hasPermission({ role }, action)).toBe(false)
      }
    }
  })

  it('BR-12 context — only Owner and Manager may void a ticket', () => {
    expect(hasPermission({ role: 'owner' }, 'void_ticket')).toBe(true)
    expect(hasPermission({ role: 'manager' }, 'void_ticket')).toBe(true)
    expect(hasPermission({ role: 'supervisor' }, 'void_ticket')).toBe(false)
    expect(hasPermission({ role: 'cashier' }, 'void_ticket')).toBe(false)
  })
})

describe('isSiteRole', () => {
  it('accepts every role in the PRD', () => {
    for (const role of Object.keys(EXPECTED)) {
      expect(isSiteRole(role)).toBe(true)
    }
  })

  it('rejects anything else, so a malformed token yields no role', () => {
    for (const value of ['admin', 'OWNER', '', null, undefined, 7, {}]) {
      expect(isSiteRole(value)).toBe(false)
    }
  })
})
