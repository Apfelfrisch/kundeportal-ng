import type { UseQueryResult } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'

import { useContract, useContracts } from '@/api/queries'
import { contractStorage } from '@/api/storage'
import type { Contract, ContractSummary } from '@/api/types'
import { useUser } from '@/providers/AuthProvider'

/**
 * Aktiver Vertrag der App. Die Vertragsliste kommt einmal vom Backend, die
 * Auswahl bleibt im Gerätespeicher; ohne gespeicherte Auswahl gilt der
 * erste Vertrag.
 */

interface ContractContextValue {
  contracts: UseQueryResult<Array<ContractSummary>>
  contractNumber: number | null
  select: (contractNumber: number) => void
  contract: UseQueryResult<Contract>
}

const ContractContext = createContext<ContractContextValue | null>(null)

export function ContractProvider({ children }: PropsWithChildren) {
  const user = useUser()
  const contracts = useContracts(user.id)
  const [stored, setStored] = useState<number | null | undefined>(undefined)

  useEffect(() => {
    void contractStorage.load().then(setStored)
  }, [])

  const contractNumber = useMemo(() => {
    const list = contracts.data
    if (list === undefined || stored === undefined) return null
    if (stored !== null && list.some((entry) => entry.contract_number === stored)) return stored
    return list[0]?.contract_number ?? null
  }, [contracts.data, stored])

  const select = useCallback((next: number) => {
    setStored(next)
    void contractStorage.save(next)
  }, [])

  const contract = useContract(user.id, contractNumber)

  const value = useMemo(
    () => ({ contracts, contractNumber, select, contract }),
    [contracts, contractNumber, select, contract],
  )

  return <ContractContext.Provider value={value}>{children}</ContractContext.Provider>
}

export function useContractContext(): ContractContextValue {
  const context = useContext(ContractContext)
  if (context === null) throw new Error('useContractContext außerhalb des ContractProviders')
  return context
}
