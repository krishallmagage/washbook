#!/usr/bin/env node
/**
 * One-time GitHub setup — bootstrap brief §3.1 steps 2 to 7.
 *
 *   node scripts/github-bootstrap.mjs            # do it
 *   node scripts/github-bootstrap.mjs --dry-run  # show what it would do
 *
 * Requires `gh auth status` to pass. Creates the repository, milestones,
 * epic labels, and one issue per **M1** user story with its acceptance
 * criteria copied verbatim from docs/PRD.md.
 *
 * Issues are generated from the PRD rather than hand-transcribed, because 29
 * stories retyped by hand is 29 chances to paraphrase an acceptance criterion —
 * and the whole point is that a test can be named after it and still match the
 * contract.
 *
 * Safe to re-run: it skips anything that already exists.
 */

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OWNER = 'krishallmagage'
const REPO = 'washbook'
const SLUG = `${OWNER}/${REPO}`
const DRY = process.argv.includes('--dry-run')

const EPICS = {
  1: ['intake', 'Vehicle intake'],
  2: ['pricing', 'Service catalogue and pricing'],
  3: ['tickets', 'Job ticket lifecycle, bays and queue'],
  4: ['billing', 'Billing, payment and receipts'],
  5: ['cash', 'Cash control and daily close'],
  6: ['customers', 'Customers, vehicles and recall'],
  7: ['packages', 'Packages, plans and prepayment'],
  8: ['staff', 'Staff, attendance and commission'],
  9: ['consumables', 'Consumables'],
  10: ['access', 'Access, audit and administration'],
  11: ['platform', 'Platform behaviour'],
}

const EXTRA_LABELS = [
  ['type:bug', 'd73a4a', 'Something is broken'],
  ['type:chore', 'cfd3d7', 'Tooling, dependencies, CI'],
  ['type:docs', '0075ca', 'Documentation only'],
  ['security', 'b60205', 'Security or tenancy issue — handled first'],
]

const MILESTONES = [
  [
    'M1 — Pilot',
    'Prove the core loop: ticket at the gate, worked, billed, day closed, reported.',
  ],
  [
    'M2 — Launch',
    'Make it sellable and sticky: packages, recall, bays, consumables, corporate.',
  ],
  [
    'M3 — Expansion',
    'Widen the market: VAT invoicing, multi-site, plans, booking.',
  ],
]

function gh(args, { allowFail = false, input } = {}) {
  if (DRY) {
    console.log(`  [dry-run] gh ${args.join(' ')}`)
    return ''
  }
  try {
    return execFileSync('gh', args, {
      encoding: 'utf8',
      stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
      ...(input === undefined ? {} : { input }),
    })
  } catch (error) {
    if (allowFail) return null
    throw new Error(
      `gh ${args.slice(0, 3).join(' ')} failed:\n${error.stderr ?? error.message}`,
    )
  }
}

/**
 * Parse docs/PRD.md §9 into structured stories.
 *
 * Heading shape (stable across all 48 stories):
 *   #### US-1.1 — Fast intake `M` `M1`
 * followed by the story statement, then `- **AC1** ...` bullets.
 */
function parseStories() {
  const prd = readFileSync(join(ROOT, 'docs/PRD.md'), 'utf8')
  const lines = prd.split(/\r?\n/)
  const heading =
    /^####\s+(US-(\d+)\.\d+)\s+—\s+(.+?)\s+`([MSC])`\s+`(M[123])`\s*$/

  const stories = []
  let current = null

  for (const line of lines) {
    const match = heading.exec(line)
    if (match) {
      if (current) stories.push(current)
      const [, id, epicNo, title, priority, release] = match
      current = {
        id,
        epic: Number(epicNo),
        title,
        priority,
        release,
        statement: '',
        criteria: [],
      }
      continue
    }
    if (!current) continue

    // A new section (## or ###) or the epic separator ends the story block.
    if (/^#{1,3}\s/.test(line) || line.trim() === '---') {
      stories.push(current)
      current = null
      continue
    }

    const ac = /^-\s+\*\*(AC\d+)\*\*\s+(.+)$/.exec(line)
    if (ac) {
      current.criteria.push({ id: ac[1], text: ac[2].trim() })
    } else if (line.startsWith('- ') && current.criteria.length > 0) {
      // Continuation of a criterion that wrapped, or an unnumbered bullet.
      current.criteria.push({ id: null, text: line.slice(2).trim() })
    } else if (line.trim() && !current.statement && line.startsWith('As a')) {
      current.statement = line.trim()
    }
  }
  if (current) stories.push(current)
  return stories
}

function issueBody(story) {
  const epic = EPICS[story.epic]
  const criteria = story.criteria
    .map((c) => (c.id ? `- **${c.id}** ${c.text}` : `  - ${c.text}`))
    .join('\n')

  return `> Generated from \`docs/PRD.md\` §9. Acceptance criteria are copied verbatim —
> each one becomes a test named after it, so do not paraphrase them here.

## Story

${story.statement || '_See PRD._'}

## Acceptance criteria

${criteria || '_None stated in the PRD._'}

## Definition of done

See [\`CLAUDE.md\`](../blob/main/CLAUDE.md) §7. In particular:

- [ ] Every acceptance criterion above has a passing test named after it
- [ ] Relevant PRD §13 business rules are enforced in the **database**, not only the app
- [ ] RLS policies exist for every new table, proven by pgTAP
- [ ] Loading, empty, error and offline states all exist
- [ ] \`pnpm check\` passes and CI is green

---

Epic ${story.epic} — ${epic ? epic[1] : 'unknown'} · Priority \`${story.priority}\` · Release \`${story.release}\``
}

