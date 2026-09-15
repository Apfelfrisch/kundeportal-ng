import type { UsageBucket } from '@/api/types'

import {
  axisLabels,
  bucketLabel,
  costSplit,
  invoicedNote,
  niceMax,
  periodOptions,
  periodTitle,
  smoothPath,
  stackedSegments,
  wholePercents,
  tooltipPrice,
  usageNote,
} from './usage'

function bucket(from: string, overrides: Partial<UsageBucket> = {}): UsageBucket {
  return {
    from,
    until: from,
    has_data: true,
    usage_kwh: 10,
    unbilled_kwh: 0,
    cost_ct: 300,
    unbilled_ct: 0,
    legal_ct: 100,
    supplier_ct: 50,
    stock_exchange_ct: 150,
    legal_base_ct: 0,
    supplier_base_ct: 0,
    average_ct_kwh: 30,
    price_ct_kwh: 30,
    ...overrides,
  }
}

describe('periodOptions', () => {
  it('lists every day of the span', () => {
    const options = periodOptions('day', { from: '2025-06-29', until: '2025-07-02' })
    expect(options.map((option) => option.date)).toEqual(['2025-06-29', '2025-06-30', '2025-07-01', '2025-07-02'])
    expect(options[0]?.label).toBe('29. Jun')
  })

  it('limits days to the month of the shown day, clamped to the span', () => {
    const june = periodOptions('day', { from: '2025-05-20', until: '2025-07-02' }, '2025-06-10')
    expect(june).toHaveLength(30)
    expect(june[0]?.date).toBe('2025-06-01')
    expect(june[29]?.date).toBe('2025-06-30')
    expect(periodOptions('day', { from: '2025-05-20', until: '2025-07-02' }, '2025-07-01').map((option) => option.date)).toEqual([
      '2025-07-01',
      '2025-07-02',
    ])
    expect(periodOptions('day', { from: '2025-05-20', until: '2025-07-02' }, '2025-08-01')).toEqual([])
  })

  it('lists months by their first day and adds the year across years', () => {
    expect(periodOptions('month', { from: '2025-04-12', until: '2025-06-03' })).toEqual([
      { date: '2025-04-01', label: 'Apr' },
      { date: '2025-05-01', label: 'Mai' },
      { date: '2025-06-01', label: 'Jun' },
    ])
    expect(periodOptions('month', { from: '2024-11-12', until: '2025-01-03' }).map((option) => option.label)).toEqual([
      'Nov 24',
      'Dez 24',
      'Jan 25',
    ])
  })

  it('lists years and nothing without a span', () => {
    expect(periodOptions('year', { from: '2024-11-12', until: '2025-01-03' })).toEqual([
      { date: '2024-01-01', label: '2024' },
      { date: '2025-01-01', label: '2025' },
    ])
    expect(periodOptions('month', null)).toEqual([])
  })
})

describe('labels', () => {
  it('titles the period in German', () => {
    expect(periodTitle('day', '2025-06-10')).toBe('10. Juni 2025')
    expect(periodTitle('month', '2025-06-01')).toBe('Juni 2025')
    expect(periodTitle('year', '2025-01-01')).toBe('2025')
  })

  it('labels a bucket by its resolution', () => {
    expect(bucketLabel('day', bucket('2025-06-10T13:00:00'))).toBe('13–14 Uhr')
    expect(bucketLabel('month', bucket('2025-06-10T00:00:00'))).toBe('10. Jun')
    expect(bucketLabel('year', bucket('2025-06-01T00:00:00'))).toBe('Juni')
  })

  it('picks a few axis labels', () => {
    const hours = Array.from({ length: 24 }, (_, hour) => bucket(`2025-06-10T${String(hour).padStart(2, '0')}:00:00`))
    expect(axisLabels('day', hours)).toEqual([
      { index: 0, label: '0 Uhr' },
      { index: 6, label: '6' },
      { index: 12, label: '12' },
      { index: 18, label: '18' },
    ])
    const days = Array.from({ length: 30 }, (_, day) => bucket(`2025-06-${String(day + 1).padStart(2, '0')}T00:00:00`))
    expect(axisLabels('month', days).map((label) => label.label)).toEqual(['5. Jun', '15. Jun', '25. Jun'])
  })
})

