import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'

import { get, post } from '#/api/client'
import type { ChangeRequestType, ChangeRequestValues } from '#/lib/change-requests'
import type {
  ApiResponse,
  ChangeRequestResponse,
  Contract,
  ContractSummary,
} from '#/types/api'

/** Vertragsliste eines Kunden. */
export const contractsQuery = (customerId: string) =>
  queryOptions({
    queryKey: ['contracts', customerId],
    queryFn: async ({ signal }): Promise<Array<ContractSummary>> => {
      const response = await get<ApiResponse<Array<ContractSummary>>>(
        `/api/customers/${customerId}`,
        { signal },
      )
      return response.data
    },
    staleTime: 1000 * 60,
  })

/** Vollständiger Vertrag fürs Dashboard und die Änderungsformulare. */
export const contractQuery = (customerId: string, contractId: string) =>
  queryOptions({
    queryKey: ['contract', customerId, contractId],
    queryFn: async ({ signal }): Promise<Contract> => {
      const response = await get<ApiResponse<Contract>>(
        `/api/customers/${customerId}/contracts/${contractId}`,
        { signal },
      )
      return response.data
    },
    staleTime: 1000 * 60,
  })

/**
 * Änderungsformular absenden. Der Honeypot `bot-check` wird immer LEER
 * mitgeschickt (das Backend lehnt gefüllte Werte ab). Erfolgreiche
 * Änderungsmeldungen erscheinen als Ticket im Postfach → invalidieren.
 */
export function useSubmitChangeRequest(
  customerId: string,
  contractId: string,
  type: ChangeRequestType,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (values: ChangeRequestValues) =>
      post<ChangeRequestResponse>(
        `/api/customers/${customerId}/contracts/${contractId}/change-requests/${type}`,
        { ...values, 'bot-check': '' },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['mailbox', customerId],
      })
    },
  })
}
