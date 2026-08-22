/**
 * Stub for the `server-only` package under Vitest.
 *
 * `server-only` deliberately throws when imported outside a React Server
 * Component, which is exactly the guard we want in the app and exactly what
 * makes a unit test of a server module impossible. Aliased in vitest.config.ts.
 *
 * This does not weaken the guarantee: the real package is still what ships, and
 * `pnpm assert:bundle` checks the built artefact rather than trusting imports.
 */
export {}
