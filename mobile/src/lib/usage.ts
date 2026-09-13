import type { UsageBucket, UsagePeriod, UsageWindow } from '@/api/types'
import { MONTHS, formatMonth } from '@/lib/calendar'
import { formatEuro, formatKwh, parseIsoDate, toIsoDate } from '@/lib/format'
import { hourRange } from '@/lib/prices'

/**
 * Reine Helfer der Verbrauchsseite: Zeitraum-Tabs aus der abgerechneten
 * Spanne, Beschriftungen von Balken und Achsen, Kostenaufteilung.
 */

export type UsageUnit = 'kwh' | 'eur'

export const USAGE_UNITS: ReadonlyArray<{ value: UsageUnit; label: string }> = [
  { value: 'kwh', label: 'kWh' },
  { value: 'eur', label: '€' },
]

export interface PeriodOption {
  /** Beginn des Zeitraums als `yyyy-mm-dd` – identisch mit `UsageWindow.from`. */
  date: string
  label: string
}

const dayTitleFormat = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
const monthLongFormat = new Intl.DateTimeFormat('de-DE', { month: 'long' })

/** `2025-06-10T13:00:00` (Ortszeit, ohne Zone) → Bestandteile. */
function stampParts(stamp: string): { year: number; month: number; day: number; hour: number } {
  return {
    year: Number(stamp.slice(0, 4)),
    month: Number(stamp.slice(5, 7)) - 1,
    day: Number(stamp.slice(8, 10)),
    hour: stamp.length >= 13 ? Number(stamp.slice(11, 13)) : 0,
  }
}

function monthShort(month: number): string {
  return MONTHS[month] ?? ''
}

/**
 * Alle Tage, Monate bzw. Jahre der abgerechneten Spanne, älteste zuerst.
 * Ohne Spanne gibt es keine Tabs.
 */
export function periodOptions(period: UsagePeriod, available: { from: string; until: string } | null): Array<PeriodOption> {
  if (available === null) return []

  const from = parseIsoDate(available.from)
  const until = parseIsoDate(available.until)
  if (until < from) return []

  const options: Array<PeriodOption> = []

  if (period === 'day') {
    for (let day = from; day <= until; day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)) {
      options.push({ date: toIsoDate(day), label: `${day.getDate()}. ${monthShort(day.getMonth())}` })
    }
    return options
  }

  if (period === 'month') {
    const multiYear = from.getFullYear() !== until.getFullYear()
    for (let month = new Date(from.getFullYear(), from.getMonth(), 1); month <= until; month = new Date(month.getFullYear(), month.getMonth() + 1, 1)) {
      const year = multiYear ? ` ${String(month.getFullYear()).slice(2)}` : ''
      options.push({ date: toIsoDate(month), label: `${monthShort(month.getMonth())}${year}` })
    }
    return options
  }

  for (let year = from.getFullYear(); year <= until.getFullYear(); year++) {
    options.push({ date: `${year}-01-01`, label: String(year) })
  }
  return options
}

/** Überschrift des Zeitraums: `"10. Juni 2025"`, `"Juni 2025"`, `"2025"`. */
export function periodTitle(period: UsagePeriod, date: string): string {
  const { year, month } = stampParts(date)
  if (period === 'day') return dayTitleFormat.format(parseIsoDate(date))
  if (period === 'month') return formatMonth(year, month)
  return String(year)
}

/** Beschriftung eines Balkens: `"13–14 Uhr"`, `"10. Jun"`, `"Juni"`. */
export function bucketLabel(period: UsagePeriod, bucket: UsageBucket): string {
  const { year, month, day, hour } = stampParts(bucket.from)
  if (period === 'day') return hourRange(hour)
  if (period === 'month') return `${day}. ${monthShort(month)}`
  return monthLongFormat.format(new Date(year, month, 1))
}

/** Beschriftungen der x-Achse: Balkenindex → Text (nur einige Balken). */
export function axisLabels(period: UsagePeriod, buckets: ReadonlyArray<UsageBucket>): Array<{ index: number; label: string }> {
  const labels: Array<{ index: number; label: string }> = []

  buckets.forEach((bucket, index) => {
    const { month, day, hour } = stampParts(bucket.from)
    if (period === 'day' && hour % 6 === 0) labels.push({ index, label: hour === 0 ? '0 Uhr' : String(hour) })
    if (period === 'month' && day % 10 === 5) labels.push({ index, label: `${day}. ${monthShort(month)}` })
    if (period === 'year' && month % 2 === 0) labels.push({ index, label: monthShort(month) })
  })

  return labels
}

const NICE_STEPS = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10] as const

/** „Schöne“ Achsenobergrenze: 575 → 600, 28,5 → 30, 0,42 → 0,5, ≤ 0 → 1. */
export function niceMax(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1
  const exponent = Math.floor(Math.log10(value))
  const base = 10 ** exponent
  const fraction = value / base
  const nice = NICE_STEPS.find((step) => fraction <= step + 1e-9) ?? 10
  return Math.round(nice * base * 1e6) / 1e6
}

