import { isWithin, monthGrid, shiftMonth } from './calendar'

describe('monthGrid', () => {
  it('starts weeks on Monday and pads the edges', () => {
    // September 2026 begins on a Tuesday and has 30 days.
    const weeks = monthGrid(2026, 8)

    expect(weeks).toHaveLength(5)
    expect(weeks[0]?.[0]).toBeNull()
    expect(weeks[0]?.[1]?.getDate()).toBe(1)
    expect(weeks[4]?.[2]?.getDate()).toBe(30)
    expect(weeks[4]?.[3]).toBeNull()
    expect(weeks.every((week) => week.length === 7)).toBe(true)
  })

  it('handles a month starting on Sunday', () => {
    // November 2026 begins on a Sunday.
    const weeks = monthGrid(2026, 10)
    expect(weeks[0]?.slice(0, 6).every((day) => day === null)).toBe(true)
    expect(weeks[0]?.[6]?.getDate()).toBe(1)
  })
})

describe('shiftMonth', () => {
  it('wraps around the year', () => {
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 })
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 })
  })
})

describe('isWithin', () => {
  const max = new Date(2026, 8, 9, 15, 30)

  it('compares whole days', () => {
    expect(isWithin(new Date(2026, 8, 9, 23, 59), undefined, max)).toBe(true)
    expect(isWithin(new Date(2026, 8, 10, 0, 1), undefined, max)).toBe(false)
    expect(isWithin(new Date(2026, 8, 1), new Date(2026, 8, 2), max)).toBe(false)
  })
})
