import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Paperclip } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'

import { isApiError } from '#/api/client'
import { DataTable } from '#/components/admin/data-table'
import { SendMessageDialog } from '#/components/admin/send-message-dialog'
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
import { formatDate } from '#/lib/format'
import { adminOutboxQuery, useDeleteCompanyMessage } from '#/queries/admin'
import type { DataTableColumn } from '#/components/admin/data-table'
import type { AdminOutboxFilters } from '#/queries/admin'
import type { AdminOutboxMessage } from '#/types/api'

const outboxSearchSchema = z.object({
  page: z.coerce.number().int().min(1).optional().catch(undefined),
  customer_number: z.coerce.string().optional().catch(undefined),
  name: z.coerce.string().optional().catch(undefined),
  email: z.coerce.string().optional().catch(undefined),
})

export const Route = createFileRoute('/_auth/intern/ausgang')({
  validateSearch: outboxSearchSchema,
  component: OutboxPage,
})

function emptyToUndefined(value: string): string | undefined {
  return value.trim() === '' ? undefined : value.trim()
}

function truncate(text: string, length = 80): string {
  return text.length > length ? `${text.slice(0, length)}…` : text
}

function OutboxPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const filters: AdminOutboxFilters = {
    page: search.page,
    customer_number: search.customer_number,
    name: search.name,
    email: search.email,
  }

  const { data, isPending, isError } = useQuery(adminOutboxQuery(filters))

  const [sendOpen, setSendOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AdminOutboxMessage | null>(
    null,
  )
  const deleteMessage = useDeleteCompanyMessage()

  async function onDelete() {
    if (deleteTarget === null) return
    try {
      const response = await deleteMessage.mutateAsync(deleteTarget.id)
      toast.success(response.message)
    } catch (error) {
      toast.error(
        isApiError(error)
          ? error.message
          : 'Es ist ein unerwarteter Fehler aufgetreten. Bitte versuche es später erneut.',
      )
    } finally {
      setDeleteTarget(null)
    }
  }

  const columns: Array<DataTableColumn<AdminOutboxMessage>> = [
    {
      key: 'created_at',
      header: 'Datum',
      cell: (message) =>
        message.created_at !== null ? formatDate(message.created_at) : '–',
    },
    {
      key: 'recipient',
      header: 'Empfänger',
      cell: (message) =>
        message.recipient === null ? (
          <span className="text-muted-foreground">–</span>
        ) : (
          <div>
            <p>{message.recipient.name}</p>
            <p className="text-muted-foreground text-xs">
              {message.recipient.email}
            </p>
          </div>
        ),
    },
    {
      key: 'subject',
      header: 'Betreff',
      cell: (message) => (
        <span className="font-medium">{message.subject ?? '–'}</span>
      ),
    },
    {
      key: 'message',
      header: 'Nachricht',
      cell: (message) => (
        <span title={message.message}>{truncate(message.message)}</span>
      ),
    },
    {
      key: 'files',
      header: 'Anhänge',
      cell: (message) =>
        message.files.length === 0 ? (
          <span className="text-muted-foreground">–</span>
        ) : (
          <span className="inline-flex items-center gap-1">
            <Paperclip className="size-3" />
            {message.files.length}
          </span>
        ),
    },
    {
      key: 'read',
      header: 'Gelesen',
      cell: (message) =>
        message.read_at !== null ? (
          <Badge variant="secondary" title={formatDate(message.read_at)}>
            Gelesen
          </Badge>
        ) : (
          <Badge variant="outline">Ungelesen</Badge>
        ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Aktionen</span>,
      className: 'text-right',
      cell: (message) => (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setDeleteTarget(message)}
        >
          Löschen
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-semibold">Postausgang</h1>
        <Button onClick={() => setSendOpen(true)}>Nachricht senden</Button>
      </div>

      <OutboxFilterBar />

      {isError ? (
        <p className="text-muted-foreground text-sm">
          Der Postausgang konnte nicht geladen werden. Bitte versuche es
          später erneut.
        </p>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={data?.data}
            rowKey={(message) => message.id}
            isPending={isPending}
            emptyMessage="Keine Nachrichten im Postausgang."
          />
          <ServerPagination
            meta={data?.meta}
            itemLabel={['Nachricht', 'Nachrichten']}
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

      <SendMessageDialog open={sendOpen} onOpenChange={setSendOpen} />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nachricht löschen</AlertDialogTitle>
            <AlertDialogDescription>
              Soll die Nachricht
              {deleteTarget?.subject != null
                ? ` „${deleteTarget.subject}“`
                : ''}{' '}
              {deleteTarget?.recipient != null
                ? `an ${deleteTarget.recipient.name} `
                : ''}
              wirklich gelöscht werden? Sie verschwindet damit auch aus dem
              Postfach des Kunden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void onDelete()}
            >
              Nachricht löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function OutboxFilterBar() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const [customerNumber, setCustomerNumber] = useState(
    search.customer_number ?? '',
  )
  const [name, setName] = useState(search.name ?? '')
  const [email, setEmail] = useState(search.email ?? '')

  useEffect(() => {
    setCustomerNumber(search.customer_number ?? '')
    setName(search.name ?? '')
    setEmail(search.email ?? '')
  }, [search.customer_number, search.name, search.email])

  const hasActiveFilters =
    search.customer_number !== undefined ||
    search.name !== undefined ||
    search.email !== undefined

  function apply() {
    void navigate({
      search: {
        customer_number: emptyToUndefined(customerNumber),
        name: emptyToUndefined(name),
        email: emptyToUndefined(email),
        page: undefined,
      },
    })
  }

  return (
    <form
      className="grid items-end gap-3 md:grid-cols-[10rem_1fr_1fr_auto]"
      onSubmit={(event) => {
        event.preventDefault()
        apply()
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="filter-outbox-customer-number">Stammnummer</Label>
        <Input
          id="filter-outbox-customer-number"
          inputMode="numeric"
          placeholder="Stammnummer…"
          value={customerNumber}
          onChange={(event) => setCustomerNumber(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="filter-outbox-name">Name</Label>
        <Input
          id="filter-outbox-name"
          placeholder="Name suchen…"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="filter-outbox-email">E-Mail</Label>
        <Input
          id="filter-outbox-email"
          placeholder="E-Mail suchen…"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
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
