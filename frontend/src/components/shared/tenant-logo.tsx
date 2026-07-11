import { useQuery } from '@tanstack/react-query'

import { tenantQuery } from '#/queries/tenant'
import { Skeleton } from '#/components/ui/skeleton'
import { cn } from '#/lib/utils'

/**
 * `onDark` lädt die Variante für dunkle Flächen (`logo-on-dark.svg`) – im
 * alten Portal wurden die dunklen SVG-Füllungen per CSS auf Weiß gesetzt,
 * was bei einem `<img>` nicht geht, daher zwei Dateien pro Tenant.
 */
export function TenantLogo({
  className,
  onDark = false,
}: {
  className?: string
  onDark?: boolean
}) {
  const { data: tenant } = useQuery(tenantQuery)

  if (!tenant) {
    return <Skeleton className={cn('h-10 w-40', className)} />
  }

  return (
    <img
      src={`/tenants/${tenant.slug}/${onDark ? 'logo-on-dark' : 'logo'}.svg`}
      alt={`${tenant.name.short} Logo`}
      className={cn('h-10 w-auto', className)}
    />
  )
}
