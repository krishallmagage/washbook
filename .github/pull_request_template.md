<!--
Bootstrap brief §4.4 step 8. Fill this in properly — it is the note the product
owner reads in six months.
-->

## What changed

<!-- What this does, why it changed, and what you considered and rejected. -->

## Stories and acceptance criteria covered

<!-- e.g. US-1.1 (AC1, AC2, AC3), BR-11. Name the test that proves each one. -->

| Story / rule | Test that proves it |
| ------------ | ------------------- |
|              |                     |

Refs: #

## How to test it by hand

1.
2.
3.

## Screenshots

<!-- Required for UI work. Small screen, and Sinhala if the screen is translated. -->

## Deliberately left out

<!-- Anything scoped out, and why. Say "nothing" if nothing. -->

---

## Definition of done (CLAUDE.md §7)

- [ ] Every acceptance criterion has a passing automated test named after it
- [ ] Relevant PRD §13 business rules are enforced in the **database**, not only the app
- [ ] RLS policies exist for every new table and are proven by pgTAP tests
- [ ] Works on a small screen, in Sinhala and English, with 44px touch targets
- [ ] Offline behaviour implemented and tested where PRD §11 requires it
- [ ] Loading, empty, error and offline states all exist — no blank screens
- [ ] Errors say what went wrong and what to do; no raw stack traces reach a user
- [ ] `pnpm check` passes locally and CI is green
- [ ] No secret, `.env` file, key, token or large binary in the diff
- [ ] `CLAUDE.md` updated if anything about how we work changed
