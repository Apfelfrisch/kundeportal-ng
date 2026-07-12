import { z } from 'zod'

import { installmentRange, isSingleTariffMeter } from '#/lib/contracts'
import { formatDate, formatEuro, toIsoDate } from '#/lib/format'
import type { Contract } from '#/types/api'

/**
 * Konfiguration der acht Änderungsformulare (`aendern/$formType`).
 *
 * Die Feldnamen entsprechen exakt den flexAttributes des Backends
 * (`ChangeRequestService::flexAttributes()`); Labels und Hilfetexte sind aus
 * den alten change-data-Blade-Views portiert. Zahlen werden wie im Altsystem
 * als Strings übertragen – Laravels `integer`-Regel akzeptiert numerische
 * Strings, und das Ticket speichert ohnehin die rohen Eingaben.
 */

export const CHANGE_REQUEST_TYPES = [
  'bank',
  'billing-address',
  'delivery-address',
  'contact-data',
  'installment',
  'meter-count',
  'termination',
  'revocation',
] as const

export type ChangeRequestType = (typeof CHANGE_REQUEST_TYPES)[number]

export function isChangeRequestType(
  value: string,
): value is ChangeRequestType {
  return (CHANGE_REQUEST_TYPES as ReadonlyArray<string>).includes(value)
}

/** Formularwerte: Texte/Daten als String, Checkboxen als Boolean. */
export type ChangeRequestValues = Record<string, string | boolean>

export interface ChangeRequestField {
  name: string
  label: string
  type: 'text' | 'email' | 'number' | 'date' | 'textarea' | 'checkbox'
  required?: boolean
  help?: string
  placeholder?: string
  min?: string
  max?: string
  /** Rasterbreite auf md+: 12 = volle Breite (Standard), 6/4/3 wie Bootstrap. */
  cols?: 12 | 8 | 6 | 4 | 3
}

export interface ChangeRequestConfig {
  title: string
  /** Einleitende Absätze über dem Formular. */
  intro: Array<string>
  /** Fett hervorgehobener Hinweis (z. B. „Wichtig:“ / „Bitte beachte“). */
  noticeTitle?: string
  notice?: Array<string>
  /** Aufzählungspunkte unterhalb des Hinweises. */
  bullets?: Array<string>
  fields: Array<ChangeRequestField>
  defaults: ChangeRequestValues
  schema: z.ZodType<ChangeRequestValues, ChangeRequestValues>
}

/* ------------------------------------------------------------------ */
/* Wiederverwendbare Schema-Bausteine                                  */
/* ------------------------------------------------------------------ */

const IBAN_PATTERN = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/

/**
 * Nur Längen-/Formatprüfung – die Prüfsumme validiert ausschließlich das
 * Backend (globalcitizen/php-iban).
 */
export function isIbanFormat(value: string): boolean {
  return IBAN_PATTERN.test(value.replace(/\s+/g, '').toUpperCase())
}

const requiredText = (message: string) => z.string().trim().min(1, message)

const optionalText = z.string()

const zipSchema = z
  .string()
  .regex(
    /^\d{5}$/,
    'Bitte genau 5 Zahlen für die Postleitzahl eingeben. Wenn vorhanden auch mit einer 0 am Anfang.',
  )

const requiredDate = (message: string) => z.string().min(1, message)

const optionalEmail = z
  .string()
  .refine(
    (value) => value === '' || z.email().safeParse(value).success,
    'Bitte gib eine gültige E-Mail-Adresse ein.',
  )

const integerString = (message: string) =>
  z.string().refine((value) => value === '' || /^\d+$/.test(value), message)

function todayIso(): string {
  return toIsoDate(new Date())
}

/* ------------------------------------------------------------------ */
/* Schemata pro Formulartyp (contract-abhängige als Factory)           */
/* ------------------------------------------------------------------ */

export const bankSchema = z.object({
  iban: requiredText('Bitte gib deine IBAN an.').refine(
    isIbanFormat,
    'Bitte gib eine gültige IBAN ein (z. B. DE12 3456 7890 1234 5678 90).',
  ),
  bank: requiredText('Bitte gib dein Bankinstitut an.'),
  bank_account_owner: requiredText('Bitte gib den Kontoinhaber an.'),
  sepa: z.boolean(),
  change_all_contracts: z.boolean(),
})

