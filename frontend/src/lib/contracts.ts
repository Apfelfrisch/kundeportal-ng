import type {
  Contract,
  ContractSummary,
  Meter,
  MeterCount,
  MeterPoint,
} from '#/types/api'

/**
 * Reine Helfer rund um Verträge – vom Dashboard und der Vertragsliste genutzt
 * und einzeln unit-getestet.
 */

/**
 * Badge-Farbe je Vertragsstatus, portiert von der alten
 * `StatusBadge`-Komponente (success/secondary/warning/danger/info).
 */
export type StatusBadgeTone =
  | 'success'
  | 'secondary'
  | 'warning'
  | 'danger'
  | 'info'

export function statusBadgeTone(label: string): StatusBadgeTone {
  switch (label) {
    case 'In Belieferung':
      return 'success'
    case 'Gekündigt':
      return 'secondary'
    case 'In Kündigung':
      return 'warning'
    case 'Abgelehnt':
      return 'danger'
    default:
      return 'info'
  }
}

/**
 * Vertragsliste: Bei genau einem Vertrag wird direkt auf dessen Dashboard
 * weitergeleitet – gibt dann die Vertragsnummer zurück, sonst `null`.
 */
export function singleContractNumber(
  contracts: ReadonlyArray<ContractSummary>,
): number | null {
  const first = contracts[0]
  return contracts.length === 1 && first !== undefined
    ? first.contract_number
    : null
}

/** Erster (ältester) Zählpunkt – entspricht `Contract::meterPoint()` im Altsystem. */
export function primaryMeterPoint(contract: Contract): MeterPoint | null {
  return contract.meter_points[0] ?? null
}

/** Aktiver Zähler des Zählpunkts (aufsteigend sortiert, erster Eintrag). */
export function primaryMeter(meterPoint: MeterPoint | null): Meter | null {
  return meterPoint?.meters[0] ?? null
}

/** Neuester Zählerstand (Liste kommt absteigend sortiert vom Backend). */
export function latestMeterCount(
  meterPoint: MeterPoint | null,
): MeterCount | null {
  return meterPoint?.meter_counts[0] ?? null
}

/** Eintarifzähler? Steuert Einzelstand vs. HT/NT im Zählerstandsformular. */
export function isSingleTariffMeter(contract: Contract): boolean {
  return (primaryMeter(primaryMeterPoint(contract))?.type ?? '') === 'ET'
}

/**
 * Anzeigename einer Vertragsdatei: Dateiname ohne Endung, `_`/`-` durch
 * Leerzeichen ersetzt (wie das alte Anschreiben-Offcanvas).
 */
export function contractFileDisplayName(filename: string | null): string {
  if (filename === null || filename === '') return 'Dokument'
  const withoutExtension = filename.replace(/\.[^.]+$/, '')
  return withoutExtension.replace(/[_-]/g, ' ')
}

/**
 * Widerruf ist nur binnen 14 Tagen nach Vertragseingang möglich
 * (alte Vertragsdaten-Karte).
 */
export function isRevocable(
  receivedAt: string | null,
  now: Date = new Date(),
): boolean {
  if (receivedAt === null) return false
  const received = new Date(receivedAt)
  if (Number.isNaN(received.getTime())) return false
  const days = (now.getTime() - received.getTime()) / (1000 * 60 * 60 * 24)
  return days <= 14
}

/**
 * Zulässiger Wunschabschlag: ±20 % des aktuellen Abschlags, gerundet –
 * identisch zur Backend-Regel (`customer-portal.installment.range`).
 */
export function installmentRange(contract: Contract): {
  current: number
  min: number
  max: number
} {
  const currentCents = contract.installment?.amount_cents ?? 0
  const currentEuros = currentCents / 100
  return {
    current: Math.round(currentEuros),
    min: Math.round(currentEuros * 0.8),
    max: Math.round(currentEuros * 1.2),
  }
}
