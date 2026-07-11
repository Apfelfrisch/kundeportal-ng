import { queryOptions } from '@tanstack/react-query'

import { get } from '#/api/client'
import type { ApiResponse } from '#/types/api'

/**
 * Chart-Queries: Börsenpreise sowie abgerechnete/EDI-Lastprofile.
 * Alle Endpunkte liefern ein 3-Tage-Fenster (Zentrumstag ± 1) mit
 * 15-Minuten-Scheiben; ohne `date` wählt das Backend den Standardtag
 * (jüngster Datenbestand). Feature-Flag aus → 404.
 */

export interface ChartNavigation {
  prev_date: string
  /** null: das nächste Fenster wäre nicht mehr voll mit Preisen abgedeckt. */
  next_date: string | null
}

export interface MarketPriceSlot {
  /** `Y-m-dTH:i:s`, lokale Zeit. */
  starts_at: string
  ends_at: string
  cent_per_kwh: number
}

export interface MarketPricesDay {
  /**
   * Konstanter Tarifaufschlag (ct/kWh, netto, ohne Börsenbezug) des
   * dynamischen Vertrags — null ohne dynamischen Vertrag oder bei
   * KVS-Ausfall. `components`: übersetztes Label → ct/kWh.
   */
  tariff_costs: {
    total_ct: number
    components: Record<string, number>
  } | null
  date: string
  from: string
  until: string
  prices: Array<MarketPriceSlot>
  navigation: ChartNavigation
}

export interface BilledLoadProfileSlot {
  from: string
  until: string
  usage_kwh: number
  legal_costs_ct_kwh: number
  supplier_costs_ct_kwh: number
  stock_exchange_ct_kwh: number
  total_ct_kwh: number
}

export interface BilledLoadProfilesDay {
  date: string
  from: string
  until: string
  entries: Array<BilledLoadProfileSlot>
  navigation: ChartNavigation
}

export interface EdiLoadProfileSlot {
  from: string
  until: string
  usage_kwh: number
}

export interface EdiLoadProfilesDay {
  date: string
  from: string
  until: string
  entries: Array<EdiLoadProfileSlot>
  navigation: ChartNavigation
}

/** Marktpreise ändern sich selten unterjährig → ein paar Minuten frisch halten. */
const CHART_STALE_TIME = 1000 * 60 * 5

function withDate(path: string, date?: string): string {
  return date === undefined ? path : `${path}?date=${date}`
}

/** Börsenstrompreise (Feature-Flag `dynamic_electric_prices`). */
export const marketPricesQuery = (customerId: string, date?: string) =>
  queryOptions({
    queryKey: ['market-prices', customerId, date],
    queryFn: async ({ signal }): Promise<MarketPricesDay> => {
      const response = await get<ApiResponse<MarketPricesDay>>(
        withDate(`/api/customers/${customerId}/market-prices`, date),
        { signal },
      )
      return response.data
    },
    staleTime: CHART_STALE_TIME,
  })

/** Abgerechnete Lastprofile inkl. Kostensplit (Flag `dynamic_electric_prices`). */
export const billedLoadProfilesQuery = (
  customerId: string,
  contractId: string,
  date?: string,
) =>
  queryOptions({
    queryKey: ['billed-load-profiles', contractId, date],
    queryFn: async ({ signal }): Promise<BilledLoadProfilesDay> => {
      const response = await get<ApiResponse<BilledLoadProfilesDay>>(
        withDate(
          `/api/customers/${customerId}/contracts/${contractId}/billed-load-profiles`,
          date,
        ),
        { signal },
      )
      return response.data
    },
    staleTime: CHART_STALE_TIME,
  })

/** EDI-Lastgänge des Smart Meters (Flag `edi_load_profiles`). */
export const ediLoadProfilesQuery = (
  customerId: string,
  contractId: string,
  date?: string,
) =>
  queryOptions({
    queryKey: ['edi-load-profiles', contractId, date],
    queryFn: async ({ signal }): Promise<EdiLoadProfilesDay> => {
      const response = await get<ApiResponse<EdiLoadProfilesDay>>(
        withDate(
          `/api/customers/${customerId}/contracts/${contractId}/edi-load-profiles`,
          date,
        ),
        { signal },
      )
      return response.data
    },
    staleTime: CHART_STALE_TIME,
  })