export const billingAddressSchema = z.object({
  street: requiredText('Bitte gib die Straße an.'),
  street_number: requiredText('Bitte gib die Hausnummer an.'),
  address_additive: optionalText,
  zip: zipSchema,
  city: requiredText('Bitte gib den Ort an.'),
  change_all_contracts: z.boolean(),
})

export const deliveryAddressSchema = z.object({
  street: requiredText('Bitte gib die Straße an.'),
  street_number: requiredText('Bitte gib die Hausnummer an.'),
  address_additive: optionalText,
  zip: zipSchema,
  city: requiredText('Bitte gib den Ort an.'),
  date: requiredDate('Bitte gib das Einzugsdatum an.'),
  meter_number: optionalText,
  malo: optionalText,
})

export const contactDataSchema = z.object({
  phone: optionalText,
  mobile: optionalText,
  mail: optionalEmail,
  send_emails: z.boolean(),
  change_all_contracts: z.boolean(),
})

export function installmentSchema(min: number, max: number) {
  return z.object({
    installment: z
      .string()
      .regex(/^\d+$/, 'Gib bitte nur eine ganze Zahl, ohne Nachkommastelle, ein.')
      .refine(
        (value) => Number(value) >= min && Number(value) <= max,
        `Wähle den gewünschten monatlichen Abschlag zwischen ${min} € und ${max} €.`,
      ),
    effective_from: requiredDate('Bitte gib an, ab wann der Abschlag gelten soll.')
      .refine(
        (value) => value >= todayIso(),
        'Das gewählte Startdatum muss in der Zukunft liegen.',
      ),
  })
}

const integerHint = 'Gib bitte nur eine ganze Zahl, ohne Nachkommastelle, ein.'

/**
 * Zählerstands-Matrix wie im Backend:
 * `meter_count` required_without_all `meter_count_ht`/`meter_count_nt`,
 * HT und NT jeweils required_without `meter_count`.
 */
export const meterCountSchema = z
  .object({
    meter_count: integerString(integerHint),
    meter_count_ht: integerString(integerHint),
    meter_count_nt: integerString(integerHint),
    read_on: requiredDate('Bitte gib das Ablesedatum an.'),
  })
  .superRefine((values, ctx) => {
    const single = values.meter_count !== ''
    const ht = values.meter_count_ht !== ''
    const nt = values.meter_count_nt !== ''

    if (!single && !ht && !nt) {
      ctx.addIssue({
        code: 'custom',
        path: ['meter_count'],
        message: 'Bitte gib einen Zählerstand an.',
      })
      return
    }

    if (!single && !ht) {
      ctx.addIssue({
        code: 'custom',
        path: ['meter_count_ht'],
        message: 'Bitte gib den Zählerstand HT an.',
      })
    }

    if (!single && !nt) {
      ctx.addIssue({
        code: 'custom',
        path: ['meter_count_nt'],
        message: 'Bitte gib den Zählerstand NT an.',
      })
    }
  })

export function terminationSchema(earliestTerminationDate: string | null) {
  return z.object({
    termination_at: requiredDate('Bitte gib das Kündigungsdatum an.').refine(
      (value) =>
        earliestTerminationDate === null || value >= earliestTerminationDate,
      earliestTerminationDate === null
        ? ''
        : `Das Kündigungsdatum darf nicht vor dem ${formatDate(earliestTerminationDate)} liegen.`,
    ),
    reason_of_termination: optionalText,
  })
}

export const revocationSchema = z.object({
  reason_of_revocation: optionalText,
})

/* ------------------------------------------------------------------ */
/* Formularkonfiguration pro Typ                                       */
/* ------------------------------------------------------------------ */

