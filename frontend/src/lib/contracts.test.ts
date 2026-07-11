import { describe, expect, it } from 'vitest'

import {
  contractFileDisplayName,
  installmentRange,
  isRevocable,
  singleContractNumber,
  statusBadgeTone,
} from '#/lib/contracts'
import type { Contract, ContractSummary } from '#/types/api'

function summary(contractNumber: number): ContractSummary {
  return {
    contract_number: contractNumber,
    status: { id: 3, label: 'In Belieferung' },
    tariff: 'Klassik Strom',
    delivery_address: null,
    meter_number: null,
    malo_id: null,
    yearly_consumption: null,
    delivery_start: null,
    delivery_end: null,
    installment_amount_cents: null,
  }
}

describe('singleContractNumber', () => {
  it('liefert die Vertragsnummer bei genau einem Vertrag', () => {
    expect(singleContractNumber([summary(123456)])).toBe(123456)
  })

  it('liefert null bei keinem Vertrag', () => {
    expect(singleContractNumber([])).toBeNull()
  })

  it('liefert null bei mehreren Verträgen', () => {
    expect(singleContractNumber([summary(1), summary(2)])).toBeNull()
  })
})

describe('statusBadgeTone', () => {
  it.each([
    ['In Belieferung', 'success'],
    ['Gekündigt', 'secondary'],
    ['In Kündigung', 'warning'],
    ['Abgelehnt', 'danger'],
    ['In Bearbeitung', 'info'],
  ] as const)('%s → %s', (label, tone) => {
    expect(statusBadgeTone(label)).toBe(tone)
  })
})

describe('contractFileDisplayName', () => {
  it('entfernt die Endung und ersetzt _/- durch Leerzeichen', () => {
    expect(contractFileDisplayName('Vertrags-Bestaetigung_2024.pdf')).toBe(
      'Vertrags Bestaetigung 2024',
    )
  })

  it('fällt bei fehlendem Namen auf „Dokument“ zurück', () => {
    expect(contractFileDisplayName(null)).toBe('Dokument')
  })
})

describe('isRevocable', () => {
  const now = new Date('2026-07-11T12:00:00Z')

  it('erlaubt den Widerruf binnen 14 Tagen', () => {
    expect(isRevocable('2026-07-01', now)).toBe(true)
  })

  it('verweigert den Widerruf nach 14 Tagen', () => {
    expect(isRevocable('2026-06-01', now)).toBe(false)
  })

  it('verweigert den Widerruf ohne Eingangsdatum', () => {
    expect(isRevocable(null, now)).toBe(false)
  })
})

describe('installmentRange', () => {
  it('berechnet ±20 % des aktuellen Abschlags in Euro', () => {
    const contract = {
      installment: { amount_cents: 15000 },
    } as unknown as Contract

    expect(installmentRange(contract)).toEqual({
      current: 150,
      min: 120,
      max: 180,
    })
  })

  it('rundet wie das Backend', () => {
    const contract = {
      installment: { amount_cents: 9950 },
    } as unknown as Contract

    // 99,50 € → min 79,6 → 80; max 119,4 → 119
    expect(installmentRange(contract)).toEqual({
      current: 100,
      min: 80,
      max: 119,
    })
  })

  it('liefert 0-Bereich ohne aktuellen Abschlag', () => {
    const contract = { installment: null } as unknown as Contract

    expect(installmentRange(contract)).toEqual({ current: 0, min: 0, max: 0 })
  })
})
