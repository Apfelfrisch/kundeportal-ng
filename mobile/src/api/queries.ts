import { keepPreviousData, queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from './client'
import type {
  ApiResponse,
  ChangeRequestResponse,
  Contract,
  ContractSummary,
  MarketPriceDay,
  Profile,
  ProfileResponse,
  Tenant,
  UsagePeriod,
  UsageWindow,
} from './types'

/** Query-Keys und Hooks des Kundenbereichs – alle Daten laufen über TanStack Query. */

export const queryKeys = {
  tenant: ['tenant'] as const,
  contracts: (userId: number) => ['customers', userId, 'contracts'] as const,
  contract: (userId: number, contractNumber: number) =>
    ['customers', userId, 'contracts', contractNumber] as const,
  profile: (userId: number) => ['customers', userId, 'profile'] as const,
  marketPrices: (userId: number) => ['customers', userId, 'market-prices'] as const,
  usage: (userId: number, contractNumber: number, params: UsageParams) =>
    ['customers', userId, 'contracts', contractNumber, 'usage', params] as const,
}

/** Kalenderzeitraum (`date` null = der mit den neuesten Werten) oder eigener Zeitraum, `until` inklusive. */
export type UsageParams = { period: UsagePeriod; date: string | null } | { from: string; until: string }

export function useTenant() {
  return useQuery({
    queryKey: queryKeys.tenant,
    queryFn: async () => (await api<ApiResponse<Tenant>>('tenant')).data,
    staleTime: Infinity,
  })
}

export function useContracts(userId: number) {
  return useQuery({
    queryKey: queryKeys.contracts(userId),
    queryFn: async () => (await api<ApiResponse<Array<ContractSummary>>>(`customers/${userId}`)).data,
  })
}

export function useContract(userId: number, contractNumber: number | null) {
  return useQuery({
    queryKey: queryKeys.contract(userId, contractNumber ?? 0),
    queryFn: async () =>
      (await api<ApiResponse<Contract>>(`customers/${userId}/contracts/${contractNumber}`)).data,
    enabled: contractNumber !== null,
  })
}

export function useProfile(userId: number) {
  return useQuery({
    queryKey: queryKeys.profile(userId),
    queryFn: async () => (await api<ApiResponse<Profile>>(`customers/${userId}/profile`)).data,
  })
}

/**
 * Börsenpreise (Zentrum ± 1 Tag, viertelstündlich). Nur für dynamische
 * Verträge sinnvoll – bei ausgeschaltetem Mandanten-Feature antwortet die
 * API mit 404, deshalb `enabled` von außen.
 */
export function useMarketPrices(userId: number, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.marketPrices(userId),
    queryFn: async () => (await api<ApiResponse<MarketPriceDay>>(`customers/${userId}/market-prices`)).data,
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}

/**
 * Verbrauch eines Zeitraums. Als Options-Objekt, damit Nachbar-Zeiträume
 * mit derselben Definition vorgeladen werden können.
 */
export function usageQueryOptions(userId: number, contractNumber: number, params: UsageParams) {
  const query = 'period' in params ? { period: params.period, date: params.date ?? undefined } : params

  return queryOptions({
    queryKey: queryKeys.usage(userId, contractNumber, params),
    queryFn: async () =>
      (await api<ApiResponse<UsageWindow>>(`customers/${userId}/contracts/${contractNumber}/usage`, { query })).data,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}

/**
 * Beim Wechsel von Zeitraum oder Tab bleibt die vorige Antwort sichtbar,
 * bis die neue da ist. Nur für dynamische Verträge (`enabled` von außen).
 */
export function useUsage(userId: number, contractNumber: number, params: UsageParams, enabled: boolean) {
  return useQuery({
    ...usageQueryOptions(userId, contractNumber, params),
    enabled,
    placeholderData: keepPreviousData,
  })
}

export interface MeterCountInput {
  meter_count?: number
  meter_count_ht?: number
  meter_count_nt?: number
  /** `yyyy-mm-dd` */
  read_on: string
}

export function useSubmitMeterCount(userId: number, contractNumber: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: MeterCountInput) =>
      api<ChangeRequestResponse>(
        `customers/${userId}/contracts/${contractNumber}/change-requests/meter-count`,
        { method: 'POST', body: input },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.contract(userId, contractNumber) })
    },
  })
}

export interface InstallmentInput {
  /** Gewünschter Abschlag in ganzen Euro. */
  installment: number
  /** `yyyy-mm-dd`, nicht in der Vergangenheit. */
  effective_from: string
}

export function useSubmitInstallment(userId: number, contractNumber: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: InstallmentInput) =>
      api<ChangeRequestResponse>(
        `customers/${userId}/contracts/${contractNumber}/change-requests/installment`,
        { method: 'POST', body: input },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.contract(userId, contractNumber) })
    },
  })
}

export interface BankInput {
  iban: string
  bank: string
  bank_account_owner: string
  sepa: boolean
  change_all_contracts: boolean
}

export function useSubmitBank(userId: number, contractNumber: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: BankInput) =>
      api<ChangeRequestResponse>(`customers/${userId}/contracts/${contractNumber}/change-requests/bank`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.contract(userId, contractNumber) })
    },
  })
}

/** Formulare der Änderungswünsche, die die App anbietet (Routen-Segment der API). */
export type ChangeRequestType = 'delivery-address' | 'billing-address' | 'termination'

export function useSubmitChangeRequest(userId: number, contractNumber: number, type: ChangeRequestType) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      api<ChangeRequestResponse>(`customers/${userId}/contracts/${contractNumber}/change-requests/${type}`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.contract(userId, contractNumber) })
    },
  })
}

export function useUpdateEmail(userId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (email: string) =>
      api<ProfileResponse>(`customers/${userId}/profile/email`, {
        method: 'PUT',
        body: { email },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile(userId) })
    },
  })
}

export interface PasswordInput {
  current_password: string
  password: string
  password_confirmation: string
}

export function useUpdatePassword(userId: number) {
  return useMutation({
    mutationFn: (input: PasswordInput) =>
      api<ProfileResponse>(`customers/${userId}/profile/password`, {
        method: 'PUT',
        body: input,
      }),
  })
}
