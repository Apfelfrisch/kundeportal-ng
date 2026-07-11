import { describe, expect, it } from 'vitest'

import {
  QUARTER_HOUR_MS,
  buildQuarterHourSeries,
  chartDateSearchSchema,
  chartDomain,
  dayBoundaries,
  dayStartMs,
  formatCtValue,
  formatDayHeading,
  formatKwhValue,
  formatSliceLabel,
  formatTimeTick,
  formatUhrzeit,
  groupByDay,
  nextDayStartMs,
  nowWithin,
  parseApiDateTime,
  sumBy,
  timeTicks,
} from './charts'

describe('chartDateSearchSchema', () => {
  it('accepts a valid ISO date', () => {
    expect(chartDateSearchSchema.parse({ date: '2025-06-10' })).toEqual({
      date: '2025-06-10',
    })
  })

  it('drops invalid dates instead of failing', () => {
    expect(chartDateSearchSchema.parse({ date: 'not-a-date' })).toEqual({
      date: undefined,
    })
  })

  it('allows a missing date', () => {
    expect(chartDateSearchSchema.parse({})).toEqual({ date: undefined })
  })
})

describe('parseApiDateTime / dayStartMs', () => {
  it('interprets API timestamps as local time', () => {
    expect(parseApiDateTime('2025-06-10T00:15:00')).toBe(
      new Date(2025, 5, 10, 0, 15).getTime(),
    )
  })

  it('interprets plain dates as local midnight', () => {
    expect(dayStartMs('2025-06-10')).toBe(new Date(2025, 5, 10).getTime())
  })

  it('computes the exclusive end of a day', () => {
    expect(nextDayStartMs('2025-06-10')).toBe(new Date(2025, 5, 11).getTime())
  })
})

describe('chartDomain', () => {
  it('spans from local midnight to the last quarter-hour slot', () => {
    const [start, end] = chartDomain('2025-06-09', '2025-06-11')
    expect(start).toBe(new Date(2025, 5, 9).getTime())
    expect(end).toBe(new Date(2025, 5, 11, 23, 45).getTime())
  })
})

describe('timeTicks', () => {
  it('produces a tick every six hours across the window', () => {
    const ticks = timeTicks('2025-06-09', '2025-06-11')
    expect(ticks).toHaveLength(12)
    expect(ticks[0]).toBe(new Date(2025, 5, 9).getTime())
    expect(ticks[1]).toBe(new Date(2025, 5, 9, 6).getTime())
    expect(ticks[11]).toBe(new Date(2025, 5, 11, 18).getTime())
  })

  it('supports a custom step', () => {
    expect(timeTicks('2025-06-09', '2025-06-09', 12)).toHaveLength(2)
  })
})

describe('formatUhrzeit / formatTimeTick', () => {
  it('formats HH:mm', () => {
    expect(formatUhrzeit(new Date(2025, 5, 10, 9, 5).getTime())).toBe('09:05')
  })

  it('labels midnight ticks with the date', () => {
    expect(formatTimeTick(new Date(2025, 5, 10).getTime())).toBe('10.06.')
  })

  it('labels intraday ticks with the time', () => {
    expect(formatTimeTick(new Date(2025, 5, 10, 18).getTime())).toBe('18:00')
  })
})

describe('formatSliceLabel', () => {
  it('shows the date and the 15-minute range', () => {
    expect(formatSliceLabel(new Date(2025, 5, 10, 12).getTime())).toBe(
      '10.06.2025, 12:00 – 12:15 Uhr',
    )
  })

  it('accepts an explicit end', () => {
    const start = new Date(2025, 5, 10, 23, 45).getTime()
    expect(formatSliceLabel(start, start + QUARTER_HOUR_MS)).toBe(
      '10.06.2025, 23:45 – 00:00 Uhr',
    )
  })
})

describe('formatDayHeading', () => {
  it('formats weekday and long date in German', () => {
    expect(formatDayHeading('2025-06-10')).toBe('Dienstag, 10. Juni 2025')
  })
})

