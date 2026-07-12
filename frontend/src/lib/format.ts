/**
 * Deutsche Formatierungshelfer (Intl, Locale de-DE).
 * Das Backend liefert rohe Zahlen und ISO-Daten – jede Formatierung passiert hier.
 */

const euroFormat = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
})

const kwhFormat = new Intl.NumberFormat('de-DE', {
  maximumFractionDigits: 2,
})

const dateFormat = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

function toDate(value: string | number | Date): Date {
  return value instanceof Date ? value : new Date(value)
}

/** `1234.5` → `"1.234,50 €"` */
export function formatEuro(value: number): string {
  return euroFormat.format(value)
}

/** `32.456` → `"32,46 ct"`; Nachkommastellen per `digits` steuerbar. */
export function formatCt(value: number, digits = 2): string {
  const format = new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
  return `${format.format(value)} ct`
}

/** `1234.5` → `"1.234,5 kWh"` */
export function formatKwh(value: number): string {
  return `${kwhFormat.format(value)} kWh`
}

/** `1234.5` → `"1.234,5"` (de-DE, max. 2 Nachkommastellen) */
export function formatNumber(value: number): string {
  return kwhFormat.format(value)
}

/** `yyyy-mm-dd` als lokales Datum (– `new Date(string)` wäre UTC-Mitternacht). */
export function parseIsoDate(value: string): Date {
  return new Date(
    Number(value.slice(0, 4)),
    Number(value.slice(5, 7)) - 1,
    Number(value.slice(8, 10)),
  )
}

/** Lokales Datum → `yyyy-mm-dd` (toISOString würde in UTC kippen). */
export function toIsoDate(date: Date): string {
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** ISO-Datum/Date → `"dd.MM.yyyy"` */
export function formatDate(value: string | number | Date): string {
  return dateFormat.format(toDate(value))
}

/** `"DE69284500000021025564"` → `"DE69 2845 0000 0021 0255 64"` */
export function formatIban(value: string): string {
  const compact = value.replace(/\s+/g, '').toUpperCase()
  return compact.replace(/(.{4})/g, '$1 ').trim()
}