export type CostShare = 'exchange' | 'supplier' | 'legal'

export const COST_SHARES: ReadonlyArray<{ key: CostShare; label: string }> = [
  { key: 'exchange', label: 'Börsenpreis' },
  { key: 'supplier', label: 'Unser Aufschlag' },
  { key: 'legal', label: 'Abgaben/Umlagen' },
]

export interface CostSplit {
  /** Cent je Anteil, Grundpreise im Lieferanten- bzw. Abgabenanteil enthalten (Börse kann negativ sein). */
  ct: Record<CostShare, number>
  /** Anteil 0–1 an der Summe der positiven Anteile. */
  share: Record<CostShare, number>
}

export function costSplit(bucket: UsageBucket): CostSplit {
  const ct = {
    exchange: bucket.stock_exchange_ct,
    supplier: bucket.supplier_ct + bucket.supplier_base_ct,
    legal: bucket.legal_ct + bucket.legal_base_ct,
  }
  const positive = { exchange: Math.max(0, ct.exchange), supplier: Math.max(0, ct.supplier), legal: Math.max(0, ct.legal) }
  const sum = positive.exchange + positive.supplier + positive.legal
  const share =
    sum > 0
      ? { exchange: positive.exchange / sum, supplier: positive.supplier / sum, legal: positive.legal / sum }
      : { exchange: 0, supplier: 0, legal: 0 }

  return { ct, share }
}

/**
 * Segmente eines gestapelten Kostenbalkens in Cent (nur positive Anteile).
 * Drückt ein negativer Anteil die Summe, werden die Segmente so skaliert,
 * dass der Balken die tatsächlichen Gesamtkosten zeigt.
 */
export function stackedSegments(bucket: UsageBucket): Array<{ key: CostShare; ct: number }> {
  const { ct } = costSplit(bucket)
  const segments = COST_SHARES.map(({ key }) => ({ key, ct: Math.max(0, ct[key]) }))
  const sum = segments.reduce((total, segment) => total + segment.ct, 0)
  if (sum <= 0 || bucket.cost_ct <= 0) return []
  const scale = bucket.cost_ct < sum ? bucket.cost_ct / sum : 1
  return segments.filter((segment) => segment.ct > 0).map((segment) => ({ key: segment.key, ct: segment.ct * scale }))
}

/**
 * Hinweiszeile unter der Summe: woher die Werte stammen bzw. warum keine da
 * sind. Ein vorläufiger Anteil (Lastgang × Börsenpreis, noch nicht
 * abgerechnet) wird mit Menge und Kosten genannt.
 */
export function usageNote(totals: UsageBucket, hasAnyData: boolean): string {
  if (!totals.has_data) {
    return hasAnyData
      ? 'Für diesen Zeitraum liegen keine Verbrauchswerte vor.'
      : 'Für diesen Vertrag liegen noch keine Verbrauchswerte vor.'
  }
  const base = 'Auf Basis der 15-minütlichen Verbrauchswerte, Grundpreise anteilig enthalten, Kosten netto.'
  if (totals.unbilled_kwh <= 0) return `Abgerechneter Verbrauch. ${base}`
  if (totals.unbilled_kwh >= totals.usage_kwh) {
    return `Noch nicht abgerechnet – vorläufig aus Lastgang und Börsenpreisen berechnet. ${base}`
  }
  return `Davon ${formatKwh(totals.unbilled_kwh)} (${formatEuro(totals.unbilled_ct / 100)}) noch nicht abgerechnet und vorläufig aus Lastgang und Börsenpreisen berechnet. ${base}`
}

/**
 * Hinweis, wenn der Zeitraum komplett abgerechnet ist: Die Rechnung rechnet
 * mit ganzen Kilowattstunden, das Diagramm viertelstundengenau – deshalb
 * zählt oben der Rechnungsbetrag.
 */
export function invoicedNote(invoiced: NonNullable<UsageWindow['invoiced']>): string {
  const numbers = invoiced.invoice_numbers
  const label = numbers.length === 1 ? `Rechnung ${numbers[0]}` : `${numbers.length} Rechnungen`
  return `Nettobetrag laut ${label} (${formatKwh(invoiced.consumption_kwh)} abgerechnet). Der Verlauf unten ist viertelstundengenau und kann in der Summe leicht abweichen.`
}

const percentFormat = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 })

/** `0.12345` → `"12 %"` */
export function formatPercent(share: number): string {
  return `${percentFormat.format(share * 100)} %`
}

/** Preis im Tooltip: gewichtet, wenn verbraucht wurde, sonst der Zeitraumdurchschnitt. */
export function tooltipPrice(bucket: UsageBucket): number | null {
  return bucket.usage_kwh > 0 ? bucket.average_ct_kwh : bucket.price_ct_kwh
}

/** Kosten des Zeitraums in Cent – der Rechnungsbetrag, sobald der Zeitraum komplett abgerechnet ist. */
export function displayCostCt(window: UsageWindow): number {
  return window.invoiced === null ? window.totals.cost_ct : window.invoiced.amount_cents
}
