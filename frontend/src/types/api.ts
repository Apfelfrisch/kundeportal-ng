/**
 * TypeScript-Typen für den API-Vertrag des Laravel-Backends.
 * Alle Antworten sind in `{ data: ... }` eingehüllt (Laravel API Resources).
 */

export interface ApiResponse<T> {
  data: T
}

export interface User {
  id: number
  name: string
  email: string
  admin: boolean
  email_verified: boolean
  password_set: boolean
  customer_number: string | null
}

export interface MessengerChannel {
  active: boolean
  technic: string
  show: string
}

export interface TenantContact {
  website: string
  messenger: {
    telegram: MessengerChannel
    signal: MessengerChannel
    'whats-app': MessengerChannel
    sms: MessengerChannel
  }
  tel: {
    technic: string
    show: string
  }
  fax: {
    technic: string
    show: string
  }
  email: string
  address: {
    street: string
    city: string
  }
  'opening-hours': {
    long: string
    short: string
  }
}

export interface TenantLegal {
  'district-court': string
  sales_tax_id: string
  'tax-number': string
  managing_director: string
  creditor_identification_number: string
}

export interface TenantBank {
  name: string
  iban: string
  bic: string
}

export interface TenantFeatures {
  dynamic_electric_prices: boolean
  edi_load_profiles: boolean
}

export interface Tenant {
  slug: string
  name: {
    long: string
    short: string
  }
  website: {
    href: string
    show: string
  }
  contact: TenantContact
  legal: TenantLegal
  bank: TenantBank
  features: TenantFeatures
}

/** 422-Antwort: { message, errors: { feld: [meldung, ...] } } */
export type ValidationErrors = Record<string, Array<string>>

/** Strukturierte Fehlercodes des Backends (409/403). */
export type ApiErrorCode =
  'password_not_set' | 'email_unverified' | (string & {})

export interface AccountSetupInfo {
  name: string
  email: string
}

export interface ContractConfirmationInfo {
  contract_number: string
}

/* ------------------------------------------------------------------ */
/* Kundenbereich: Verträge                                             */
/* ------------------------------------------------------------------ */

export interface ContractStatusInfo {
  id: number
  label: string
}

export interface Address {
  zip: string | null
  city: string | null
  street: string | null
  street_number: string | null
  address_additive: string | null
}

/** Eintrag der Vertragsliste (ContractSummaryResource). */
export interface ContractSummary {
  contract_number: number
  status: ContractStatusInfo
  tariff: string | null
  delivery_address: Address | null
  meter_number: string | null
  malo_id: string | null
  yearly_consumption: number | null
  delivery_start: string | null
  delivery_end: string | null
  installment_amount_cents: number | null
}

export interface PaymentPlan {
  /** KVS liefert den Betrag in Eurocent. */
  amount_cents: number | null
  valid_from: string | null
  valid_until: string | null
  next_payment: string | null
  type: string | null
}

export interface Meter {
  id: number | string
  meter_number: string | null
  /** `ET` = Eintarifzähler, sonst HT/NT-Zweitarifzähler. */
  type: string | null
  smart_meter: boolean | null
}

export interface MeterCountLabel {
  value: string
  label: string
}

export interface MeterCount {
  id: number | string
  meter_number: string | null
  reading_kind: MeterCountLabel | null
  reading_type: MeterCountLabel | null
  reading_date: string | null
  meter_count_1: number | null
  meter_count_2: number | null
  meter_count_3: number | null
  yearly_usage: number | null
}

export interface MeterPoint {
  id: number | string
  malo_id: string | null
  zip: string | null
  city: string | null
  street: string | null
  street_number: string | null
  address_additive: string | null
  yearly_consumption: number | null
  delivery_from: string | null
  delivery_until: string | null
  /** Aufsteigend nach Einbaudatum – der erste Zähler ist der „aktive“. */
  meters: Array<Meter>
  /** Absteigend nach Ablesedatum – der erste Eintrag ist der neueste. */
  meter_counts: Array<MeterCount>
}

export interface Invoice {
  id: number | string
  invoice_number: string | null
  invoice_date: string | null
  invoice_from: string | null
  consumption: number | null
  canceled_at: string | null
}

export interface ContractFile {
  id: number | string
  body: string | null
  tag: string | null
  filename: string | null
  created_at: string | null
}

export interface ContractPayment {
  id: number | string
  booking_date: string | null
  /** Beträge in Eurocent. */
  incoming_payment: number | null
  outgoing_payment: number | null
  counter_account: string | null
}

export interface ContractPrices {
  working_price_ct: number | null
  working_price_ct_gross: number | null
  base_price_eur: number | null
  base_price_eur_gross: number | null
  /** Label → Betrag in Euro pro Jahr (netto). */
  base_price_components: Record<string, number>
  /** Label → Betrag in ct/kWh (netto). */
  working_price_components: Record<string, number>
  calculated_dynamic_working_price_ct: number | null
  tariff_effective_from: string | null
}

export interface ContractBank {
  iban: string | null
  bank: string | null
  account_owner: string | null
  sepa: boolean | null
}

export interface BillingContact {
  company: string | null
  salutation: string | null
  title: string | null
  first_name: string | null
  last_name: string | null
}

export interface ContractContact {
  phone: string | null
  mobile: string | null
  mail: string | null
  send_emails: boolean | null
}

/** Vollständiger Vertrag (ContractResource). */
export interface Contract {
  contract_number: number
  customer_number: number | string | null
  status: ContractStatusInfo
  tariff: string | null
  price_type: string | null
  is_dynamic: boolean
  received_at: string | null
  delivery_start: string | null
  delivery_end: string | null
  price_guarantee: string | null
  contract_term: string | null
  earliest_termination_date: string | null
  prices: ContractPrices
  sales_partner: string | null
  bank: ContractBank
  billing_contact: BillingContact
  billing_address: Address
  contact: ContractContact
  installment: PaymentPlan | null
  payment_plans: Array<PaymentPlan>
  meter_points: Array<MeterPoint>
  invoices: Array<Invoice>
  files: Array<ContractFile>
  payments: Array<ContractPayment>
}

/* ------------------------------------------------------------------ */
/* Postfach                                                            */
/* ------------------------------------------------------------------ */

export interface MailboxFile {
  id: number | string
  name: string
  mime_type: string | null
}

export interface MailboxEntry {
  id: number | string
  direction: 'customer' | 'company'
  form_type: string | null
  subject: string | null
  message: string
  created_at: string | null
  read_at: string | null
  files: Array<MailboxFile>
}

/* ------------------------------------------------------------------ */
/* Profil                                                              */
/* ------------------------------------------------------------------ */

export interface Profile {
  id: number
  name: string
  email: string
  customer_number: string | null
  email_verified: boolean
  password_set: boolean
}

/** Antwort der Profil-Endpunkte: `{ data, message? }`. */
export interface ProfileResponse {
  data: Profile
  message?: string
}

/** 201-Antwort eines Änderungsformulars: Ticket + deutscher Info-HTML-Text. */
export interface ChangeRequestResponse {
  data: {
    id: number | string
    form_type: string
    contract_number: string
    status: string
    data: Record<string, unknown>
    created_at: string | null
  }
  info: string
}
