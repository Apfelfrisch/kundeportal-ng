import { formatDate, formatEuro, formatNumber } from '#/lib/format'
import { FORM_TYPE_LABELS } from '#/lib/mailbox'
import type { AdminTicketStatus } from '#/types/api'

/**
 * Admin-Helfer: Query-String-Bau für die Listen-Endpunkte, deutsche Labels
 * und Status-Übergänge der Tickets sowie die deutschen Feld-Labels der
 * Ticket-Daten (portiert aus den alten change-data-Karten).
 */

/** Filterwerte der Admin-Listen; leere Werte werden ausgelassen. */
export type AdminQueryParams = Record<
  string,
  string | number | boolean | null | undefined
>

/** Baut `?a=b&c=d` aus den Filtern; leere/fehlende Werte fallen weg. */
export function buildAdminQuery(params: AdminQueryParams): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }
  const query = search.toString()
  return query === '' ? '' : `?${query}`
}

/** Getrimmte Filter-Eingabe; leer → `undefined` (Suchparameter entfällt). */
export function emptyToUndefined(value: string): string | undefined {
  return value.trim() === '' ? undefined : value.trim()
}

/* ------------------------------------------------------------------ */
/* Ticket-Status                                                       */
/* ------------------------------------------------------------------ */

export const TICKET_STATUS_LABELS: Record<AdminTicketStatus, string> = {
  open: 'Offen',
  in_process: 'In Arbeit',
  processed: 'Erledigt',
}

export interface TicketStatusTransition {
  status: AdminTicketStatus
  label: string
}

/**
 * Erlaubte Status-Übergänge wie im alten Karten-Menü:
 * Offen → In Arbeit/Erledigt, In Arbeit → Erledigt/Offen,
 * Erledigt → In Arbeit/Offen.
 */
export function ticketStatusTransitions(
  status: AdminTicketStatus,
): Array<TicketStatusTransition> {
  switch (status) {
    case 'open':
      return [
        { status: 'in_process', label: 'In Arbeit nehmen' },
        { status: 'processed', label: 'Erledigt' },
      ]
    case 'in_process':
      return [
        { status: 'processed', label: 'Erledigt' },
        { status: 'open', label: 'Wieder öffnen' },
      ]
    case 'processed':
      return [
        { status: 'in_process', label: 'In Arbeit nehmen' },
        { status: 'open', label: 'Wieder öffnen' },
      ]
  }
}

/**
 * Deutscher Typ eines Tickets. Reine Chat-Nachrichten (`contact`) hießen
 * in den alten Karten „Nachricht“.
 */
export function ticketTypeLabel(formType: string | null): string {
  if (formType === null || formType === 'contact') return 'Nachricht'
  return FORM_TYPE_LABELS[formType] ?? formType
}

/* ------------------------------------------------------------------ */
/* Ticket-Daten (data-Objekt der Änderungsmeldungen)                   */
/* ------------------------------------------------------------------ */

/** Deutsche Labels der data-Schlüssel aus den alten change-data-Karten. */
export const TICKET_DATA_LABELS: Record<string, string> = {
  // Bankverbindung
  bank_account_owner: 'Name',
  iban: 'IBAN',
  bank: 'Bank',
  sepa: 'Sepa-Mandat erteilt',
  change_all_contracts: 'Für alle Verträge übernehmen',
  // Adressen
  zip: 'PLZ',
  city: 'Ort',
  street: 'Straße',
  street_number: 'Hausnummer',
  address_additive: 'Adresszusatz',
  date: 'Einzugsdatum',
  meter_number: 'Zählernummer',
  malo: 'Malo-ID',
  // Kontaktdaten
  phone: 'Telefonnummer',
  mobile: 'Mobilnummer',
  mail: 'E-Mail',
  send_emails: 'Kommunikation per Mail',
  // Vertragspartner
  salutation_1: 'Anrede (1. Vertragspartner)',
  first_name_1: 'Vorname (1. Vertragspartner)',
  sure_name_1: 'Nachname (1. Vertragspartner)',
  salutation_2: 'Anrede (2. Vertragspartner)',
  first_name_2: 'Vorname (2. Vertragspartner)',
  sure_name_2: 'Nachname (2. Vertragspartner)',
  company: 'Firma',
  // Abschlag
  installment: 'Neuer Abschlag',
  effective_from: 'Gültig ab',
  // Zählerstand
  meter_count: 'Zählerstand',
  meter_count_ht: 'Zählerstand HT',
  meter_count_nt: 'Zählerstand NT',
  read_on: 'Abgelesen am',
  // Kündigung / Widerruf
  termination_at: 'Kündigung zum',
  reason_of_termination: 'Kündigungsgrund',
  reason_of_revocation: 'Widerrufsgrund',
  // Chat-Nachricht
  message: 'Nachricht',
}

export function ticketDataLabel(key: string): string {
  return TICKET_DATA_LABELS[key] ?? key
}

const DATE_KEYS = new Set(['date', 'effective_from', 'read_on', 'termination_at'])

const EURO_KEYS = new Set(['installment'])

const KWH_KEYS = new Set(['meter_count', 'meter_count_ht', 'meter_count_nt'])

/** Formatiert einen data-Wert deutsch (Ja/Nein, Datum, €, kWh). */
export function formatTicketDataValue(key: string, value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Ja' : 'Nein'

  if (DATE_KEYS.has(key) && typeof value === 'string' && value !== '') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return formatDate(parsed)
  }

  const numeric =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : Number.NaN

  if (EURO_KEYS.has(key) && !Number.isNaN(numeric)) return formatEuro(numeric)
  if (KWH_KEYS.has(key) && !Number.isNaN(numeric)) {
    return `${formatNumber(numeric)} kWh`
  }

  return String(value)
}

export interface TicketDataEntry {
  key: string
  label: string
  value: string
}

/** Nicht-leere data-Einträge eines Tickets, deutsch gelabelt und formatiert. */
export function ticketDataEntries(
  data: Record<string, unknown>,
): Array<TicketDataEntry> {
  const entries: Array<TicketDataEntry> = []
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null || value === '') continue
    entries.push({
      key,
      label: ticketDataLabel(key),
      value: formatTicketDataValue(key, value),
    })
  }
  return entries
}
