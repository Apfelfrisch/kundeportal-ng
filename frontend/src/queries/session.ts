import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'

import { get, isApiError, post } from '#/api/client'
import type { ApiResponse, User } from '#/types/api'

/**
 * Session-Query: liefert den angemeldeten Benutzer oder `null` (401 → null).
 */
export const sessionQuery = queryOptions({
  queryKey: ['session'],
  queryFn: async ({ signal }): Promise<User | null> => {
    try {
      const response = await get<ApiResponse<User>>('/api/auth/session', {
        signal,
      })
      return response.data
    } catch (error) {
      if (isApiError(error) && error.status === 401) {
        return null
      }
      throw error
    }
  },
  staleTime: 1000 * 60 * 5,
  retry: false,
})

export interface LoginCredentials {
  email: string
  password: string
}

export function useLogin() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: (credentials: LoginCredentials) =>
      post<ApiResponse<User>>('/api/auth/login', credentials),
    onSuccess: async (response) => {
      queryClient.setQueryData(sessionQuery.queryKey, response.data)
      await router.invalidate()
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: () => post<undefined>('/api/auth/logout'),
    onSuccess: async () => {
      queryClient.setQueryData(sessionQuery.queryKey, null)
      // Alle benutzerbezogenen Daten verwerfen; Tenant-Daten bleiben gültig.
      queryClient.removeQueries({
        predicate: (query) =>
          query.queryKey[0] !== 'session' && query.queryKey[0] !== 'tenant',
      })
      await router.invalidate()
      await router.navigate({ to: '/login' })
    },
  })
}

/** Aktualisiert die Session im Cache (z. B. nach Account-Setup oder Passwort setzen). */
export function setSessionUser(
  queryClient: ReturnType<typeof useQueryClient>,
  user: User | null,
): void {
  queryClient.setQueryData(sessionQuery.queryKey, user)
}
