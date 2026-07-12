import { queryOptions } from '@tanstack/react-query'
import { notFound } from '@tanstack/react-router'

import { get } from '#/api/client'
import type { QueryClient } from '@tanstack/react-query'
import type { ApiResponse, Tenant, TenantFeatures } from '#/types/api'

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

/**
 * `beforeLoad`-Guard für Seiten hinter Tenant-Feature-Flags:
 * lädt den Tenant und wirft 404, wenn das Feature deaktiviert ist.
 */
export function requireFeature(feature: keyof TenantFeatures) {
  return async ({
    context,
  }: {
    context: { queryClient: QueryClient }
  }): Promise<void> => {
    const tenant = await context.queryClient.ensureQueryData(tenantQuery)
    if (!tenant.features[feature]) {
      throw notFound()
    }
  }
}
