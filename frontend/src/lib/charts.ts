import { z } from 'zod'

/**
 * Reine Transformations- und Formatierungshelfer für die Chart-Seiten
 * (Börsenpreise, abgerechnete Lastprofile, Lastgänge).
 *
 * Die API liefert 15-Minuten-Scheiben mit ISO-Timestamps ohne Zeitzone
 * (`Y-m-dTH:i:s`) – sie werden wie im Altsystem als lokale Zeit
 * interpretiert. Alle Funktionen sind frei von React/Recharts und einzeln
 * unit-getestet.
 */

export const QUARTER_HOUR_MS = 15 * 60 * 1000

/** `?date=`-Suchparameter der Chart-Seiten (ungültige Werte → Standardtag). */
export const chartDateSearchSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .catch(undefined),
})

/**
 * Serienfarben – validierte kategoriale Palette (Slots 1–3), je Modus eigene
 * Stufen statt eines automatischen Flips. Prüfergebnis `validate_palette.js`:
 * Light (#fcfcfb): Band/Chroma/CVD PASS (schlechtestes Paar ΔE 47,2);
 * aqua/yellow < 3:1 Kontrast → Relief über die Tabellenansichten der Seiten.
 * Dark (#1a1a19): alle Checks PASS.
 */
export const CHART_COLORS = {
  blue: { light: '#2a78d6', dark: '#3987e5' },
  aqua: { light: '#1baf7a', dark: '#199e70' },
  yellow: { light: '#eda100', dark: '#c98500' },
} as const

/**
 * Divergierende Rampen für Preise relativ zum Durchschnitt (Status-Semantik
 * teuer/günstig, fest — keine Serienfarben). Je Arm ein eigener Ein-Farbton-
 * Verlauf: `near` (hell) an der Basislinie → `far` (dunkel) am Extrem, mit
 * hartem Wechsel an der Linie statt einer Grün-Rot-Mischzone. Rot/Grün
 * allein trägt die Richtung nicht (Farbfehlsichtigkeit) — die
 * Ø-Referenzlinie und die Tabellenansicht sind das Relief.
 */
export const PRICE_DIVERGING_COLORS = {
  high: {
    near: { light: '#e9a1a1', dark: '#f0a6a3' },
    far: { light: '#b53232', dark: '#d03b3b' },
  },
  low: {
    near: { light: '#9ccf9b', dark: '#a4d8a4' },
    far: { light: '#0a8a0a', dark: '#0ca30c' },
  },
} as const

/** Neutrale Serienfarbe (Tooltip-Marke/Basislinie) divergierender Serien. */
export const NEUTRAL_SERIES_COLOR = {
  light: 'var(--muted-foreground)',
  dark: 'var(--muted-foreground)',
} as const

/** `"2025-06-10T00:15:00"` (lokale Zeit) → Epoch-Millisekunden. */
export function parseApiDateTime(value: string): number {
  return new Date(value).getTime()
}

/** `"2025-06-10"` → Epoch-ms des lokalen Tagesbeginns. */
export function dayStartMs(date: string): number {
  return new Date(`${date}T00:00:00`).getTime()
}

/** Mitternacht NACH `date` (DST-sicher über Kalendertage). */
export function nextDayStartMs(date: string): number {
  const cursor = new Date(`${date}T00:00:00`)
  cursor.setDate(cursor.getDate() + 1)
  return cursor.getTime()
}

/** X-Domain des Fensters: [from 00:00, until 23:45] (letzte 15-Minuten-Scheibe). */
export function chartDomain(from: string, until: string): [number, number] {
  return [dayStartMs(from), nextDayStartMs(until) - QUARTER_HOUR_MS]
}

