import { maskIban, toIsoDate } from './format'

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
