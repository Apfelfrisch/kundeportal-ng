import { groupIban, isValidIban } from './iban'

describe('isValidIban', () => {
  it('accepts valid IBANs with or without spaces', () => {
    expect(isValidIban('DE89 3704 0044 0532 0130 00')).toBe(true)
    expect(isValidIban('GB82WEST12345698765432')).toBe(true)
  })

  it('rejects wrong check digits and malformed input', () => {
    expect(isValidIban('DE89 3704 0044 0532 0130 01')).toBe(false)
    expect(isValidIban('DE12')).toBe(false)
    expect(isValidIban('')).toBe(false)
  })
})

describe('groupIban', () => {
  it('groups in fours and upper-cases', () => {
    expect(groupIban('de893704004405320130 00')).toBe('DE89 3704 0044 0532 0130 00')
  })
})
