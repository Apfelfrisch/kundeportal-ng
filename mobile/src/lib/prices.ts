import type { MarketPrice } from '@/api/types'

/**
 * Aus den viertelstündlichen Börsenpreisen die Kennzahlen der Startseite
 * eines dynamischen Vertrags: aktueller Stundenpreis, Tagesverlauf als 24
 * Stundenwerte, Tagesdurchschnitt und günstigste Stunde – jeweils inklusive
 * des festen Tarifaufschlags (ct/kWh, netto wie die API).
 */

export interface PriceOverview {
  /** Stundenpreise 0–23 Uhr; null, wenn für die Stunde kein Preis vorliegt. */
  hourly: Array<number | null>
  currentHour: number
  current: number | null
  average: number | null
  cheapestHour: number | null
  /** Einordnung des aktuellen Preises gegenüber dem Tagesdurchschnitt. */
  rating: 'cheap' | 'expensive' | null
}

/** `starts_at` kommt ohne Zeitzone (Ortszeit) – Datum und Stunde direkt lesen. */
function dayAndHour(startsAt: string): { day: string; hour: number } {
  return { day: startsAt.slice(0, 10), hour: Number(startsAt.slice(11, 13)) }
}

function localDay(date: Date): string {
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

export function priceOverview(
  prices: ReadonlyArray<MarketPrice>,
  surchargeCt: number,
  now: Date = new Date(),
): PriceOverview {
  const today = localDay(now)
  const sums = Array<number>(24).fill(0)
  const counts = Array<number>(24).fill(0)

  for (const price of prices) {
    const { day, hour } = dayAndHour(price.starts_at)
    if (day !== today || hour < 0 || hour > 23) continue
    sums[hour] = (sums[hour] ?? 0) + price.cent_per_kwh
    counts[hour] = (counts[hour] ?? 0) + 1
  }

  const hourly = sums.map((sum, hour) => {
    const count = counts[hour] ?? 0
    return count === 0 ? null : round(sum / count + surchargeCt)
  })

  const known = hourly.filter((value): value is number => value !== null)
  const average = known.length === 0 ? null : round(known.reduce((a, b) => a + b, 0) / known.length)

  let cheapestHour: number | null = null
  hourly.forEach((value, hour) => {
    if (value === null) return
    const cheapest = cheapestHour === null ? null : hourly[cheapestHour]
    if (cheapest === null || cheapest === undefined || value < cheapest) cheapestHour = hour
  })

  const currentHour = now.getHours()
  const current = hourly[currentHour] ?? null

  let rating: PriceOverview['rating'] = null
  if (current !== null && average !== null && average > 0) {
    if (current <= average * 0.9) rating = 'cheap'
    else if (current >= average * 1.1) rating = 'expensive'
  }

  return { hourly, currentHour, current, average, cheapestHour, rating }
}

/** `14` → `"14–15 Uhr"` */
export function hourRange(hour: number): string {
  return `${hour}–${hour + 1} Uhr`
}
