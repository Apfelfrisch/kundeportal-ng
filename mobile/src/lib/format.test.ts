import { maskIban, parseGermanDate, toIsoDate } from './format'

describe('parseGermanDate', () => {
  it('converts a valid German date to ISO', () => {
    expect(parseGermanDate('01.07.2026')).toBe('2026-07-01')
    expect(parseGermanDate(' 9.9.2026 ')).toBe('2026-09-09')
  })

  it('rejects malformed and impossible dates', () => {
    expect(parseGermanDate('2026-07-01')).toBeNull()
    expect(parseGermanDate('31.02.2026')).toBeNull()
    expect(parseGermanDate('')).toBeNull()
  })
})

describe('toIsoDate', () => {
  it('pads month and day', () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('maskIban', () => {
  it('keeps country and the last four digits', () => {
    expect(maskIban('DE69284500000021025564')).toBe('DE69 ···· ···· ···· ···· 5564')
    expect(maskIban('DE12 3456 7890 4567')).toBe('DE12 ···· ···· 4567')
  })
})
