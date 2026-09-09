import type { ReactNode } from 'react'

import type { Contract } from '@/api/types'
import { Screen } from '@/components/Screen'
import { Empty, ErrorState, Loading } from '@/components/States'
import { useContractContext } from '@/providers/ContractProvider'

/**
 * Lade-/Fehler-/Leerzustand des aktiven Vertrags, danach der eigentliche
 * Inhalt mit dem geladenen Vertrag – von allen Unterseiten genutzt.
 */
export function ContractScreen({ children }: { children: (contract: Contract) => ReactNode }) {
  const { contracts, contractNumber, contract } = useContractContext()

  if (contracts.isError) return <ErrorState error={contracts.error} onRetry={() => void contracts.refetch()} />
  if (contracts.isSuccess && contracts.data.length === 0) {
    return <Empty message="Dir ist noch kein Vertrag zugeordnet. Bitte bestätige die Zuordnung im Kundenportal." />
  }
  if (contractNumber === null || contract.isPending) return <Loading />
  if (contract.isError) return <ErrorState error={contract.error} onRetry={() => void contract.refetch()} />

  return (
    <Screen refreshing={contract.isRefetching} onRefresh={() => void contract.refetch()}>
      {children(contract.data)}
    </Screen>
  )
}
