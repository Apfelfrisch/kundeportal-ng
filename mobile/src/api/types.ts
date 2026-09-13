/**
 * Typen des API-Vertrags, die die App nutzt – Teilmenge von
 * `frontend/src/types/api.ts` (gleiche Feldnamen, gleiche Semantik).
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

/** Antwort von `POST /api/auth/token`. */
export interface TokenResponse extends ApiResponse<User> {
  token: string
}

export interface Tenant {
  slug: string
  name: { long: string; short: string }
  features: {
    dynamic_electric_prices: boolean
    edi_load_profiles: boolean
  }
}

/** 422-Antwort: { message, errors: { feld: [meldung, ...] } } */
export type ValidationErrors = Record<string, Array<string>>

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
  /** Letzter Tag des Abrechnungszeitraums (inklusive). */
  invoice_until: string | null
  consumption: number | null
  /** Netto- und Steuerbetrag in Eurocent. */
  amount_cents: number | null
  tax_amount_cents: number | null
  canceled_at: string | null
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
  payments: Array<ContractPayment>
}

export interface Profile {
  id: number
  name: string
  email: string
  customer_number: string | null
  email_verified: boolean
  password_set: boolean
}

export interface ProfileResponse {
  data: Profile
  message?: string
}

/** Viertelstündlicher Börsenpreis; `starts_at` ohne Zeitzone = Ortszeit des Servers. */
export interface MarketPrice {
  starts_at: string
  ends_at: string
  cent_per_kwh: number
}

/** GET /api/customers/{user}/market-prices (MarketPriceDayResource). */
export interface MarketPriceDay {
  date: string
  from: string
  until: string
  prices: Array<MarketPrice>
  navigation: { prev_date: string; next_date: string | null }
  /** Fester Tarifaufschlag (ct/kWh) ohne Börsenanteil; null ohne dynamischen Vertrag. */
  tariff_costs: { total_ct: number; components: Record<string, number> } | null
}

export type UsagePeriod = 'day' | 'month' | 'year'

/**
 * Ein Balken des Verbrauchsdiagramms (Stunde, Tag oder Monat): abgerechneter
 * und noch nicht abgerechneter Verbrauch zusammen, Kosten in Cent netto für
 * den ganzen Balken – Arbeitspreis-Anteile und anteilige Grundpreise
 * getrennt. `unbilled_*` ist der vorläufige Anteil (Lastgang ×
 * Börsenpreis); `has_data = false` markiert eine Lücke ohne Werte.
 */
export interface UsageBucket {
  from: string
  until: string
  has_data: boolean
  usage_kwh: number
  unbilled_kwh: number
  cost_ct: number
  unbilled_ct: number
  legal_ct: number
  supplier_ct: number
  stock_exchange_ct: number
  legal_base_ct: number
  supplier_base_ct: number
  /** Verbrauchsgewichteter Arbeitspreis in ct/kWh; null ohne Verbrauch. */
  average_ct_kwh: number | null
  /** Einfacher Durchschnitt des Arbeitspreises über die Viertelstunden – die Preislinie; null ohne Werte. */
  price_ct_kwh: number | null
}

/** GET /api/customers/{user}/contracts/{contract}/usage (BilledUsageResource). */
export interface UsageWindow {
  /** Balkengröße: Tag in Stunden, Monat in Tagen, Jahr in Monaten. */
  period: UsagePeriod
  /** Erster und letzter Tag des Zeitraums (`yyyy-mm-dd`); `from` ist auch der Wert der Zeitraum-Tabs. */
  from: string
  until: string
  /** Spanne mit Werten (abgerechnet oder vorläufig); null ohne jeden Wert. */
  available: { from: string; until: string } | null
  totals: UsageBucket
  buckets: Array<UsageBucket>
  /**
   * Rechnungen, die den Zeitraum lückenlos abdecken – dann gilt deren
   * Nettobetrag statt der viertelstundengenauen Summe. Null sonst.
   */
  invoiced: { amount_cents: number; consumption_kwh: number; invoice_numbers: Array<string> } | null
}

/** 201-Antwort eines Änderungsformulars. */
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
