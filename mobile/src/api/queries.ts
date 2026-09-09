import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

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
} from './types'

/** Query-Keys und Hooks des Kundenbereichs – alle Daten laufen über TanStack Query. */

export const queryKeys = {
  tenant: ['tenant'] as const,
  contracts: (userId: number) => ['customers', userId, 'contracts'] as const,
  contract: (userId: number, contractNumber: number) =>
    ['customers', userId, 'contracts', contractNumber] as const,
  profile: (userId: number) => ['customers', userId, 'profile'] as const,
  marketPrices: (userId: number) => ['customers', userId, 'market-prices'] as const,
}

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
    queryFn: async () => api<MarketPriceDay>(`customers/${userId}/market-prices`),
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
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
