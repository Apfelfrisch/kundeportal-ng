import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod'

import { apiErrorMessage } from '#/api/client'
import { AssignContractDialog } from '#/components/admin/assign-contract-dialog'
import { DataTable } from '#/components/admin/data-table'
import { ServerPagination } from '#/components/admin/server-pagination'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { emptyToUndefined } from '#/lib/admin'
import {
  adminContractsQuery,
  useResendConfirmation,
} from '#/queries/admin'
import type { DataTableColumn } from '#/components/admin/data-table'
import type { AdminContractFilters } from '#/queries/admin'
import type { AdminContract } from '#/types/api'

const contractsSearchSchema = z.object({
  page: z.coerce.number().int().min(1).optional().catch(undefined),
  contract_number: z.coerce.string().optional().catch(undefined),
  name: z.coerce.string().optional().catch(undefined),
  email: z.coerce.string().optional().catch(undefined),
  user_filter: z.enum(['with_user', 'without_user']).optional().catch(undefined),
})

export const Route = createFileRoute('/_auth/intern/vertraege')({
  validateSearch: contractsSearchSchema,
  component: ContractsPage,
})

const USER_FILTER_ALL = 'all'

function ContractsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const filters: AdminContractFilters = {
    page: search.page,
    contract_number: search.contract_number,
    name: search.name,
    email: search.email,
    user_filter: search.user_filter,
  }

  const { data, isPending, isError } = useQuery(adminContractsQuery(filters))

  const [assignContractNumber, setAssignContractNumber] = useState<
    number | null
  >(null)
  const [resendContractNumber, setResendContractNumber] = useState<
    number | null
  >(null)
  const resendConfirmation = useResendConfirmation()

  async function resend() {
    if (resendContractNumber === null) return
    try {
      const response = await resendConfirmation.mutateAsync(
        resendContractNumber,
      )
      toast.success(response.message)
    } catch (error) {
      toast.error(apiErrorMessage(error))
    } finally {
      setResendContractNumber(null)
    }
  }

  const columns: Array<DataTableColumn<AdminContract>> = [
    {
      key: 'contract_number',
      header: 'Vertragsnummer',
      cell: (contract) => (
        <span className="font-medium">Vertrag {contract.contract_number}</span>
      ),
    },
    {
      key: 'billing_contact',
      header: 'Vertragspartner',
      cell: (contract) => (
        <div>
          {contract.billing_contact.company !== null &&
          contract.billing_contact.company !== '' ? (
            <p>{contract.billing_contact.company}</p>
          ) : null}
          <p>
            {contract.billing_contact.first_name}{' '}
            {contract.billing_contact.last_name}
          </p>
        </div>
      ),
    },
    {
      key: 'address',
      header: 'Adresse',
      cell: (contract) => (
        <div>
          <p>
            {contract.address.zip} {contract.address.city}
          </p>
          <p>
            {contract.address.street} {contract.address.street_number}{' '}
            {contract.address.address_additive}
          </p>
        </div>
      ),
    },
    {
      key: 'assignment',
      header: 'Zugeordneter Benutzer',
      cell: (contract) =>
        contract.assignment === null ? (
          <span className="text-muted-foreground">–</span>
        ) : (
          <div className="space-y-1">
            <p>
              {contract.assignment.user !== null
                ? `${contract.assignment.user.name} (ID ${contract.assignment.user_id})`
                : `Benutzer-ID ${contract.assignment.user_id}`}
            </p>
            {contract.assignment.user !== null ? (
              <p className="text-muted-foreground text-xs">
                {contract.assignment.user.email}
              </p>
            ) : null}
            {contract.assignment.confirmed ? (
              <Badge variant="secondary">Bestätigt</Badge>
            ) : (
              <Badge variant="destructive">Nicht bestätigt</Badge>
            )}
          </div>
        ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Aktionen</span>,
      className: 'text-right',
      cell: (contract) => (
        <div className="flex justify-end gap-2">
          {contract.assignment === null ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAssignContractNumber(contract.contract_number)}
            >
              Vertrag zuweisen
            </Button>
          ) : !contract.assignment.confirmed ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResendContractNumber(contract.contract_number)}
            >
              Bestätigungsmail senden
            </Button>
          ) : null}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Vertragsübersicht</h1>

      <ContractsFilterBar />

      {isError ? (
        <p className="text-muted-foreground text-sm">
          Die Verträge konnten nicht geladen werden. Bitte versuche es später
          erneut.
        </p>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={data?.data}
            rowKey={(contract) => contract.contract_number}
            isPending={isPending}
            emptyMessage="Keine Verträge gefunden."
          />
          <ServerPagination
            meta={data?.meta}
            itemLabel={['Vertrag', 'Verträge']}
            onPageChange={(page) =>
              void navigate({
                search: (previous) => ({
                  ...previous,
                  page: page === 1 ? undefined : page,
                }),
              })
            }
          />
        </>
      )}

      <AssignContractDialog
        open={assignContractNumber !== null}
        onOpenChange={(open) => {
          if (!open) setAssignContractNumber(null)
        }}
        contractNumber={assignContractNumber ?? undefined}
      />

      <AlertDialog
        open={resendContractNumber !== null}
        onOpenChange={(open) => {
          if (!open) setResendContractNumber(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Bestätigungsmail für Verknüpfung erneut senden
            </AlertDialogTitle>
            <AlertDialogDescription>
              Soll die Bestätigungsmail für die Verknüpfung für Vertrag{' '}
              <strong>{resendContractNumber}</strong> erneut versandt werden?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={() => void resend()}>
              Bestätigungsmail senden
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ContractsFilterBar() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const [contractNumber, setContractNumber] = useState(
    search.contract_number ?? '',
  )
  const [name, setName] = useState(search.name ?? '')
  const [email, setEmail] = useState(search.email ?? '')
  const [userFilter, setUserFilter] = useState(
    search.user_filter ?? USER_FILTER_ALL,
  )

  // Suchparameter können sich auch durch Navigation ändern (z. B. über die
  // Dashboard-Schnellsuche) – Formularfelder nachziehen.
  useEffect(() => {
    setContractNumber(search.contract_number ?? '')
    setName(search.name ?? '')
    setEmail(search.email ?? '')
    setUserFilter(search.user_filter ?? USER_FILTER_ALL)
  }, [search.contract_number, search.name, search.email, search.user_filter])

  const hasActiveFilters =
    search.contract_number !== undefined ||
    search.name !== undefined ||
    search.email !== undefined ||
    search.user_filter !== undefined

  function apply() {
    void navigate({
      search: {
        contract_number: emptyToUndefined(contractNumber),
        name: emptyToUndefined(name),
        email: emptyToUndefined(email),
        user_filter:
          userFilter === USER_FILTER_ALL
            ? undefined
            : (userFilter as 'with_user' | 'without_user'),
        page: undefined,
      },
    })
  }

  return (
    <form
      className="grid items-end gap-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto]"
      onSubmit={(event) => {
        event.preventDefault()
        apply()
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="filter-contract-number">Vertragsnummer</Label>
        <Input
          id="filter-contract-number"
          inputMode="numeric"
          placeholder="Vertragsnummer…"
          value={contractNumber}
          onChange={(event) => setContractNumber(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="filter-name">User Name</Label>
        <Input
          id="filter-name"
          placeholder="Name suchen…"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="filter-email">User E-Mail</Label>
        <Input
          id="filter-email"
          placeholder="E-Mail suchen…"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="filter-user-filter">Benutzerkonto</Label>
        <Select value={userFilter} onValueChange={setUserFilter}>
          <SelectTrigger id="filter-user-filter" className="w-full">
            <SelectValue placeholder="Alle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={USER_FILTER_ALL}>Alle</SelectItem>
            <SelectItem value="with_user">Mit Benutzerkonto</SelectItem>
            <SelectItem value="without_user">Ohne Benutzerkonto</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <Button type="submit">Filtern</Button>
        {hasActiveFilters ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => void navigate({ search: {} })}
          >
            Löschen
          </Button>
        ) : null}
      </div>
    </form>
  )
}
