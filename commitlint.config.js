/**
 * Conventional Commits, enforced — bootstrap brief §4.2. release-please derives
 * SemVer, tags and the CHANGELOG from this history, so the format is load
 * bearing, not cosmetic.
 */
const config = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
      ],
    ],
    'scope-enum': [
      2,
      'always',
      [
        'intake',
        'pricing',
        'tickets',
        'billing',
        'cash',
        'staff',
        'auth',
        'db',
        'offline',
        'i18n',
        'reports',
        'docker',
        'ci',
        'deps',
        // Repository-wide scaffolding that belongs to no single epic.
        'repo',
      ],
    ],
    'scope-empty': [1, 'never'],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-max-length': [2, 'always', 72],
    /* "The body is not optional for anything other than a trivial chore. It is
       the note I will read in six months." — bootstrap brief §4.2. Warned
       rather than errored so a genuine one-line chore is not blocked. */
    'body-empty': [1, 'never'],
    'body-max-line-length': [0],
  },
}

export default config
