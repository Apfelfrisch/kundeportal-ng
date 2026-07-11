import { queryOptions } from '@tanstack/react-query'

import { get } from '#/api/client'
import type { ApiResponse, Tenant } from '#/types/api'

/**
 * Tenant-Query: Mandanten-Konfiguration (Name, Kontakt, Features, …).
 * Ändert sich zur Laufzeit nie → `staleTime: Infinity`.
 */
export const tenantQuery = queryOptions({
  queryKey: ['tenant'],
  queryFn: async ({ signal }): Promise<Tenant> => {
    const response = await get<ApiResponse<Tenant>>('/api/tenant', { signal })
    return response.data
  },
  staleTime: Infinity,
  gcTime: Infinity,
})
