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
