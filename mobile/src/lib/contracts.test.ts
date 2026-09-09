import type { Contract } from '@/api/types'

import { firstOfNextMonth, installmentRange } from './contracts'

function withInstallment(cents: number | null): Contract {
  return { installment: cents === null ? null : { amount_cents: cents, valid_from: null, valid_until: null, next_payment: null, type: null } } as Contract
}

describe('installmentRange', () => {
  it('allows twenty percent around the current installment', () => {
    expect(installmentRange(withInstallment(15100))).toEqual({ current: 151, min: 121, max: 181 })
  })

  it('is all zero without an installment', () => {
    expect(installmentRange(withInstallment(null))).toEqual({ current: 0, min: 0, max: 0 })
  })
})

describe('firstOfNextMonth', () => {
  it('rolls over the year', () => {
    expect(firstOfNextMonth(new Date(2026, 11, 15))).toEqual(new Date(2027, 0, 1))
  })
})
