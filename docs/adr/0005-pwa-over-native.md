# 5. A PWA rather than native mobile apps

Date: 2026-08-22 · Status: Accepted

## Context

Users are a supervisor at a gate, washers on entry-level Android phones, and an
owner who checks his phone at 7pm. PRD NFR-05 requires Android Chrome 100+ and
iOS Safari 15+; US-11.4 requires usability on a 3GB-RAM device over 3G.

## Decision

One Next.js application installable as a PWA. No app-store distribution in v1.

## Consequences

- No install friction, and no store review between a bug report and its fix —
  which matters enormously during a pilot (PRD §20).
- Storage-constrained phones are not asked to give up space for an app.
- **Web Bluetooth is unavailable on iOS Safari**, so ESC-POS thermal printing
  (NFR-13) works on Android only; iOS gets the PDF fallback permanently.
- Push notifications on iOS require the PWA be installed to the home screen
  (iOS 16.4+), which constrains the daily-summary channel decision (B-2).
- No background sync guarantees when the browser is closed.
