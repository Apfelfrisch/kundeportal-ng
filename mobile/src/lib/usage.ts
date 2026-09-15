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
 * Die Tage, Monate bzw. Jahre der abgerechneten Spanne, älteste zuerst.
 * Ohne Spanne gibt es keine Tabs. Tage gibt es nur aus dem Monat von
 * `selected` (dem angezeigten Zeitraum) – ohne Auswahl aus dem ganzen
 * Zeitraum.
 */
export function periodOptions(
  period: UsagePeriod,
  available: { from: string; until: string } | null,
  selected: string | null = null,
): Array<PeriodOption> {
  if (available === null) return []

  let from = parseIsoDate(available.from)
  let until = parseIsoDate(available.until)

  if (period === 'day' && selected !== null) {
    const month = parseIsoDate(selected)
    const first = new Date(month.getFullYear(), month.getMonth(), 1)
    const last = new Date(month.getFullYear(), month.getMonth() + 1, 0)
    if (first > from) from = first
    if (last < until) until = last
  }

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

export interface Point {
  x: number
  y: number
}

/**
 * SVG-Pfad als weiche Kurve durch die Punkte (monotone kubische Interpolation
 * nach Fritsch–Carlson): Die Linie bleibt zwischen zwei Punkten immer
 * zwischen deren Werten, schwingt also nicht über Spitzen hinaus. Weniger als
 * zwei Punkte ergeben einen leeren Pfad.
 */
export function smoothPath(points: ReadonlyArray<Point>): string {
  if (points.length < 2) return ''
  const count = points.length
  const slopes: Array<number> = []
  for (let index = 0; index < count - 1; index += 1) {
    const from = points[index] as Point
    const to = points[index + 1] as Point
    const dx = to.x - from.x
    slopes.push(dx === 0 ? 0 : (to.y - from.y) / dx)
  }

  // Tangente je Punkt: an den Enden die Sekantensteigung, dazwischen das
  // harmonische Mittel der Nachbarn – null, sobald die Richtung wechselt.
  const tangents = points.map((_, index) => {
    if (index === 0) return slopes[0] as number
    if (index === count - 1) return slopes[count - 2] as number
    const before = slopes[index - 1] as number
    const after = slopes[index] as number
    if (before * after <= 0) return 0
    return (2 * before * after) / (before + after)
  })

  const first = points[0] as Point
  const parts = [`M${round(first.x)},${round(first.y)}`]
  for (let index = 0; index < count - 1; index += 1) {
    const from = points[index] as Point
    const to = points[index + 1] as Point
    const third = (to.x - from.x) / 3
    const c1x = from.x + third
    const c1y = from.y + third * (tangents[index] as number)
    const c2x = to.x - third
    const c2y = to.y - third * (tangents[index + 1] as number)
    parts.push(`C${round(c1x)},${round(c1y)} ${round(c2x)},${round(c2y)} ${round(to.x)},${round(to.y)}`)
  }
  return parts.join(' ')
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

export type CostShare = 'exchange' | 'supplier' | 'legal'

/** Reihenfolge in Aufteilung und Balken (von unten nach oben) – unser Aufschlag steht immer zuletzt bzw. ganz oben. */
export const COST_SHARES: ReadonlyArray<{ key: CostShare; label: string }> = [
  { key: 'exchange', label: 'Börsenpreis' },
  { key: 'legal', label: 'Abgaben/Umlagen' },
  { key: 'supplier', label: 'Unser Aufschlag' },
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
 * Anteile als ganze Prozent, die zusammen 100 ergeben (Hare-Niemeyer):
 * Erst abrunden, dann die fehlenden Punkte an die größten Reste vergeben.
 * Ohne Anteile (alles 0) bleiben alle bei 0.
 */
export function wholePercents(share: Record<CostShare, number>): Record<CostShare, number> {
  const keys = COST_SHARES.map(({ key }) => key)
  const exact = keys.map((key) => share[key] * 100)
  const floored = exact.map((value) => Math.floor(value))
  const total = Math.round(exact.reduce((sum, value) => sum + value, 0))
  let missing = total - floored.reduce((sum, value) => sum + value, 0)
  const byRemainder = keys
    .map((_, index) => index)
    .sort((a, b) => (exact[b] as number) - (floored[b] as number) - ((exact[a] as number) - (floored[a] as number)))
  for (const index of byRemainder) {
    if (missing <= 0) break
    floored[index] = (floored[index] as number) + 1
    missing -= 1
  }
  return Object.fromEntries(keys.map((key, index) => [key, floored[index]])) as Record<CostShare, number>
}

/**
 * Segmente eines gestapelten Kostenbalkens in Cent (nur positive Anteile),
 * von unten nach oben in der Reihenfolge von COST_SHARES. Drückt ein
 * negativer Anteil die Summe, werden die Segmente so skaliert, dass der
 * Balken die tatsächlichen Gesamtkosten zeigt.
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

/** Preis im Tooltip: gewichtet, wenn verbraucht wurde, sonst der Zeitraumdurchschnitt. */
export function tooltipPrice(bucket: UsageBucket): number | null {
  return bucket.usage_kwh > 0 ? bucket.average_ct_kwh : bucket.price_ct_kwh
}

/** Kosten des Zeitraums in Cent – der Rechnungsbetrag, sobald der Zeitraum komplett abgerechnet ist. */
export function displayCostCt(window: UsageWindow): number {
  return window.invoiced === null ? window.totals.cost_ct : window.invoiced.amount_cents
}
