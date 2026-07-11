import { useQuery } from '@tanstack/react-query'

import { tenantQuery } from '#/queries/tenant'
import { Skeleton } from '#/components/ui/skeleton'
import { cn } from '#/lib/utils'

export function TenantLogo({ className }: { className?: string }) {
  const { data: tenant } = useQuery(tenantQuery)

  if (!tenant) {
    return <Skeleton className={cn('h-10 w-40', className)} />
  }

  return (
    <img
      src={`/tenants/${tenant.slug}/logo.svg`}
      alt={`${tenant.name.short} Logo`}
      className={cn('h-10 w-auto', className)}
    />
  )
}