function main() {
  console.log(`WashBook GitHub bootstrap${DRY ? ' (dry run)' : ''}\n`)

  if (!DRY) {
    const auth = gh(['auth', 'status'], { allowFail: true })
    if (auth === null) {
      console.error('✖ Not authenticated. Run:  gh auth login\n')
      process.exit(1)
    }
    console.log('✓ gh authenticated')
  }

  // 1 — repository
  const exists = gh(['repo', 'view', SLUG, '--json', 'name'], {
    allowFail: true,
  })
  if (exists === null) {
    console.log(`\nCreating ${SLUG} (private)…`)
    gh([
      'repo',
      'create',
      SLUG,
      '--private',
      '--source=.',
      '--remote=origin',
      '--push',
    ])
    console.log('✓ repository created and pushed')
  } else {
    console.log(`✓ ${SLUG} already exists`)
  }

  gh(['repo', 'edit', SLUG, '--default-branch', 'main'], { allowFail: true })

  // 2 — branch protection. May be rejected on private repos on some plans;
  // report honestly rather than skipping silently (bootstrap brief §3.1.5).
  console.log('\nAttempting branch protection on main…')
  const protectionPayload = JSON.stringify({
    required_pull_request_reviews: { required_approving_review_count: 0 },
    required_status_checks: {
      strict: true,
      contexts: [
        'Typecheck, lint, unit tests',
        'Database tests (pgTAP)',
        'Build',
        'End-to-end',
      ],
    },
    enforce_admins: true,
    restrictions: null,
    allow_force_pushes: false,
    allow_deletions: false,
  })
  const protection = gh(
    [
      'api',
      '--method',
      'PUT',
      `repos/${SLUG}/branches/main/protection`,
      '--input',
      '-',
    ],
    { allowFail: true, input: protectionPayload },
  )
  if (protection === null) {
    console.log(
      '⚠ Branch protection was REJECTED (commonly unavailable for private repos\n' +
        '  on the free plan). The Husky pre-push hook enforces the same rule locally.\n' +
        '  This is reported, not silently skipped.',
    )
  } else {
    console.log('✓ branch protection applied')
  }

  // 3 — milestones
  console.log('\nMilestones…')
  const existingMilestones = JSON.parse(
    gh(['api', `repos/${SLUG}/milestones?state=all`], { allowFail: true }) ||
      '[]',
  )
  const milestoneNumbers = {}
  for (const [title, description] of MILESTONES) {
    const found = existingMilestones.find((m) => m.title === title)
    if (found) {
      milestoneNumbers[title] = found.number
      console.log(`  = ${title}`)
      continue
    }
    const created = gh([
      'api',
      '--method',
      'POST',
      `repos/${SLUG}/milestones`,
      '-f',
      `title=${title}`,
      '-f',
      `description=${description}`,
    ])
    milestoneNumbers[title] = DRY ? 0 : JSON.parse(created).number
    console.log(`  + ${title}`)
  }

  // 4 — labels
  console.log('\nLabels…')
  const labels = [
    ...Object.values(EPICS).map(([slug, name]) => [
      `epic:${slug}`,
      '5319e7',
      name,
    ]),
    ...EXTRA_LABELS,
  ]
  for (const [name, color, description] of labels) {
    const made = gh(
      [
        'label',
        'create',
        name,
        '--repo',
        SLUG,
        '--color',
        color,
        '--description',
        description,
      ],
      { allowFail: true },
    )
    console.log(`  ${made === null ? '=' : '+'} ${name}`)
  }

  // 5 — one issue per M1 story, and only M1 (bootstrap brief §3.1.7)
  const all = parseStories()
  const m1 = all.filter((s) => s.release === 'M1')
  console.log(`\nParsed ${all.length} stories; ${m1.length} are M1.`)

  const existingIssues = JSON.parse(
    gh(
      [
        'issue',
        'list',
        '--repo',
        SLUG,
        '--state',
        'all',
        '--limit',
        '200',
        '--json',
        'title',
      ],
      {
        allowFail: true,
      },
    ) || '[]',
  )
  const existingTitles = new Set(existingIssues.map((i) => i.title))

  for (const story of m1) {
    const title = `${story.id} — ${story.title}`
    if (existingTitles.has(title)) {
      console.log(`  = ${title}`)
      continue
    }
    const epic = EPICS[story.epic]
    gh([
      'issue',
      'create',
      '--repo',
      SLUG,
      '--title',
      title,
      '--body',
      issueBody(story),
      '--label',
      `epic:${epic ? epic[0] : 'platform'}`,
      '--milestone',
      'M1 — Pilot',
    ])
    console.log(
      `  + ${title} (${story.criteria.filter((c) => c.id).length} AC)`,
    )
  }

  console.log('\nDone. M2 and M3 issues are deliberately NOT created yet.')
}

main()