describe('formatCtValue / formatKwhValue', () => {
  it('keeps up to four fraction digits for prices', () => {
    expect(formatCtValue(8.213)).toBe('8,213')
    expect(formatCtValue(2)).toBe('2,00')
  })

  it('uses exactly three fraction digits for usage', () => {
    expect(formatKwhValue(1.5)).toBe('1,500')
    expect(formatKwhValue(1234.5678)).toBe('1.234,568')
  })
})

describe('buildQuarterHourSeries', () => {
  const entries = [
    { starts_at: '2025-06-09T00:00:00', price: 2 },
    { starts_at: '2025-06-09T00:30:00', price: 8.213 },
  ]

  const series = buildQuarterHourSeries({
    from: '2025-06-09',
    until: '2025-06-09',
    entries,
    getStart: (entry) => entry.starts_at,
    getValues: (entry) => ({ price: entry.price }),
    keys: ['price'],
  })

  it('creates one slot per quarter hour of the window', () => {
    expect(series).toHaveLength(96)
    expect(series[0]?.ts).toBe(new Date(2025, 5, 9).getTime())
    expect(series[95]?.ts).toBe(new Date(2025, 5, 9, 23, 45).getTime())
  })

  it('maps entry values onto their slot', () => {
    expect(series[0]?.price).toBe(2)
    expect(series[2]?.price).toBe(8.213)
  })

  it('fills missing slots with null gaps', () => {
    expect(series[1]?.price).toBeNull()
    expect(series[95]?.price).toBeNull()
  })

  it('supports multiple series keys', () => {
    const multi = buildQuarterHourSeries({
      from: '2025-06-09',
      until: '2025-06-09',
      entries: [{ from: '2025-06-09T00:00:00', usage: 1.5, total: 30 }],
      getStart: (entry) => entry.from,
      getValues: (entry) => ({ usage: entry.usage, total: entry.total }),
      keys: ['usage', 'total'],
    })
    expect(multi[0]).toEqual({
      ts: new Date(2025, 5, 9).getTime(),
      usage: 1.5,
      total: 30,
    })
    expect(multi[1]).toEqual({
      ts: new Date(2025, 5, 9, 0, 15).getTime(),
      usage: null,
      total: null,
    })
  })
})

describe('dayBoundaries', () => {
  it('returns the inner midnights of a three-day window', () => {
    expect(dayBoundaries('2025-06-09', '2025-06-11')).toEqual([
      new Date(2025, 5, 10).getTime(),
      new Date(2025, 5, 11).getTime(),
    ])
  })

  it('is empty for a single day', () => {
    expect(dayBoundaries('2025-06-09', '2025-06-09')).toEqual([])
  })
})

describe('nowWithin', () => {
  const domain = chartDomain('2025-06-09', '2025-06-11')

  it('returns the timestamp when inside the window', () => {
    const now = new Date(2025, 5, 10, 12).getTime()
    expect(nowWithin(domain, now)).toBe(now)
  })

  it('returns null outside the window', () => {
    expect(nowWithin(domain, new Date(2025, 5, 12).getTime())).toBeNull()
  })
})

describe('groupByDay', () => {
  it('groups consecutive entries by their calendar day', () => {
    const grouped = groupByDay(
      [
        { from: '2025-06-09T23:45:00' },
        { from: '2025-06-10T00:00:00' },
        { from: '2025-06-10T00:15:00' },
      ],
      (entry) => entry.from,
    )
    expect(grouped).toHaveLength(2)
    expect(grouped[0]?.[0]).toBe('2025-06-09')
    expect(grouped[0]?.[1]).toHaveLength(1)
    expect(grouped[1]?.[0]).toBe('2025-06-10')
    expect(grouped[1]?.[1]).toHaveLength(2)
  })

  it('returns an empty list for no entries', () => {
    expect(groupByDay([], () => '')).toEqual([])
  })
})

describe('sumBy', () => {
  it('sums a derived value', () => {
    expect(
      sumBy(
        [
          { usage: 1.5, price: 10 },
          { usage: 0.5, price: 20 },
        ],
        (entry) => entry.usage * entry.price,
      ),
    ).toBe(25)
  })
})
