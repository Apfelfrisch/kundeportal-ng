import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod'

import { isApiError } from '#/api/client'
import { DataTable } from '#/components/admin/data-table'
import { ServerPagination } from '#/components/admin/server-pagination'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import {
  TICKET_STATUS_LABELS,
  emptyToUndefined,
  ticketDataEntries,
  ticketStatusTransitions,
  ticketTypeLabel,
} from '#/lib/admin'
import { formatDate } from '#/lib/format'
import { adminTicketsQuery, useUpdateTicketStatus } from '#/queries/admin'
import type { DataTableColumn } from '#/components/admin/data-table'
import type { AdminTicketFilters } from '#/queries/admin'
import type { AdminTicket, AdminTicketStatus } from '#/types/api'

const ticketsSearchSchema = z.object({
  page: z.coerce.number().int().min(1).optional().catch(undefined),
  status: z.enum(['open', 'in_process', 'processed']).optional().catch(undefined),
  name: z.coerce.string().optional().catch(undefined),
  email: z.coerce.string().optional().catch(undefined),
  contract_number: z.coerce.string().optional().catch(undefined),
  caseworker: z.coerce.string().optional().catch(undefined),
})

export const Route = createFileRoute('/_auth/intern/tickets')({
  validateSearch: ticketsSearchSchema,
  component: TicketsPage,
})

const STATUS_BADGE_VARIANT: Record<
  AdminTicketStatus,
  'destructive' | 'default' | 'secondary'
> = {
  open: 'destructive',
  in_process: 'default',
  processed: 'secondary',
}

function TicketsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  // Ohne expliziten Status zeigt die Seite die offenen Tickets.
  const status: AdminTicketStatus = search.status ?? 'open'

  const filters: AdminTicketFilters = {
    page: search.page,
    status,
    name: search.name,
    email: search.email,
    contract_number: search.contract_number,
    caseworker: search.caseworker,
  }

  const { data, isPending, isError } = useQuery(adminTicketsQuery(filters))

  const [detailTicket, setDetailTicket] = useState<AdminTicket | null>(null)
  const updateStatus = useUpdateTicketStatus()

  function changeStatus(ticket: AdminTicket, nextStatus: AdminTicketStatus) {
    // Optimistischer Toast – bei einem Fehler folgt die Fehlermeldung.
    toast.success(
      `Ticket wird als „${TICKET_STATUS_LABELS[nextStatus]}“ markiert.`,
    )
    updateStatus.mutate(
      { ticketId: ticket.id, status: nextStatus },
      {
        onError: (error) => {
          toast.error(
            isApiError(error)
              ? error.message
              : 'Der Status konnte nicht geändert werden. Bitte versuche es später erneut.',
          )
        },
      },
    )
  }

  const columns: Array<DataTableColumn<AdminTicket>> = [
    {
      key: 'created_at',
      header: 'Datum',
      cell: (ticket) =>
        ticket.created_at !== null ? formatDate(ticket.created_at) : '–',
    },
    {
      key: 'form_type',
      header: 'Typ',
      cell: (ticket) => (
        <span className="font-medium">{ticketTypeLabel(ticket.form_type)}</span>
      ),
    },
    {
      key: 'customer',
      header: 'Kunde',
      cell: (ticket) =>
        ticket.customer === null ? (
          <span className="text-muted-foreground">–</span>
        ) : (
          <div>
            <p>{ticket.customer.name}</p>
            <p className="text-muted-foreground text-xs">
              ID {ticket.customer.id}
              {ticket.customer.customer_number !== null
                ? ` · Kundennummer ${ticket.customer.customer_number}`
                : ''}
            </p>
          </div>
        ),
    },
    {
      key: 'contract_number',
      header: 'Vertragsnummer',
      cell: (ticket) =>
        ticket.contract_number ?? (
          <span className="text-muted-foreground">–</span>
        ),
    },
    {
      key: 'data',
      header: 'Daten',
      cell: (ticket) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDetailTicket(ticket)}
        >
          Details
        </Button>
      ),
    },
    {
      key: 'caseworker',
      header: 'Bearbeiter',
      cell: (ticket) =>
        ticket.caseworker?.name ?? (
          <span className="text-muted-foreground">–</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (ticket) => (
        <Badge variant={STATUS_BADGE_VARIANT[ticket.status.value]}>
          {ticket.status.label}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Aktionen</span>,
      className: 'text-right',
      cell: (ticket) => (
        <div className="flex flex-wrap justify-end gap-2">
          {ticketStatusTransitions(ticket.status.value).map((transition) => (
            <Button
              key={transition.status}
              variant="outline"
              size="sm"
              disabled={updateStatus.isPending}
              onClick={() => changeStatus(ticket, transition.status)}
            >
              {transition.label}
            </Button>
          ))}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Nachrichteneingang</h1>
        <p className="text-muted-foreground text-sm">Nachrichten von Kunden</p>
      </div>

      <Tabs
        value={status}
        onValueChange={(value) =>
          void navigate({
            search: (previous) => ({
              ...previous,
              status: value as AdminTicketStatus,
              page: undefined,
            }),
          })
        }
      >
        <TabsList>
          <TabsTrigger value="open">Offen</TabsTrigger>
          <TabsTrigger value="in_process">In Arbeit</TabsTrigger>
          <TabsTrigger value="processed">Erledigt</TabsTrigger>
        </TabsList>
      </Tabs>

      <TicketsFilterBar />

      {isError ? (
        <p className="text-muted-foreground text-sm">
          Die Tickets konnten nicht geladen werden. Bitte versuche es später
          erneut.
        </p>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={data?.data}
            rowKey={(ticket) => ticket.id}
            isPending={isPending}
            emptyMessage="Keine Tickets gefunden."
          />
          <ServerPagination
            meta={data?.meta}
            itemLabel={['Ticket', 'Tickets']}
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

      <Dialog
        open={detailTicket !== null}
        onOpenChange={(open) => {
          if (!open) setDetailTicket(null)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {detailTicket !== null
                ? ticketTypeLabel(detailTicket.form_type)
                : ''}
            </DialogTitle>
            <DialogDescription>
              {detailTicket?.contract_number != null
                ? `Vertrag ${detailTicket.contract_number}`
                : 'Meldung des Kunden'}
              {detailTicket?.created_at != null
                ? ` · ${formatDate(detailTicket.created_at)}`
                : ''}
            </DialogDescription>
          </DialogHeader>
          {detailTicket !== null ? (
            ticketDataEntries(detailTicket.data).length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Keine weiteren Daten vorhanden.
              </p>
            ) : (
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                {ticketDataEntries(detailTicket.data).map((entry) => (
                  <div key={entry.key} className="contents">
                    <dt className="text-muted-foreground">{entry.label}</dt>
                    <dd className="break-words whitespace-pre-line">
                      {entry.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TicketsFilterBar() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const [name, setName] = useState(search.name ?? '')
  const [email, setEmail] = useState(search.email ?? '')
  const [contractNumber, setContractNumber] = useState(
    search.contract_number ?? '',
  )
  const [caseworker, setCaseworker] = useState(search.caseworker ?? '')

  useEffect(() => {
    setName(search.name ?? '')
    setEmail(search.email ?? '')
    setContractNumber(search.contract_number ?? '')
    setCaseworker(search.caseworker ?? '')
  }, [search.name, search.email, search.contract_number, search.caseworker])

  const hasActiveFilters =
    search.name !== undefined ||
    search.email !== undefined ||
    search.contract_number !== undefined ||
    search.caseworker !== undefined

  function apply() {
    void navigate({
      search: (previous) => ({
        status: previous.status,
        name: emptyToUndefined(name),
        email: emptyToUndefined(email),
        contract_number: emptyToUndefined(contractNumber),
        caseworker: emptyToUndefined(caseworker),
        page: undefined,
      }),
    })
  }

  return (
    <form
      className="grid items-end gap-3 md:grid-cols-[1fr_1fr_1fr_10rem_auto]"
      onSubmit={(event) => {
        event.preventDefault()
        apply()
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="filter-ticket-name">Name</Label>
        <Input
          id="filter-ticket-name"
          placeholder="Name suchen…"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="filter-ticket-email">E-Mail</Label>
        <Input
          id="filter-ticket-email"
          placeholder="E-Mail suchen…"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="filter-ticket-contract">Vertragsnummer</Label>
        <Input
          id="filter-ticket-contract"
          inputMode="numeric"
          placeholder="Vertragsnummer…"
          value={contractNumber}
          onChange={(event) => setContractNumber(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="filter-ticket-caseworker">Bearbeiter (ID)</Label>
        <Input
          id="filter-ticket-caseworker"
          inputMode="numeric"
          placeholder="Bearbeiter-ID…"
          value={caseworker}
          onChange={(event) => setCaseworker(event.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit">Filtern</Button>
        {hasActiveFilters ? (
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              void navigate({
                search: (previous) => ({ status: previous.status }),
              })
            }
          >
            Löschen
          </Button>
        ) : null}
      </div>
    </form>
  )
}
