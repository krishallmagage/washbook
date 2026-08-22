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
    /*
     * Conventional Commits asks that a subject not be capitalised like a
     * sentence or a title. It does NOT ask for the whole subject to be
     * lowercase — and this domain is full of acronyms (RLS, PIN, VAT, PWA,
     * XLSX, WhatsApp) that a blanket lower-case rule would mangle into
     * unreadable prose.
     *
     * So: forbid the capitalisation styles the convention actually objects to,
     * rather than requiring lower-case throughout. This is the
     * @commitlint/config-conventional default; the original stricter override
     * was mine and was wrong.
     */
    'subject-case': [
      2,
      'never',
      ['sentence-case', 'start-case', 'pascal-case', 'upper-case'],
    ],
    'subject-max-length': [2, 'always', 72],
    /* "The body is not optional for anything other than a trivial chore. It is
       the note I will read in six months." — bootstrap brief §4.2. Warned
       rather than errored so a genuine one-line chore is not blocked. */
    'body-empty': [1, 'never'],
    'body-max-line-length': [0],
  },
}

export default config