describe('smoothPath', () => {
  it('returns an empty path for fewer than two points', () => {
    expect(smoothPath([])).toBe('')
    expect(smoothPath([{ x: 0, y: 0 }])).toBe('')
  })

  it('starts at the first point and ends with a curve to the last', () => {
    const path = smoothPath([
      { x: 0, y: 10 },
      { x: 10, y: 0 },
      { x: 20, y: 10 },
    ])
    expect(path.startsWith('M0,10 C')).toBe(true)
    expect(path.endsWith(' 20,10')).toBe(true)
    expect(path.split('C')).toHaveLength(3)
  })

  it('does not overshoot at a peak', () => {
    // The tangent is zero where the direction changes, so the control points around the peak sit at its height.
    expect(smoothPath([
      { x: 0, y: 10 },
      { x: 10, y: 0 },
      { x: 20, y: 10 },
    ])).toBe('M0,10 C3.33,6.67 6.67,0 10,0 C13.33,0 16.67,6.67 20,10')
  })

  it('stays straight on a straight line', () => {
    expect(smoothPath([
      { x: 0, y: 0 },
      { x: 10, y: 5 },
      { x: 20, y: 10 },
    ])).toBe('M0,0 C3.33,1.67 6.67,3.33 10,5 C13.33,6.67 16.67,8.33 20,10')
  })
})

describe('niceMax', () => {
  it('rounds up to a friendly axis maximum', () => {
    expect(niceMax(575.55)).toBe(600)
    expect(niceMax(28.51)).toBe(30)
    expect(niceMax(0.4)).toBe(0.4)
    expect(niceMax(0.42)).toBe(0.5)
    expect(niceMax(1234)).toBe(1500)
    expect(niceMax(2)).toBe(2)
    expect(niceMax(0)).toBe(1)
  })
})

describe('costSplit', () => {
  it('shares the positive parts', () => {
    const split = costSplit(bucket('2025-06-10T00:00:00'))
    expect(split.share).toEqual({ exchange: 0.5, supplier: 1 / 6, legal: 1 / 3 })
  })

  it('rounds shares to whole percents that add up to 100', () => {
    // 49.6 + 44.6 + 5.8 → naiv 50 + 45 + 6 = 101
    expect(wholePercents({ exchange: 0.496, legal: 0.446, supplier: 0.058 })).toEqual({ exchange: 50, legal: 44, supplier: 6 })
    expect(wholePercents({ exchange: 1 / 3, legal: 1 / 3, supplier: 1 / 3 })).toEqual({ exchange: 34, legal: 33, supplier: 33 })
    expect(wholePercents({ exchange: 0, legal: 0, supplier: 0 })).toEqual({ exchange: 0, legal: 0, supplier: 0 })
    expect(wholePercents(costSplit(bucket('2025-06-10T00:00:00')).share)).toEqual({ exchange: 50, legal: 33, supplier: 17 })
  })

  it('stacks only positive segments with the supplier share on top and scales them down to a reduced total', () => {
    expect(stackedSegments(bucket('2025-06-10T00:00:00'))).toEqual([
      { key: 'exchange', ct: 150 },
      { key: 'legal', ct: 100 },
      { key: 'supplier', ct: 50 },
    ])
    // Negativer Börsenpreis: 100 + 50 - 30 = 120 Gesamtkosten
    const negative = bucket('2025-06-10T00:00:00', { stock_exchange_ct: -30, cost_ct: 120 })
    expect(stackedSegments(negative)).toEqual([
      { key: 'legal', ct: 80 },
      { key: 'supplier', ct: 40 },
    ])
    expect(stackedSegments(bucket('2025-06-10T00:00:00', { has_data: false, cost_ct: 0, legal_ct: 0, supplier_ct: 0, stock_exchange_ct: 0 }))).toEqual([])
  })
})

describe('usageNote', () => {
  it('explains empty periods', () => {
    const empty = bucket('2025-06-01T00:00:00', { has_data: false, usage_kwh: 0 })
    expect(usageNote(empty, false)).toBe('Für diesen Vertrag liegen noch keine Verbrauchswerte vor.')
    expect(usageNote(empty, true)).toBe('Für diesen Zeitraum liegen keine Verbrauchswerte vor.')
  })

  it('names the provisional share', () => {
    expect(usageNote(bucket('2025-06-01T00:00:00'), true)).toMatch(/^Abgerechneter Verbrauch\./)
    expect(usageNote(bucket('2025-06-01T00:00:00', { unbilled_kwh: 10, unbilled_ct: 300 }), true)).toMatch(/^Noch nicht abgerechnet/)
    expect(usageNote(bucket('2025-06-01T00:00:00', { unbilled_kwh: 2.5, unbilled_ct: 75 }), true)).toMatch(
      /^Davon 2,5 kWh \(0,75\s?€\) noch nicht abgerechnet/,
    )
  })
})

describe('invoicedNote', () => {
  it('names the invoice and its consumption', () => {
    expect(invoicedNote({ amount_cents: 8642, consumption_kwh: 343, invoice_numbers: ['S26-4'] })).toMatch(
      /^Nettobetrag laut Rechnung S26-4 \(343 kWh abgerechnet\)\./,
    )
    expect(invoicedNote({ amount_cents: 1, consumption_kwh: 700, invoice_numbers: ['A', 'B'] })).toMatch(
      /^Nettobetrag laut 2 Rechnungen/,
    )
  })
})
