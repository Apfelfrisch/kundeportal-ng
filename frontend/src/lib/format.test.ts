import { describe, expect, it } from 'vitest'

import {
  formatCt,
  formatDate,
  formatDateTime,
  formatEuro,
  formatIban,
  formatKwh,
} from './format'

const NBSP = ' '

describe('formatEuro', () => {
  it('formats with German separators and euro sign', () => {
    expect(formatEuro(1234.5)).toBe(`1.234,50${NBSP}€`)
  })

  it('formats zero', () => {
    expect(formatEuro(0)).toBe(`0,00${NBSP}€`)
  })

  it('formats negative amounts', () => {
    expect(formatEuro(-12.34)).toBe(`-12,34${NBSP}€`)
  })
})

describe('formatCt', () => {
  it('defaults to two fraction digits', () => {
    expect(formatCt(32.456)).toBe('32,46 ct')
  })

  it('supports custom fraction digits', () => {
    expect(formatCt(32.456, 3)).toBe('32,456 ct')
    expect(formatCt(32, 0)).toBe('32 ct')
  })

  it('uses thousands separators', () => {
    expect(formatCt(1234.5)).toBe('1.234,50 ct')
  })
})

describe('formatKwh', () => {
  it('formats whole numbers without fraction digits', () => {
    expect(formatKwh(1234)).toBe('1.234 kWh')
  })

  it('keeps up to two fraction digits', () => {
    expect(formatKwh(12.5)).toBe('12,5 kWh')
    expect(formatKwh(12.34)).toBe('12,34 kWh')
  })
})

describe('formatDate', () => {
  it('formats ISO dates as dd.MM.yyyy', () => {
    expect(formatDate('2026-07-11')).toBe('11.07.2026')
  })

  it('accepts Date objects', () => {
    expect(formatDate(new Date(2025, 0, 3))).toBe('03.01.2025')
  })
})

describe('formatDateTime', () => {
  it('formats date and time', () => {
    expect(formatDateTime(new Date(2026, 6, 11, 14, 30))).toBe(
      '11.07.2026, 14:30',
    )
  })

  it('pads hours and minutes', () => {
    expect(formatDateTime(new Date(2026, 6, 1, 8, 5))).toBe('01.07.2026, 08:05')
  })
})

describe('formatIban', () => {
  it('groups the IBAN in blocks of four', () => {
    expect(formatIban('DE69284500000021025564')).toBe(
      'DE69 2845 0000 0021 0255 64',
    )
  })

  it('normalizes existing whitespace and casing', () => {
    expect(formatIban('de69 2845 0000 0021 0255 64')).toBe(
      'DE69 2845 0000 0021 0255 64',
    )
  })
})
