import { Link, Navigate, createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { FileText } from 'lucide-react'

import { ContractStatusBadge } from '#/components/customer/status-badge'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { singleContractNumber } from '#/lib/contracts'
import { contractsQuery } from '#/queries/contracts'
import type { ContractSummary } from '#/types/api'

export const Route = createFileRoute('/_auth/kunde/$customerId/')({
  component: ContractListPage,
})

function ContractListPage() {
  const { customerId } = Route.useParams()
  const { data: contracts, isPending, isError } = useQuery(
    contractsQuery(customerId),
  )

  if (isPending) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold">Deine Verträge</h1>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-2 py-12 text-center">
        <h1 className="text-3xl font-semibold">Deine Verträge</h1>
        <p className="text-muted-foreground">
          Deine Verträge konnten nicht geladen werden. Bitte versuche es später
          erneut.
        </p>
      </div>
    )
  }

  // Genau ein Vertrag → direkt zum Vertrags-Dashboard.
  const onlyContract = singleContractNumber(contracts)
  if (onlyContract !== null) {
    return (
      <Navigate
        to="/kunde/$customerId/vertrag/$contractId"
        params={{ customerId, contractId: String(onlyContract) }}
        replace
      />
    )
  }

  if (contracts.length === 0) {
    return (
      <div className="space-y-2 py-12 text-center">
        <FileText className="text-muted-foreground mx-auto size-10" />
        <h1 className="text-3xl font-semibold">Keine Verträge vorhanden</h1>
        <p className="text-muted-foreground">
          Deinem Konto sind derzeit keine Verträge zugeordnet. Bitte wende dich
          an uns, wenn das nicht stimmt.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Deine Verträge</h1>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {contracts.map((contract) => (
          <ContractCard
            key={contract.contract_number}
            customerId={customerId}
            contract={contract}
          />
        ))}
      </div>
    </div>
  )
}

function ContractCard({
  customerId,
  contract,
}: {
  customerId: string
  contract: ContractSummary
}) {
  const address = contract.delivery_address

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          Vertragsnummer {contract.contract_number}
          <ContractStatusBadge status={contract.status} />
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-2 text-sm">
        {contract.tariff !== null ? <p>{contract.tariff}</p> : null}
        {address !== null ? (
          <p>
            {address.street} {address.street_number} {address.address_additive}{' '}
            | {address.zip} {address.city}
          </p>
        ) : null}
        <p className="text-muted-foreground">
          Zählernummer: {contract.meter_number ?? '–'}
        </p>
        <p className="text-muted-foreground">MaLo: {contract.malo_id ?? '–'}</p>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <Link
            to="/kunde/$customerId/vertrag/$contractId"
            params={{
              customerId,
              contractId: String(contract.contract_number),
            }}
            title={`Zu deinem Vertrag ${contract.contract_number}`}
          >
            Zum Vertrag
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
