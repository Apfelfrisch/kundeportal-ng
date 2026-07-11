import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'

import { get, postMultipart } from '#/api/client'
import type { ApiResponse, MailboxEntry } from '#/types/api'

/** Postfach-Thread (neueste Nachricht zuerst, wie im Altsystem). */
export const mailboxQuery = (customerId: string) =>
  queryOptions({
    queryKey: ['mailbox', customerId],
    queryFn: async ({ signal }): Promise<Array<MailboxEntry>> => {
      const response = await get<ApiResponse<Array<MailboxEntry>>>(
        `/api/customers/${customerId}/postfach`,
        { signal },
      )
      return response.data
    },
  })

export interface MailboxMessagePayload {
  message: string
  files: Array<File>
}

/**
 * Chat-Nachricht senden (multipart). Der Honeypot `bot-check` bleibt leer;
 * anschließend Thread neu laden.
 */
export function useSendMailboxMessage(customerId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: MailboxMessagePayload) => {
      const formData = new FormData()
      if (payload.message.trim() !== '') {
        formData.append('message', payload.message)
      }
      for (const file of payload.files) {
        formData.append('files[]', file)
      }
      formData.append('bot-check', '')

      return postMultipart<unknown>(
        `/api/customers/${customerId}/postfach`,
        formData,
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['mailbox', customerId],
      })
    },
  })
}