/** Achsen-Ticks alle `stepHours` Stunden über das gesamte Fenster. */
export function timeTicks(
  from: string,
  until: string,
  stepHours = 6,
): Array<number> {
  const ticks: Array<number> = []
  const end = nextDayStartMs(until)
  const cursor = new Date(`${from}T00:00:00`)
  while (cursor.getTime() < end) {
    ticks.push(cursor.getTime())
    cursor.setHours(cursor.getHours() + stepHours)
  }
  return ticks
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** Epoch-ms → `"HH:mm"` (lokale Zeit). */
export function formatUhrzeit(ms: number): string {
  const date = new Date(ms)
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Tick-Beschriftung: Mitternacht → `"10.06."`, sonst `"HH:mm"`. */
export function formatTimeTick(ms: number): string {
  const date = new Date(ms)
  return date.getHours() === 0 && date.getMinutes() === 0
    ? `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.`
    : formatUhrzeit(ms)
}

/** Tooltip-Titel: `"10.06.2025, 12:00 – 12:15 Uhr"`. */
export function formatSliceLabel(
  startMs: number,
  endMs = startMs + QUARTER_HOUR_MS,
): string {
  const date = new Date(startMs)
  const day = `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`
  return `${day}, ${formatUhrzeit(startMs)} – ${formatUhrzeit(endMs)} Uhr`
}

const dayHeadingFormat = new Intl.DateTimeFormat('de-DE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/** `"2025-06-10"` → `"Dienstag, 10. Juni 2025"` (Tabellen-Überschriften). */
export function formatDayHeading(date: string): string {
  return dayHeadingFormat.format(new Date(`${date}T00:00:00`))
}

const ctValueFormat = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
})

/** Preiswert in ct/kWh: `8.213` → `"8,213"` (2–4 Nachkommastellen wie im Altsystem). */
export function formatCtValue(value: number): string {
  return ctValueFormat.format(value)
}

const ctSummaryFormat = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * Gerundeter ct/kWh-Wert für Überschriften und Beschriftungen: `38.9155` →
 * `"38,92"`. Exakte Werte stehen weiterhin im Tooltip und in den Tabellen.
 */
export function formatCtSummary(value: number): string {
  return ctSummaryFormat.format(value)
}

const kwhValueFormat = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
})

/** Verbrauchswert in kWh: `1.5` → `"1,500"` (3 Nachkommastellen wie im Altsystem). */
export function formatKwhValue(value: number): string {
  return kwhValueFormat.format(value)
}

/** Ein Datenpunkt der Recharts-Zeitreihe (fehlende Scheiben → `null`-Lücke). */
export interface QuarterHourPoint {
  [seriesKey: string]: number | null
  ts: number
}

/**
 * Lückenlose 15-Minuten-Zeitreihe über das Fenster. Fehlende Scheiben werden
 * mit `null` gefüllt, damit die Stufenlinie dort abreißt (kein `spanGaps`,
 * wie im alten Chart.js-Setup). Die Zuordnung läuft über Epoch-ms und ist
 * damit auch an DST-Tagen korrekt.
 */
export function buildQuarterHourSeries<T>(options: {
  from: string
  until: string
  entries: ReadonlyArray<T>
  getStart: (entry: T) => string
  getValues: (entry: T) => Record<string, number>
  keys: ReadonlyArray<string>
}): Array<QuarterHourPoint> {
  const { from, until, entries, getStart, getValues, keys } = options

  const byStart = new Map<number, Record<string, number>>()
  for (const entry of entries) {
    byStart.set(parseApiDateTime(getStart(entry)), getValues(entry))
  }

  const points: Array<QuarterHourPoint> = []
  const end = nextDayStartMs(until)
  for (let ts = dayStartMs(from); ts < end; ts += QUARTER_HOUR_MS) {
    const values = byStart.get(ts)
    const point: QuarterHourPoint = { ts }
    for (const key of keys) {
      point[key] = values?.[key] ?? null
    }
    points.push(point)
  }
  return points
}

/**
 * Tagesgrenzen (Mitternachte) innerhalb des Fensters, ohne den Fensterbeginn –
 * für gestrichelte ReferenceLines mit Datumslabel (wie im Altsystem).
 */
export function dayBoundaries(from: string, until: string): Array<number> {
  const boundaries: Array<number> = []
  const end = nextDayStartMs(until)
  const cursor = new Date(`${from}T00:00:00`)
  cursor.setDate(cursor.getDate() + 1)
  while (cursor.getTime() < end) {
    boundaries.push(cursor.getTime())
    cursor.setDate(cursor.getDate() + 1)
  }
  return boundaries
}

/** Aktueller Zeitpunkt, falls er im Fenster liegt – für die „Jetzt“-Linie. */
export function nowWithin(
  domain: readonly [number, number],
  now = Date.now(),
): number | null {
  return now >= domain[0] && now <= domain[1] ? now : null
}

/**
 * Gruppiert Einträge nach Kalendertag (`yyyy-mm-dd` aus dem Timestamp),
 * Reihenfolge bleibt erhalten – für die Tabellenübersicht je Tag.
 */
export function groupByDay<T>(
  entries: ReadonlyArray<T>,
  getStart: (entry: T) => string,
): Array<[string, Array<T>]> {
  const groups: Array<[string, Array<T>]> = []
  for (const entry of entries) {
    const day = getStart(entry).slice(0, 10)
    const last = groups[groups.length - 1]
    if (last !== undefined && last[0] === day) {
      last[1].push(entry)
    } else {
      groups.push([day, [entry]])
    }
  }
  return groups
}

/** Summe über eine Wertfunktion (Tagessummen der Tabellen). */
export function sumBy<T>(
  entries: ReadonlyArray<T>,
  getValue: (entry: T) => number,
): number {
  return entries.reduce((total, entry) => total + getValue(entry), 0)
}
