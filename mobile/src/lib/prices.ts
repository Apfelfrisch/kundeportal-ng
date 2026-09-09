import type { MarketPrice } from '@/api/types'

/**
 * Aus den viertelstündlichen Börsenpreisen die Kennzahlen der Startseite
 * eines dynamischen Vertrags – jeweils inklusive des festen Tarifaufschlags
 * (ct/kWh, netto wie die API): der Preis der laufenden Viertelstunde mit
 * Tagestief und Tageshoch (für die Anzeige wie auf der Börsenpreis-Seite),
 * dazu der Tagesverlauf als 24 Stundenwerte und die günstigste Stunde.
 */

export interface PriceOverview {
  /** Stundenpreise 0–23 Uhr; null, wenn für die Stunde kein Preis vorliegt. */
  hourly: Array<number | null>
  currentHour: number
  /** Preis der laufenden Viertelstunde. */
  current: number | null
  /** `"14:15–14:30 Uhr"` der laufenden Viertelstunde. */
  slotLabel: string | null
  /** Tagesdurchschnitt, -tief und -hoch der Viertelstundenpreise. */
  average: number | null
  min: number | null
  max: number | null
  /** Lage des aktuellen Preises zwischen Tagestief (0) und Tageshoch (1). */
  fraction: number | null
  cheapestHour: number | null
  /** Einordnung des aktuellen Preises gegenüber dem Tagesdurchschnitt. */
  rating: 'cheap' | 'expensive' | null
}

/** `starts_at` kommt ohne Zeitzone (Ortszeit) – Datum und Uhrzeit direkt lesen. */
function parts(startsAt: string): { day: string; hour: number; minute: number } {
  return { day: startsAt.slice(0, 10), hour: Number(startsAt.slice(11, 13)), minute: Number(startsAt.slice(14, 16)) }
}

function localDay(date: Date): string {
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000
}

function clock(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export function priceOverview(
  prices: ReadonlyArray<MarketPrice>,
  surchargeCt: number,
  now: Date = new Date(),
): PriceOverview {
  const today = localDay(now)
  const sums = Array<number>(24).fill(0)
  const counts = Array<number>(24).fill(0)
  const quarters: Array<number> = []
  const currentHour = now.getHours()
  const currentQuarter = Math.floor(now.getMinutes() / 15) * 15
  let current: number | null = null

  for (const price of prices) {
    const { day, hour, minute } = parts(price.starts_at)
    if (day !== today || hour < 0 || hour > 23) continue
    const value = round(price.cent_per_kwh + surchargeCt)
    quarters.push(value)
    sums[hour] = (sums[hour] ?? 0) + price.cent_per_kwh
    counts[hour] = (counts[hour] ?? 0) + 1
    if (hour === currentHour && minute === currentQuarter) current = value
  }

  const hourly = sums.map((sum, hour) => {
    const count = counts[hour] ?? 0
    return count === 0 ? null : round(sum / count + surchargeCt)
  })

  const average = quarters.length === 0 ? null : round(quarters.reduce((a, b) => a + b, 0) / quarters.length)
  const min = quarters.length === 0 ? null : Math.min(...quarters)
  const max = quarters.length === 0 ? null : Math.max(...quarters)

  let cheapestHour: number | null = null
  hourly.forEach((value, hour) => {
    if (value === null) return
    const cheapest = cheapestHour === null ? null : hourly[cheapestHour]
    if (cheapest === null || cheapest === undefined || value < cheapest) cheapestHour = hour
  })

  let rating: PriceOverview['rating'] = null
  if (current !== null && average !== null && average > 0) {
    if (current <= average * 0.9) rating = 'cheap'
    else if (current >= average * 1.1) rating = 'expensive'
  }

  let fraction: number | null = null
  if (current !== null && min !== null && max !== null) {
    fraction = max > min ? Math.min(1, Math.max(0, (current - min) / (max - min))) : 0.5
  }

  const slotEndMinute = currentQuarter + 15
  const slotLabel =
    current === null
      ? null
      : `${clock(currentHour, currentQuarter)}–${clock(slotEndMinute === 60 ? currentHour + 1 : currentHour, slotEndMinute % 60)} Uhr`

  return { hourly, currentHour, current, slotLabel, average, min, max, fraction, cheapestHour, rating }
}

/** `14` → `"14–15 Uhr"` */
export function hourRange(hour: number): string {
  return `${hour}–${hour + 1} Uhr`
}
