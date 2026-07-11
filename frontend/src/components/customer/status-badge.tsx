import { Badge } from '#/components/ui/badge'
import { statusBadgeTone } from '#/lib/contracts'
import { cn } from '#/lib/utils'
import type { ContractStatusInfo } from '#/types/api'

/**
 * Vertragsstatus-Badge mit den Farben des alten Status-Badges:
 * In Belieferung → grün, In Kündigung → gelb, Gekündigt → grau,
 * Abgelehnt → rot, sonst (In Bearbeitung) → blau.
 */
const toneClasses: Record<string, string> = {
  success: 'border-transparent bg-green-600 text-white',
  warning: 'border-transparent bg-amber-500 text-black',
  danger: 'border-transparent bg-red-600 text-white',
  secondary: '',
  info: 'border-transparent bg-sky-600 text-white',
}

export function ContractStatusBadge({
  status,
}: {
  status: ContractStatusInfo
}) {
  const tone = statusBadgeTone(status.label)

  return (
    <Badge
      variant={tone === 'secondary' ? 'secondary' : 'default'}
      className={cn(toneClasses[tone])}
    >
      {status.label}
    </Badge>
  )
}
