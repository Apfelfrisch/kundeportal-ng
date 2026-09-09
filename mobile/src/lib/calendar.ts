/** Reine Kalenderhelfer für die eigene Monatsansicht (Wochenstart Montag). */

export const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const

export const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'] as const

const monthFormat = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' })

export function formatMonth(year: number, month: number): string {
  return monthFormat.format(new Date(year, month, 1))
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** Monat verschieben, Ergebnis immer der 1. des Zielmonats. */
export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const date = new Date(year, month + delta, 1)
  return { year: date.getFullYear(), month: date.getMonth() }
}

/**
 * Wochenzeilen eines Monats: je sieben Einträge Montag–Sonntag, Tage
 * außerhalb des Monats als null.
 */
export function monthGrid(year: number, month: number): Array<Array<Date | null>> {
  const first = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  // getDay(): 0 = Sonntag → Montag-basiert 0..6
  const leading = (first.getDay() + 6) % 7

  const cells: Array<Date | null> = Array<Date | null>(leading).fill(null)
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(new Date(year, month, day))
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks: Array<Array<Date | null>> = []
  for (let index = 0; index < cells.length; index += 7) weeks.push(cells.slice(index, index + 7))
  return weeks
}

export function isWithin(date: Date, minimum: Date | undefined, maximum: Date | undefined): boolean {
  const day = startOfDay(date).getTime()
  if (minimum !== undefined && day < startOfDay(minimum).getTime()) return false
  if (maximum !== undefined && day > startOfDay(maximum).getTime()) return false
  return true
}

/**
 * Wählbare Jahre der Schnellauswahl: der erlaubte Bereich, sonst zehn
 * Jahre zurück und ein Jahr voraus um das angezeigte Jahr.
 */
export function yearRange(year: number, minimum: Date | undefined, maximum: Date | undefined): Array<number> {
  const from = minimum?.getFullYear() ?? Math.min(year, new Date().getFullYear()) - 10
  const to = maximum?.getFullYear() ?? Math.max(year, new Date().getFullYear()) + 1
  const years: Array<number> = []
  for (let entry = from; entry <= to; entry += 1) years.push(entry)
  return years
}
