/**
 * Deutsche Formatierungshelfer (Intl, Locale de-DE) – Kopie der
 * Frontend-Helfer, damit die App dieselben Darstellungen liefert.
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

/** `1234.5` → `"1.234,50 €"` */
export function formatEuro(value: number): string {
  return euroFormat.format(value)
}

/** Eurocent → `"89,00 €"` */
export function formatCents(cents: number): string {
  return formatEuro(cents / 100)
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

/** `yyyy-mm-dd` als lokales Datum (`new Date(string)` wäre UTC-Mitternacht). */
export function parseIsoDate(value: string): Date {
  return new Date(
    Number(value.slice(0, 4)),
    Number(value.slice(5, 7)) - 1,
    Number(value.slice(8, 10)),
  )
}

/** Lokales Datum → `yyyy-mm-dd`. */
export function toIsoDate(date: Date): string {
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** ISO-Datum → `"dd.MM.yyyy"`; null/leer → `"–"`. */
export function formatDate(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '–'
  return dateFormat.format(parseIsoDate(value))
}

/** Lokales Datum → `"dd.MM.yyyy"` (Formularvorbelegung). */
export function formatDateValue(date: Date): string {
  return dateFormat.format(date)
}

/** `"DE69284500000021025564"` → `"DE69 2845 0000 0021 0255 64"` */
export function formatIban(value: string): string {
  const compact = value.replace(/\s+/g, '').toUpperCase()
  return compact.replace(/(.{4})/g, '$1 ').trim()
}

/** Nur Land und letzte vier Stellen: `"DE12 ···· ···· ···· 4567"`. */
export function maskIban(value: string): string {
  const compact = value.replace(/\s+/g, '').toUpperCase()
  if (compact.length < 8) return compact
  const groups = Math.max(0, Math.ceil((compact.length - 8) / 4))
  return [compact.slice(0, 4), ...Array(groups).fill('····'), compact.slice(-4)].join(' ')
}
