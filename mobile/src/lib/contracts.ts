import type { Address, BillingContact, Contract, Meter, MeterCount, MeterPoint } from '@/api/types'

/** Reine Helfer rund um Verträge (Gegenstück zu `frontend/src/lib/contracts.ts`). */

/** Erster (ältester) Zählpunkt – entspricht `Contract::meterPoint()` im Altsystem. */
export function primaryMeterPoint(contract: Contract): MeterPoint | null {
  return contract.meter_points[0] ?? null
}

/** Aktiver Zähler des Zählpunkts (aufsteigend sortiert, erster Eintrag). */
export function primaryMeter(meterPoint: MeterPoint | null): Meter | null {
  return meterPoint?.meters[0] ?? null
}

/** Neuester Zählerstand (Liste kommt absteigend sortiert vom Backend). */
export function latestMeterCount(meterPoint: MeterPoint | null): MeterCount | null {
  return meterPoint?.meter_counts[0] ?? null
}

/** Eintarifzähler? Steuert Einzelstand vs. HT/NT im Zählerstandsformular. */
export function isSingleTariffMeter(contract: Contract): boolean {
  return (primaryMeter(primaryMeterPoint(contract))?.type ?? '') === 'ET'
}

/** `"Deichstraße 12, 26506 Norden"` – leere Teile werden ausgelassen. */
export function addressLine(address: Address | null | undefined): string {
  if (address === null || address === undefined) return ''
  const street = [address.street, address.street_number].filter(Boolean).join(' ')
  const city = [address.zip, address.city].filter(Boolean).join(' ')
  return [street, city].filter((part) => part !== '').join(', ')
}

/** Straße und Ort als zwei Zeilen. */
export function addressLines(address: Address | null | undefined): Array<string> {
  if (address === null || address === undefined) return []
  const street = [address.street, address.street_number].filter(Boolean).join(' ')
  const city = [address.zip, address.city].filter(Boolean).join(' ')
  return [street, address.address_additive ?? '', city].filter((part) => part !== '')
}

export function contactName(contact: BillingContact): string {
  if (contact.company) return contact.company
  return [contact.title, contact.first_name, contact.last_name].filter(Boolean).join(' ')
}

/** Initialen für den Avatar: `"Anna Muster"` → `"AM"`. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((part) => part !== '')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * Zulässiger Wunschabschlag: ±20 % des aktuellen Abschlags, gerundet –
 * identisch zur Backend-Regel (`customer-portal.installment.range`).
 */
export function installmentRange(contract: Contract): { current: number; min: number; max: number } {
  const currentEuros = (contract.installment?.amount_cents ?? 0) / 100
  return {
    current: Math.round(currentEuros),
    min: Math.round(currentEuros * 0.8),
    max: Math.round(currentEuros * 1.2),
  }
}

/** Erster Tag des Folgemonats – Vorbelegung für „gültig ab“. */
export function firstOfNextMonth(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth() + 1, 1)
}
