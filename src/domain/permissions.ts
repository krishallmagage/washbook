/**
 * PRD §13.1 permission matrix — the client-side mirror.
 *
 * The database is the enforcement point (ADR-0006): `fn_has_permission()` is
 * what actually stops an action, and it is proven by pgTAP. This module exists
 * so the UI can hide a control the server would refuse anyway — a Cashier
 * should not be shown a Void button that errors when tapped.
 *
 * The two must not drift. `permissions.test.ts` asserts this table against the
 * same expectations `supabase/tests/permission_matrix.sql` asserts against the
 * SQL, so a change to one without the other fails.
 *
 * Nothing here is a security boundary. Treat it as presentation.
 */

const SITE_ROLES = [
  'owner',
  'manager',
  'cashier',
  'supervisor',
  'staff',
  'readonly',
] as const

export type SiteRole = (typeof SITE_ROLES)[number]

const PERMISSION_ACTIONS = [
  'create_ticket',
  'override_price',
  'assign_staff',
  'change_own_job_state',
  'bill_ticket',
  'void_ticket',
  'record_petty_cash',
  'close_day',
  'edit_price_list',
  'manage_users',
  'set_thresholds',
  'view_reports',
  'view_own_commission',
  'view_audit_log',
  'enrol_device',
] as const

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number]

/**
 * Roles granted each action, straight from PRD §13.1.
 *
 * `override_price` for `supervisor` is deliberately absent: it is a per-site
 * setting defaulting to off (§13.1 footnote), so it cannot be expressed as a
 * static row. `hasPermission` takes the site setting as an argument instead.
 */
const MATRIX: Readonly<Record<PermissionAction, readonly SiteRole[]>> = {
  create_ticket: ['owner', 'manager', 'cashier', 'supervisor'],
  override_price: ['owner', 'manager'],
  assign_staff: ['owner', 'manager', 'supervisor'],
  change_own_job_state: ['owner', 'manager', 'supervisor', 'staff'],
  bill_ticket: ['owner', 'manager', 'cashier', 'supervisor'],
  void_ticket: ['owner', 'manager'],
  record_petty_cash: ['owner', 'manager', 'cashier'],
  close_day: ['owner', 'manager', 'cashier'],
  edit_price_list: ['owner'],
  manage_users: ['owner'],
  set_thresholds: ['owner'],
  view_reports: ['owner', 'manager', 'readonly'],
  view_own_commission: ['owner', 'manager', 'cashier', 'supervisor', 'staff'],
  view_audit_log: ['owner', 'manager'],
  enrol_device: ['owner', 'manager'],
}

export interface PermissionContext {
  readonly role: SiteRole | null
  /** PRD §13.1 footnote — per-site, default off. */
  readonly supervisorCanOverride?: boolean
}

export function isSiteRole(value: unknown): value is SiteRole {
  return typeof value === 'string' && SITE_ROLES.includes(value as SiteRole)
}

export function hasPermission(
  context: PermissionContext,
  action: PermissionAction,
): boolean {
  const { role } = context
  // Deny by default. An unauthenticated or unrecognised caller gets nothing,
  // which is the same posture the RLS policies take.
  if (role === null) return false

  if (action === 'override_price' && role === 'supervisor') {
    return context.supervisorCanOverride === true
  }

  return MATRIX[action].includes(role)
}

/** Every action a role holds, sorted — used by the drift test. */
export function permittedActions(
  context: PermissionContext,
): readonly PermissionAction[] {
  return PERMISSION_ACTIONS.filter((action) =>
    hasPermission(context, action),
  ).sort((a, b) => a.localeCompare(b))
}
