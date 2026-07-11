import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'

import { del, get, post, postMultipart, put } from '#/api/client'
import { buildAdminQuery } from '#/lib/admin'
import type {
  AdminContract,
  AdminContractSearchResult,
  AdminDashboard,
  AdminOutboxMessage,
  AdminTicket,
  AdminTicketStatus,
  AdminUser,
  AdminUserSearchResult,
  ApiResponse,
  MessageResponse,
  PaginatedResponse,
  Profile,
  ProfileResponse,
} from '#/types/api'

/**
 * Queries und Mutationen des Admin-Bereichs (/api/admin).
 *
 * Query-Key-Schema:
 * - ['admin', 'dashboard']
 * - ['admin', 'contracts', filters]
 * - ['admin', 'users', filters]
 * - ['admin', 'tickets', filters]
 * - ['admin', 'outbox', filters]
 * - ['admin', 'profile']
 */

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

export const adminDashboardQuery = queryOptions({
  queryKey: ['admin', 'dashboard'],
  queryFn: async ({ signal }): Promise<AdminDashboard> => {
    const response = await get<ApiResponse<AdminDashboard>>(
      '/api/admin/dashboard',
      { signal },
    )
    return response.data
  },
})

/* ------------------------------------------------------------------ */
/* Schnellsuche                                                        */
/* ------------------------------------------------------------------ */

/** Wirft `ApiError` (404 mit deutscher Meldung), wenn kein Vertrag existiert. */
export function searchContract(
  contractNumber: string,
): Promise<ApiResponse<AdminContractSearchResult>> {
  return get<ApiResponse<AdminContractSearchResult>>(
    `/api/admin/search/contract${buildAdminQuery({ contract_number: contractNumber })}`,
  )
}

/** Wirft `ApiError` (404 mit deutscher Meldung), wenn kein Benutzer existiert. */
export function searchUser(
  userId: string,
): Promise<ApiResponse<AdminUserSearchResult>> {
  return get<ApiResponse<AdminUserSearchResult>>(
    `/api/admin/search/user${buildAdminQuery({ user_id: userId })}`,
  )
}

/* ------------------------------------------------------------------ */
/* Verträge                                                            */
/* ------------------------------------------------------------------ */

export type AdminContractFilters = {
  page?: number
  contract_number?: string
  name?: string
  email?: string
  user_filter?: 'with_user' | 'without_user'
}

export const adminContractsQuery = (filters: AdminContractFilters) =>
  queryOptions({
    queryKey: ['admin', 'contracts', filters],
    queryFn: ({ signal }) =>
      get<PaginatedResponse<AdminContract>>(
        `/api/admin/contracts${buildAdminQuery(filters)}`,
        { signal },
      ),
    placeholderData: keepPreviousData,
  })

export function useResendConfirmation() {
  return useMutation({
    mutationFn: (contractNumber: number) =>
      post<MessageResponse>(
        `/api/admin/contracts/${contractNumber}/resend-confirmation`,
      ),
  })
}

/* ------------------------------------------------------------------ */
/* Benutzer                                                            */
/* ------------------------------------------------------------------ */

export type AdminUserFilters = {
  page?: number
  id?: string
  name?: string
  email?: string
}

export const adminUsersQuery = (filters: AdminUserFilters) =>
  queryOptions({
    queryKey: ['admin', 'users', filters],
    queryFn: ({ signal }) =>
      get<PaginatedResponse<AdminUser>>(
        `/api/admin/users${buildAdminQuery(filters)}`,
        { signal },
      ),
    placeholderData: keepPreviousData,
  })

export interface CreateUserPayload {
  name: string
  email: string
  contract_number?: number
  send_mail?: boolean
}

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateUserPayload) =>
      post<ApiResponse<AdminUser> & MessageResponse>(
        '/api/admin/users',
        payload,
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'contracts'] }),
      ])
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: number) =>
      del<MessageResponse>(`/api/admin/users/${userId}`),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'contracts'] }),
      ])
    },
  })
}

/** Backend entscheidet: Passwort-Reset- oder Einladungs-Mail (`message`). */
export function useSendSetupMail() {
  return useMutation({
    mutationFn: (userId: number) =>
      post<MessageResponse>(`/api/admin/users/${userId}/setup-mail`),
  })
}

