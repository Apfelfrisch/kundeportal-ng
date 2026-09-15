import type { MarketPrice } from '@/api/types'

import { hourRange, priceOverview, priceTicks } from './prices'

function quarterHours(day: string, hourly: Array<number>, offsets: Array<number> = [0, 0, 0, 0]): Array<MarketPrice> {
  const prices: Array<MarketPrice> = []
  hourly.forEach((value, hour) => {
    ;[0, 15, 30, 45].forEach((minute, index) => {
      const hh = String(hour).padStart(2, '0')
      const mm = String(minute).padStart(2, '0')
      prices.push({
        starts_at: `${day}T${hh}:${mm}:00`,
        ends_at: `${day}T${hh}:${String(minute + 15).padStart(2, '0')}:00`,
        cent_per_kwh: value + (offsets[index] ?? 0),
      })
    })
  })
  return prices
}

const now = new Date(2026, 8, 9, 14, 20)

describe('priceOverview', () => {
  it('averages the quarter hours of today per hour and adds the surcharge', () => {
    const hourly = Array.from({ length: 24 }, (_, hour) => hour)
    const overview = priceOverview(quarterHours('2026-09-09', hourly), 10, now)

    expect(overview.hourly).toHaveLength(24)
    expect(overview.hourly[0]).toBe(10)
    expect(overview.hourly[23]).toBe(33)
    expect(overview.currentHour).toBe(14)
    expect(overview.cheapestHour).toBe(0)
    expect(overview.average).toBe(21.5)
  })

  it('takes the current quarter hour, its label and the day range', () => {
    const hourly = Array(24).fill(20)
    const overview = priceOverview(quarterHours('2026-09-09', hourly, [0, 2, 4, 6]), 0, now)

    // 14:20 lies in the 14:15 slot, which carries offset +2.
    expect(overview.current).toBe(22)
    expect(overview.slotLabel).toBe('14:15–14:30 Uhr')
    expect(overview.min).toBe(20)
    expect(overview.max).toBe(26)
    expect(overview.fraction).toBeCloseTo(2 / 6)
  })

  it('labels the last quarter of an hour across the hour boundary', () => {
    const overview = priceOverview(quarterHours('2026-09-09', Array(24).fill(20)), 0, new Date(2026, 8, 9, 14, 50))
    expect(overview.slotLabel).toBe('14:45–15:00 Uhr')
  })

  it('ignores the neighbouring days of the window', () => {
    const prices = [
      ...quarterHours('2026-09-08', Array(24).fill(1)),
      ...quarterHours('2026-09-10', Array(24).fill(99)),
    ]
    const overview = priceOverview(prices, 0, now)

    expect(overview.current).toBeNull()
    expect(overview.slotLabel).toBeNull()
    expect(overview.average).toBeNull()
    expect(overview.min).toBeNull()
    expect(overview.fraction).toBeNull()
    expect(overview.cheapestHour).toBeNull()
    expect(overview.rating).toBeNull()
  })

  it('rates the current price against the day average', () => {
    const cheapDay = Array(24).fill(30)
    cheapDay[14] = 20
    expect(priceOverview(quarterHours('2026-09-09', cheapDay), 0, now).rating).toBe('cheap')

    const expensiveDay = Array(24).fill(20)
    expensiveDay[14] = 30
    expect(priceOverview(quarterHours('2026-09-09', expensiveDay), 0, now).rating).toBe('expensive')

    expect(priceOverview(quarterHours('2026-09-09', Array(24).fill(25)), 0, now).rating).toBeNull()
  })

  it('puts a flat day in the middle of the gauge', () => {
    expect(priceOverview(quarterHours('2026-09-09', Array(24).fill(25)), 0, now).fraction).toBe(0.5)
  })

  it('handles partial days', () => {
    const prices = quarterHours('2026-09-09', [5, 4])
    const overview = priceOverview(prices, 0, now)

    expect(overview.hourly.filter((value) => value !== null)).toHaveLength(2)
    expect(overview.cheapestHour).toBe(1)
    expect(overview.current).toBeNull()
  })
})

describe('hourRange', () => {
  it('formats the hour window', () => {
    expect(hourRange(14)).toBe('14–15 Uhr')
  })
})

describe('priceTicks', () => {
  it('rundet auf Stufen 1, 2 oder 5 mal Zehnerpotenz und endet unter dem Maximum', () => {
    expect(priceTicks(32)).toEqual([0, 10, 20, 30])
    expect(priceTicks(40.5)).toEqual([0, 20, 40])
    expect(priceTicks(40)).toEqual([0, 20, 40])
    expect(priceTicks(0.28)).toEqual([0, 0.1, 0.2])
    expect(priceTicks(9)).toEqual([0, 5])
  })

  it('liefert nur die Nulllinie ohne positive Werte', () => {
    expect(priceTicks(0)).toEqual([0])
  })
})