export function changeRequestConfig(
  type: ChangeRequestType,
  contract: Contract,
): ChangeRequestConfig {
  switch (type) {
    case 'bank':
      return {
        title: 'Bankdaten',
        intro: [
          'Über das folgende Formular kannst du die Bankdaten für deinen Vertrag bearbeiten.',
        ],
        fields: [
          { name: 'iban', label: 'IBAN', type: 'text', required: true },
          { name: 'bank', label: 'Bankinstitut', type: 'text', required: true },
          {
            name: 'bank_account_owner',
            label: 'Vor- und Nachname des Kontoinhabers',
            type: 'text',
            required: true,
          },
          {
            name: 'sepa',
            label: 'SEPA Mandat erteilen',
            type: 'checkbox',
            help: 'Bitte bestätige hier, wenn wir die Abschläge direkt von deinem Konto einziehen dürfen.',
          },
          {
            name: 'change_all_contracts',
            label: 'Bankverbindung für alle Verträge ändern',
            type: 'checkbox',
            help: 'Bitte bestätige hier, wenn die neue Bankverbindung für alle deine Verträge übernommen werden soll.',
          },
        ],
        defaults: {
          iban: '',
          bank: '',
          bank_account_owner: '',
          sepa: contract.bank.sepa ?? false,
          change_all_contracts: false,
        },
        schema: bankSchema,
      }
    case 'billing-address':
      return {
        title: 'Rechnungsadresse',
        intro: [
          'Über das folgende Formular kannst du deine Rechnungsadresse bearbeiten.',
        ],
        fields: [
          { name: 'street', label: 'Straße', type: 'text', required: true, cols: 4 },
          {
            name: 'street_number',
            label: 'Hausnummer',
            type: 'text',
            required: true,
            cols: 4,
          },
          { name: 'address_additive', label: 'Adresszusatz', type: 'text', cols: 4 },
          { name: 'zip', label: 'Postleitzahl', type: 'text', required: true, cols: 4 },
          { name: 'city', label: 'Ort', type: 'text', required: true, cols: 8 },
          {
            name: 'change_all_contracts',
            label: 'Rechnungsadresse für alle Verträge übernehmen',
            type: 'checkbox',
            help: 'Bitte bestätige hier, wenn die Rechnungsadresse für alle deine Verträge übernommen werden soll.',
          },
        ],
        defaults: {
          street: '',
          street_number: '',
          address_additive: '',
          zip: '',
          city: '',
          change_all_contracts: false,
        },
        schema: billingAddressSchema,
      }
    case 'delivery-address':
      return {
        title: 'Ändere hier deine Lieferadresse',
        intro: [
          'Nutze das folgende Formular, um uns deine neue Lieferadresse mitzuteilen.',
        ],
        noticeTitle: 'Wichtig:',
        bullets: [
          'Rückwirkende Anmeldungen von Ein- oder Umzügen sind leider nicht möglich',
          'Falls du bereits umgezogen bist, kümmern wir uns schnellstmöglich um die Anmeldung',
          'Bis zur erfolgreichen Umstellung erhältst du ggf. vorübergehend Strom über die Grundversorgung deines örtlichen Grundversorgers',
        ],
        fields: [
          { name: 'street', label: 'Straße', type: 'text', required: true, cols: 6 },
          {
            name: 'street_number',
            label: 'Hausnummer',
            type: 'text',
            required: true,
            cols: 3,
          },
          { name: 'address_additive', label: 'Adresszusatz', type: 'text', cols: 3 },
          { name: 'zip', label: 'PLZ', type: 'text', required: true, cols: 3 },
          { name: 'city', label: 'Ort', type: 'text', required: true, cols: 6 },
          {
            name: 'date',
            label: 'Einzugsdatum',
            type: 'date',
            required: true,
            cols: 3,
          },
          { name: 'meter_number', label: 'Zählernummer', type: 'text', cols: 6 },
          { name: 'malo', label: 'Malo-ID', type: 'text', cols: 6 },
        ],
        defaults: {
          street: '',
          street_number: '',
          address_additive: '',
          zip: '',
          city: '',
          date: '',
          meter_number: '',
          malo: '',
        },
        schema: deliveryAddressSchema,
      }
    case 'contact-data':
      return {
        title: 'Kontaktdaten bearbeiten',
        intro: [
          'Ändere über das folgende Formular deine Kontaktdaten.',
          'Trage nur die neuen Kontaktdaten ein.',
          'Die E-Mail-Adresse für die Anmeldung bei unserem Kundenportal kannst du hier nicht ändern.',
        ],
        fields: [
          {
            name: 'phone',
            label: 'Telefonnummer',
            type: 'text',
            placeholder: contract.contact.phone ?? undefined,
          },
          {
            name: 'mobile',
            label: 'Mobilnummer',
            type: 'text',
            placeholder: contract.contact.mobile ?? undefined,
          },
          {
            name: 'mail',
            label: 'E-Mail-Adresse',
            type: 'email',
            placeholder: contract.contact.mail ?? undefined,
          },
          {
            name: 'send_emails',
            label: 'Kommunikation per Mail',
            type: 'checkbox',
            help: 'Bitte kreuze hier an, wenn du Kommunikation per E-Mail wünschst.',
          },
          {
            name: 'change_all_contracts',
            label: 'Kontaktdaten für alle Verträge ändern',
            type: 'checkbox',
            help: 'Bitte bestätige hier, wenn die Kontaktdaten für alle deine Verträge übernommen werden sollen.',
          },
        ],
        defaults: {
          phone: '',
          mobile: '',
          mail: '',
          send_emails: contract.contact.send_emails ?? false,
          change_all_contracts: false,
        },
        schema: contactDataSchema,
      }
    case 'installment': {
      const range = installmentRange(contract)
      return {
        title: 'Wunschabschlag',
        intro: ['Gib hier deinen gewünschten monatlichen Abschlag an.'],
        noticeTitle: 'Bitte beachte',
        notice: [
          `Dein aktueller monatlicher Abschlag beträgt ${formatEuro(range.current)}.`,
          'Das gewählte Startdatum (Gültig ab) muss in der Zukunft liegen.',
        ],
        fields: [
          {
            name: 'installment',
            label: 'Neuer Abschlag',
            type: 'number',
            required: true,
            min: String(range.min),
            max: String(range.max),
            help: `Wähle den gewünschten monatlichen Abschlag zwischen ${range.min} € und ${range.max} €.`,
          },
          {
            name: 'effective_from',
            label: 'Gültig ab',
            type: 'date',
            required: true,
            min: todayIso(),
          },
        ],
        defaults: {
          installment: String(range.current),
          effective_from: '',
        },
        schema: installmentSchema(range.min, range.max),
      }
    }
    case 'meter-count': {
      const singleTariff = isSingleTariffMeter(contract)
      return {
        title: 'Zählerstand mitteilen',
        intro: ['Teile uns hier deinen neuen Zählerstand mit.'],
        fields: [
          ...(singleTariff
            ? [
                {
                  name: 'meter_count',
                  label: 'Zählerstand',
                  type: 'number',
                  required: true,
                  help: integerHint,
                } satisfies ChangeRequestField,
              ]
            : [
                {
                  name: 'meter_count_ht',
                  label: 'Zählerstand HT',
                  type: 'number',
                  required: true,
                  help: integerHint,
                } satisfies ChangeRequestField,
                {
                  name: 'meter_count_nt',
                  label: 'Zählerstand NT',
                  type: 'number',
                  required: true,
                  help: integerHint,
                } satisfies ChangeRequestField,
              ]),
          {
            name: 'read_on',
            label: 'Abgelesen am',
            type: 'date',
            required: true,
          },
        ],
        defaults: {
          meter_count: '',
          meter_count_ht: '',
          meter_count_nt: '',
          read_on: '',
        },
        schema: meterCountSchema,
      }
    }
    case 'termination':
      return {
        title: 'Kündigen',
        intro: [
          'Kündige hier deinen Vertrag.',
          ...(contract.earliest_termination_date !== null
            ? [
                `Frühestes Kündigungsdatum: ${formatDate(contract.earliest_termination_date)}`,
              ]
            : []),
        ],
        fields: [
          {
            name: 'termination_at',
            label: 'Kündigen zum',
            type: 'date',
            required: true,
            min: contract.earliest_termination_date ?? undefined,
          },
          {
            name: 'reason_of_termination',
            label: 'Kündigungsgrund',
            type: 'textarea',
            help: 'Schreib uns bitte kurz, warum du uns verlassen möchtest.',
          },
        ],
        defaults: {
          termination_at: contract.earliest_termination_date ?? '',
          reason_of_termination: '',
        },
        schema: terminationSchema(contract.earliest_termination_date),
      }
    case 'revocation':
      return {
        title: 'Widerruf',
        intro: [
          'Binnen vierzehn Tagen hast du als Verbraucher das Recht, deinen Vertrag ohne Angabe von Gründen zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses.',
          'Fülle bitte das folgende Formular aus. Wir senden dir umgehend eine Bestätigung deines Widerrufs.',
        ],
        fields: [
          {
            name: 'reason_of_revocation',
            label: 'Widerrufsgrund',
            type: 'textarea',
            help: 'Teile uns optional mit, warum du widerrufen möchtest.',
          },
        ],
        defaults: { reason_of_revocation: '' },
        schema: revocationSchema,
      }
  }
}