/* ------------------------------------------------------------------ */
/* Vertragszuordnungen                                                 */
/* ------------------------------------------------------------------ */

export interface AssignContractPayload {
  user_id: number
  contract_number: number
}

export function useAssignContract() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: AssignContractPayload) =>
      post<MessageResponse>('/api/admin/contract-assignments', payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'contracts'] }),
      ])
    },
  })
}

export function useRemoveContractAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (assignmentId: number) =>
      del<MessageResponse>(`/api/admin/contract-assignments/${assignmentId}`),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'contracts'] }),
      ])
    },
  })
}

/* ------------------------------------------------------------------ */
/* Tickets                                                             */
/* ------------------------------------------------------------------ */

export type AdminTicketFilters = {
  page?: number
  status?: AdminTicketStatus
  name?: string
  email?: string
  contract_number?: string
  caseworker?: string
}

export const adminTicketsQuery = (filters: AdminTicketFilters) =>
  queryOptions({
    queryKey: ['admin', 'tickets', filters],
    queryFn: ({ signal }) =>
      get<PaginatedResponse<AdminTicket>>(
        `/api/admin/tickets${buildAdminQuery(filters)}`,
        { signal },
      ),
    placeholderData: keepPreviousData,
  })

export function useUpdateTicketStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { ticketId: number; status: AdminTicketStatus }) =>
      put<ApiResponse<AdminTicket>>(
        `/api/admin/tickets/${payload.ticketId}/status`,
        { status: payload.status },
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'tickets'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] }),
      ])
    },
  })
}

/* ------------------------------------------------------------------ */
/* Postausgang                                                         */
/* ------------------------------------------------------------------ */

export type AdminOutboxFilters = {
  page?: number
  customer_number?: string
  name?: string
  email?: string
}

export const adminOutboxQuery = (filters: AdminOutboxFilters) =>
  queryOptions({
    queryKey: ['admin', 'outbox', filters],
    queryFn: ({ signal }) =>
      get<PaginatedResponse<AdminOutboxMessage>>(
        `/api/admin/outbox${buildAdminQuery(filters)}`,
        { signal },
      ),
    placeholderData: keepPreviousData,
  })

export interface SendCompanyMessagePayload {
  customer_user_id: number
  subject: string
  message: string
  files: Array<File>
}

export function useSendCompanyMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: SendCompanyMessagePayload) => {
      const formData = new FormData()
      formData.append('customer_user_id', String(payload.customer_user_id))
      formData.append('subject', payload.subject)
      formData.append('message', payload.message)
      for (const file of payload.files) {
        formData.append('files[]', file)
      }

      return postMultipart<ApiResponse<AdminOutboxMessage> & MessageResponse>(
        '/api/admin/messages',
        formData,
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'outbox'] })
    },
  })
}

export function useDeleteCompanyMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (messageId: number) =>
      del<MessageResponse>(`/api/admin/messages/${messageId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'outbox'] })
    },
  })
}

/* ------------------------------------------------------------------ */
/* Profil                                                              */
/* ------------------------------------------------------------------ */

export const adminProfileQuery = queryOptions({
  queryKey: ['admin', 'profile'],
  queryFn: async ({ signal }): Promise<Profile> => {
    const response = await get<ProfileResponse>('/api/admin/profile', {
      signal,
    })
    return response.data
  },
})

/**
 * E-Mail ändern: Das Backend setzt die Verifizierung zurück, sperrt Admins
 * aber nicht aus – der Admin-Bereich verlangt keine verifizierte E-Mail.
 */
export function useUpdateAdminEmail() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { email: string }) =>
      put<ProfileResponse>('/api/admin/profile/email', payload),
    onSuccess: async (response) => {
      queryClient.setQueryData(adminProfileQuery.queryKey, response.data)
      await queryClient.invalidateQueries({ queryKey: ['session'] })
    },
  })
}

export interface UpdateAdminPasswordPayload {
  current_password: string
  password: string
  password_confirmation: string
}

export function useUpdateAdminPassword() {
  return useMutation({
    mutationFn: (payload: UpdateAdminPasswordPayload) =>
      put<ProfileResponse>('/api/admin/profile/password', payload),
  })
}
