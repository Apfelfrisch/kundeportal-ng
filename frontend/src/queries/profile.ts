import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'

import { get, put } from '#/api/client'
import type { Profile, ProfileResponse } from '#/types/api'

export const profileQuery = (customerId: string) =>
  queryOptions({
    queryKey: ['profile', customerId],
    queryFn: async ({ signal }): Promise<Profile> => {
      const response = await get<ProfileResponse>(
        `/api/customers/${customerId}/profile`,
        { signal },
      )
      return response.data
    },
  })

/**
 * E-Mail ändern: Das Backend setzt die Verifizierung zurück
 * (`email_verified` → false) – die Session muss danach invalidiert werden,
 * der Auth-Guard leitet dann zur erneuten Verifizierung weiter.
 */
export function useUpdateProfileEmail(customerId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { email: string }) =>
      put<ProfileResponse>(`/api/customers/${customerId}/profile/email`, payload),
    onSuccess: async (response) => {
      queryClient.setQueryData(
        profileQuery(customerId).queryKey,
        response.data,
      )
      await queryClient.invalidateQueries({ queryKey: ['session'] })
    },
  })
}

export interface UpdatePasswordPayload {
  current_password: string
  password: string
  password_confirmation: string
}

export function useUpdateProfilePassword(customerId: string) {
  return useMutation({
    mutationFn: (payload: UpdatePasswordPayload) =>
      put<ProfileResponse>(
        `/api/customers/${customerId}/profile/password`,
        payload,
      ),
  })
}
