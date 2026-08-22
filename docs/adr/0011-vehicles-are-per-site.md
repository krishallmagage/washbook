# 11. A vehicle belongs to a site, not to the platform

Date: 2026-08-22 · Status: Accepted

## Context

`vehicles.plate_normalised` is unique per site (PRD §11.2). The same car washed
at two different sites is therefore two rows. The alternative — one global
vehicle identity — would let sites share customer data.

## Decision

Vehicles, customers and their history are scoped to a site. No cross-site
identity, no cross-site lookup.

## Consequences

- Consistent with ADR-0006 and with NFR-10: no cross-site data sharing, ever. A
  site's customer list is its own commercial asset.
- **M3's multi-site consolidated view will double-count vehicles and lifetime
  value** where one car visits two sites of the same owner. Recording it now so
  it is a known consequence rather than a bug report in month eight.
- Deduplication, if ever wanted, is a reporting-layer concern for an owner who
  demonstrably owns both sites — never a default.
