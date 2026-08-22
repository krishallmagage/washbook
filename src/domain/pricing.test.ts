import { describe, expect, it } from 'vitest'
import {
  exceedsDiscountThreshold,
  indexGrid,
  offeredServiceIds,
  overrideNeedsReason,
  resolvePriceCents,
  totalsFor,
  type PriceGrid,
} from './pricing'

const WASH = 'svc-wash'
const DETAIL = 'svc-detail'
const CAR = 'cls-car'
const BIKE = 'cls-bike'

const GRID: PriceGrid = {
  cells: [
    {
      serviceId: WASH,
      vehicleClassId: CAR,
      priceCents: 150000,
      isOffered: true,
    },
    {
      serviceId: WASH,
      vehicleClassId: BIKE,
      priceCents: 50000,
      isOffered: true,
    },
    // PRD §6.1: a full detail is not something you sell for a motorcycle.
    {
      serviceId: DETAIL,
      vehicleClassId: BIKE,
      priceCents: null,
      isOffered: false,
    },
    {
      serviceId: DETAIL,
      vehicleClassId: CAR,
      priceCents: 1200000,
      isOffered: true,
    },
  ],
}

const index = indexGrid(GRID)

describe('US-1.3 — vehicle class drives price', () => {
  it('US-1.3 AC1 — a price resolves from class and service without being typed', () => {
    expect(resolvePriceCents(index, WASH, CAR)).toBe(150000)
    expect(resolvePriceCents(index, WASH, BIKE)).toBe(50000)
  })

  it('US-1.3 AC1 — the same service costs different amounts by class', () => {
    // This is the whole reason a retail POS does not fit a wash (PRD §2.2).
    expect(resolvePriceCents(index, WASH, CAR)).not.toBe(
      resolvePriceCents(index, WASH, BIKE),
    )
  })

  it('US-1.3 AC2 — a service not offered for a class resolves to null', () => {
    expect(resolvePriceCents(index, DETAIL, BIKE)).toBeNull()
  })

  it('US-1.3 AC2 — null means not selectable, never free', () => {
    // A caller treating a missing price as 0 would let a vehicle leave without
    // being charged, which is precisely the leakage this product exists to stop.
    const price = resolvePriceCents(index, DETAIL, BIKE)
    expect(price).not.toBe(0)
  })

  it('US-1.3 AC2 — an unknown combination resolves to null rather than throwing', () => {
    expect(resolvePriceCents(index, 'svc-nope', CAR)).toBeNull()
    expect(resolvePriceCents(index, WASH, 'cls-nope')).toBeNull()
  })

  it('US-1.3 AC2 — only offered services are selectable for a class', () => {
    expect(offeredServiceIds(GRID, BIKE)).toEqual([WASH])
    // Copied before sorting: the return is readonly, and sorting in place
    // would mutate a value the caller is entitled to treat as stable.
    expect([...offeredServiceIds(GRID, CAR)].sort()).toEqual(
      [DETAIL, WASH].sort(),
    )
  })
})

describe('US-1.3 AC3 — running total', () => {
  it('sums the chosen services', () => {
    const totals = totalsFor([
      { serviceId: WASH, listPriceCents: 150000 },
      { serviceId: DETAIL, listPriceCents: 1200000 },
    ])
    expect(totals.listTotalCents).toBe(1350000)
    expect(totals.finalTotalCents).toBe(1350000)
    expect(totals.discountCents).toBe(0)
  })

  it('an empty ticket totals zero rather than dividing by zero', () => {
    expect(totalsFor([])).toEqual({
      listTotalCents: 0,
      finalTotalCents: 0,
      discountCents: 0,
      discountPct: 0,
    })
  })

  it('BR-03 — records list and final separately, and the difference is discount', () => {
    const totals = totalsFor([
      { serviceId: WASH, listPriceCents: 150000, finalPriceCents: 120000 },
      { serviceId: DETAIL, listPriceCents: 1200000 },
    ])
    expect(totals.listTotalCents).toBe(1350000)
    expect(totals.finalTotalCents).toBe(1320000)
    expect(totals.discountCents).toBe(30000)
  })

  it('stays in integer cents — no floating point creeps in', () => {
    // Three odd amounts that would drift if this were done in rupees as floats.
    const totals = totalsFor([
      { serviceId: 'a', listPriceCents: 33333 },
      { serviceId: 'b', listPriceCents: 33333 },
      { serviceId: 'c', listPriceCents: 33334 },
    ])
    expect(totals.listTotalCents).toBe(100000)
    expect(Number.isInteger(totals.listTotalCents)).toBe(true)
  })
})

describe('BR-02 — an override must carry a reason', () => {
  it('a line at list price is not an override', () => {
    expect(
      overrideNeedsReason({ serviceId: WASH, listPriceCents: 150000 }),
    ).toBe(false)
  })

  it('a final price equal to the list price is not an override', () => {
    expect(
      overrideNeedsReason({
        serviceId: WASH,
        listPriceCents: 150000,
        finalPriceCents: 150000,
      }),
    ).toBe(false)
  })

  it('a changed price with no reason is refused', () => {
    expect(
      overrideNeedsReason({
        serviceId: WASH,
        listPriceCents: 150000,
        finalPriceCents: 120000,
      }),
    ).toBe(true)
  })

  it('whitespace is not a reason', () => {
    expect(
      overrideNeedsReason({
        serviceId: WASH,
        listPriceCents: 150000,
        finalPriceCents: 120000,
        overrideReason: '   ',
      }),
    ).toBe(true)
  })

  it('a real reason satisfies it', () => {
    expect(
      overrideNeedsReason({
        serviceId: WASH,
        listPriceCents: 150000,
        finalPriceCents: 120000,
        overrideReason: 'Regular customer',
      }),
    ).toBe(false)
  })

  it('a price INCREASE is an override too', () => {
    // BR-02 says any manual price entry is an override. Charging more than the
    // list is exactly as much of an accountability question as charging less.
    expect(
      overrideNeedsReason({
        serviceId: WASH,
        listPriceCents: 150000,
        finalPriceCents: 200000,
      }),
    ).toBe(true)
  })
})

describe('US-1.4 AC4 — discount threshold flagging', () => {
  it('flags a discount beyond the site threshold', () => {
    // Journey 10.4: "discount of 22% on ticket #0389 by Sanjeewa".
    const totals = totalsFor([
      { serviceId: WASH, listPriceCents: 100000, finalPriceCents: 78000 },
    ])
    expect(totals.discountPct).toBe(22)
    expect(exceedsDiscountThreshold(totals, 15)).toBe(true)
  })

  it('does not flag a discount at or under the threshold', () => {
    const totals = totalsFor([
      { serviceId: WASH, listPriceCents: 100000, finalPriceCents: 85000 },
    ])
    expect(totals.discountPct).toBe(15)
    expect(exceedsDiscountThreshold(totals, 15)).toBe(false)
  })

  it('measures against the ticket total, not the line', () => {
    // docs/PLAN-M1.md §1.4.3 — the PRD does not say which, and this is the
    // reading journey 10.4 implies. A large discount on one cheap line should
    // not flag a big ticket.
    const totals = totalsFor([
      { serviceId: WASH, listPriceCents: 10000, finalPriceCents: 0 },
      { serviceId: DETAIL, listPriceCents: 1200000 },
    ])
    expect(totals.discountPct).toBeLessThan(1)
    expect(exceedsDiscountThreshold(totals, 15)).toBe(false)
  })
})
