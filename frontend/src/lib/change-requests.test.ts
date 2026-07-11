import { describe, expect, it } from 'vitest'

import {
  bankSchema,
  billingAddressSchema,
  installmentSchema,
  isChangeRequestType,
  isIbanFormat,
  meterCountSchema,
} from '#/lib/change-requests'

describe('isChangeRequestType', () => {
  it('akzeptiert alle acht Formulartypen', () => {
    for (const type of [
      'bank',
      'billing-address',
      'delivery-address',
      'contact-data',
      'installment',
      'meter-count',
      'termination',
      'revocation',
    ]) {
      expect(isChangeRequestType(type)).toBe(true)
    }
  })

  it('lehnt unbekannte Typen ab (contact ist Chat, kein Formular)', () => {
    expect(isChangeRequestType('contact')).toBe(false)
    expect(isChangeRequestType('unknown')).toBe(false)
  })
})

describe('bankSchema (IBAN nur Formatprüfung)', () => {
  const valid = {
    iban: 'DE69284500000021025564',
    bank: 'Sparkasse',
    bank_account_owner: 'Max Mustermann',
    sepa: true,
    change_all_contracts: false,
  }

  it('akzeptiert eine formal gültige IBAN', () => {
    expect(bankSchema.safeParse(valid).success).toBe(true)
  })

  it('akzeptiert IBANs mit Leerzeichen und Kleinbuchstaben', () => {
    expect(isIbanFormat('de69 2845 0000 0021 0255 64')).toBe(true)
  })

  it('prüft die Prüfsumme NICHT (Backend ist maßgeblich)', () => {
    // Gleiche IBAN mit kaputter Prüfziffer bleibt formal gültig.
    expect(isIbanFormat('DE00284500000021025564')).toBe(true)
  })

  it('lehnt zu kurze oder formal falsche IBANs ab', () => {
    expect(isIbanFormat('DE69')).toBe(false)
    expect(isIbanFormat('1234567890')).toBe(false)
    expect(bankSchema.safeParse({ ...valid, iban: 'DE1' }).success).toBe(false)
  })

  it('verlangt Bank und Kontoinhaber', () => {
    expect(bankSchema.safeParse({ ...valid, bank: '' }).success).toBe(false)
    expect(
      bankSchema.safeParse({ ...valid, bank_account_owner: ' ' }).success,
    ).toBe(false)
  })
})

describe('billingAddressSchema', () => {
  it('verlangt eine 5-stellige PLZ (auch mit führender 0)', () => {
    const base = {
      street: 'Musterweg',
      street_number: '1',
      address_additive: '',
      city: 'Emden',
      change_all_contracts: false,
    }
    expect(billingAddressSchema.safeParse({ ...base, zip: '01234' }).success).toBe(
      true,
    )
    expect(billingAddressSchema.safeParse({ ...base, zip: '1234' }).success).toBe(
      false,
    )
    expect(
      billingAddressSchema.safeParse({ ...base, zip: '123456' }).success,
    ).toBe(false)
  })
})

describe('installmentSchema', () => {
  const schema = installmentSchema(120, 180)
  const future = '2999-01-01'

  it('akzeptiert Beträge innerhalb der ±20 %-Spanne', () => {
    expect(
      schema.safeParse({ installment: '150', effective_from: future }).success,
    ).toBe(true)
    expect(
      schema.safeParse({ installment: '120', effective_from: future }).success,
    ).toBe(true)
    expect(
      schema.safeParse({ installment: '180', effective_from: future }).success,
    ).toBe(true)
  })

  it('lehnt Beträge außerhalb der Spanne ab', () => {
    expect(
      schema.safeParse({ installment: '119', effective_from: future }).success,
    ).toBe(false)
    expect(
      schema.safeParse({ installment: '181', effective_from: future }).success,
    ).toBe(false)
  })

  it('lehnt Nachkommastellen und Vergangenheitsdaten ab', () => {
    expect(
      schema.safeParse({ installment: '150,5', effective_from: future })
        .success,
    ).toBe(false)
    expect(
      schema.safeParse({ installment: '150', effective_from: '2020-01-01' })
        .success,
    ).toBe(false)
  })
})

describe('meterCountSchema (required_without-Matrix)', () => {
  const base = {
    meter_count: '',
    meter_count_ht: '',
    meter_count_nt: '',
    read_on: '2026-07-01',
  }

  it('akzeptiert nur den Einzelstand', () => {
    expect(
      meterCountSchema.safeParse({ ...base, meter_count: '12345' }).success,
    ).toBe(true)
  })

  it('akzeptiert HT und NT zusammen', () => {
    expect(
      meterCountSchema.safeParse({
        ...base,
        meter_count_ht: '100',
        meter_count_nt: '200',
      }).success,
    ).toBe(true)
  })

  it('lehnt komplett leere Zählerstände ab', () => {
    expect(meterCountSchema.safeParse(base).success).toBe(false)
  })

  it('verlangt NT, wenn nur HT gefüllt ist (und umgekehrt)', () => {
    expect(
      meterCountSchema.safeParse({ ...base, meter_count_ht: '100' }).success,
    ).toBe(false)
    expect(
      meterCountSchema.safeParse({ ...base, meter_count_nt: '200' }).success,
    ).toBe(false)
  })

  it('verlangt das Ablesedatum und ganze Zahlen', () => {
    expect(
      meterCountSchema.safeParse({
        ...base,
        meter_count: '12345',
        read_on: '',
      }).success,
    ).toBe(false)
    expect(
      meterCountSchema.safeParse({ ...base, meter_count: '123,45' }).success,
    ).toBe(false)
  })
})
