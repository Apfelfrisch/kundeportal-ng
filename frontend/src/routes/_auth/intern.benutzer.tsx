import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'

import { isApiError } from '#/api/client'
import { AssignContractDialog } from '#/components/admin/assign-contract-dialog'
import { CreateUserDialog } from '#/components/admin/create-user-dialog'
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
import { formatDate } from '#/lib/format'
import {
  adminUsersQuery,
  useDeleteUser,
  useRemoveContractAssignment,
  useSendSetupMail,
} from '#/queries/admin'
import type { DataTableColumn } from '#/components/admin/data-table'
import type { AdminUserFilters } from '#/queries/admin'
import type { AdminUser, AdminUserContractAssignment } from '#/types/api'

const usersSearchSchema = z.object({
  page: z.coerce.number().int().min(1).optional().catch(undefined),
  id: z.coerce.string().optional().catch(undefined),
  name: z.coerce.string().optional().catch(undefined),
  email: z.coerce.string().optional().catch(undefined),
})

export const Route = createFileRoute('/_auth/intern/benutzer')({
  validateSearch: usersSearchSchema,
  component: UsersPage,
})

function emptyToUndefined(value: string): string | undefined {
  return value.trim() === '' ? undefined : value.trim()
}

interface RemoveAssignmentTarget {
  assignment: AdminUserContractAssignment
  userName: string
}

function UsersPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const filters: AdminUserFilters = {
    page: search.page,
    id: search.id,
    name: search.name,
    email: search.email,
  }

  const { data, isPending, isError } = useQuery(adminUsersQuery(filters))

  const [createOpen, setCreateOpen] = useState(false)
  const [assignUser, setAssignUser] = useState<AdminUser | null>(null)
  const [removeTarget, setRemoveTarget] =
    useState<RemoveAssignmentTarget | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)

  const sendSetupMail = useSendSetupMail()
  const removeAssignment = useRemoveContractAssignment()
  const deleteUser = useDeleteUser()

  function showError(error: unknown) {
    toast.error(
      isApiError(error)
        ? error.message
        : 'Es ist ein unerwarteter Fehler aufgetreten. Bitte versuche es später erneut.',
    )
  }

  async function onSendSetupMail(user: AdminUser) {
    try {
      // Backend unterscheidet: Passwort-Reset (Passwort gesetzt) oder
      // Einladungs-Mail (noch kein Passwort) – die Meldung kommt vom Server.
      const response = await sendSetupMail.mutateAsync(user.id)
      toast.success(response.message)
    } catch (error) {
      showError(error)
    }
  }

  async function onRemoveAssignment() {
    if (removeTarget === null) return
    try {
      const response = await removeAssignment.mutateAsync(
        removeTarget.assignment.id,
      )
      toast.success(response.message)
    } catch (error) {
      showError(error)
    } finally {
      setRemoveTarget(null)
    }
  }

  async function onDeleteUser() {
    if (deleteTarget === null) return
    try {
      const response = await deleteUser.mutateAsync(deleteTarget.id)
      toast.success(response.message)
    } catch (error) {
      showError(error)
    } finally {
      setDeleteTarget(null)
    }
  }

  const columns: Array<DataTableColumn<AdminUser>> = [
    {
      key: 'id',
      header: 'ID',
      cell: (user) => <span className="font-medium">{user.id}</span>,
    },
    {
      key: 'name',
      header: 'Name',
      cell: (user) => user.name,
    },
    {
      key: 'email',
      header: 'E-Mail',
      cell: (user) => user.email,
    },
    {
      key: 'customer_number',
      header: 'Kundennummer',
      cell: (user) =>
        user.customer_number ?? <span className="text-muted-foreground">–</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (user) => (
        <div className="flex flex-col gap-1">
          <Badge variant={user.email_verified ? 'secondary' : 'outline'}>
            {user.email_verified ? 'Verifiziert' : 'Nicht verifiziert'}
          </Badge>
          <Badge variant={user.password_set ? 'secondary' : 'outline'}>
            {user.password_set ? 'Passwort gesetzt' : 'Kein Passwort'}
          </Badge>
        </div>
      ),
    },
    {
      key: 'contracts',
      header: 'Verträge',
      cell: (user) =>
        user.contract_assignments.length === 0 ? (
          <span className="text-muted-foreground">–</span>
        ) : (
          <div className="flex max-w-56 flex-wrap gap-1">
            {user.contract_assignments.map((assignment) => (
              <span
                key={assignment.id}
                className="bg-muted inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
              >
                {assignment.contract_number}
                {!assignment.confirmed ? (
                  <Badge variant="destructive" className="px-1 text-[10px]">
                    Nicht bestätigt
                  </Badge>
                ) : null}
                <button
                  type="button"
                  aria-label={`Zuordnung für Vertrag ${assignment.contract_number} entfernen`}
                  title="Zuordnung entfernen"
                  onClick={() =>
                    setRemoveTarget({ assignment, userName: user.name })
                  }
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        ),
    },
    {
      key: 'created_at',
      header: 'Registriert',
      cell: (user) =>
        user.created_at !== null ? formatDate(user.created_at) : '–',
    },
    {
      key: 'actions',
      header: <span className="sr-only">Aktionen</span>,
      className: 'text-right',
      cell: (user) => (
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={sendSetupMail.isPending}
            onClick={() => void onSendSetupMail(user)}
          >
            {user.password_set ? 'Passwort zurücksetzen' : 'Einladungs-Mail senden'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAssignUser(user)}
          >
            Vertrag zuordnen
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteTarget(user)}
          >
            Löschen
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-semibold">Benutzerübersicht</h1>
        <Button onClick={() => setCreateOpen(true)}>Benutzer anlegen</Button>
      </div>

      <UsersFilterBar />

      {isError ? (
        <p className="text-muted-foreground text-sm">
          Die Benutzer konnten nicht geladen werden. Bitte versuche es später
          erneut.
        </p>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={data?.data}
            rowKey={(user) => user.id}
            isPending={isPending}
            emptyMessage="Keine Benutzer gefunden."
          />
          <ServerPagination
            meta={data?.meta}
            itemLabel={['Benutzer', 'Benutzer']}
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

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />

      <AssignContractDialog
        open={assignUser !== null}
        onOpenChange={(open) => {
          if (!open) setAssignUser(null)
        }}
        userId={assignUser?.id}
        userName={assignUser?.name}
      />

      <AlertDialog
        open={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zuordnung entfernen</AlertDialogTitle>
            <AlertDialogDescription>
              Zuweisung von Vertrag{' '}
              <strong>{removeTarget?.assignment.contract_number}</strong>{' '}
              wirklich entfernen? Der Benutzer {removeTarget?.userName} wird
              nicht gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={() => void onRemoveAssignment()}>
              Zuordnung entfernen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Benutzer löschen</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget !== null && deleteTarget.contract_assignments.length > 0
                ? `Möchten Sie den Benutzer ${deleteTarget.name} für die Verträge ${deleteTarget.contract_assignments
                    .map((assignment) => assignment.contract_number)
                    .join(', ')} wirklich löschen? `
                : `Möchten Sie den Benutzer ${deleteTarget?.name ?? ''} wirklich löschen? `}
              Alle Vertragszuordnungen, Nachrichten und hochgeladenen Dateien
              des Benutzers werden ebenfalls gelöscht. Diese Aktion kann nicht
              rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void onDeleteUser()}
            >
              Benutzer löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function UsersFilterBar() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const [id, setId] = useState(search.id ?? '')
  const [name, setName] = useState(search.name ?? '')
  const [email, setEmail] = useState(search.email ?? '')

  useEffect(() => {
    setId(search.id ?? '')
    setName(search.name ?? '')
    setEmail(search.email ?? '')
  }, [search.id, search.name, search.email])

  const hasActiveFilters =
    search.id !== undefined ||
    search.name !== undefined ||
    search.email !== undefined

  function apply() {
    void navigate({
      search: {
        id: emptyToUndefined(id),
        name: emptyToUndefined(name),
        email: emptyToUndefined(email),
        page: undefined,
      },
    })
  }

  return (
    <form
      className="grid items-end gap-3 md:grid-cols-[8rem_1fr_1fr_auto]"
      onSubmit={(event) => {
        event.preventDefault()
        apply()
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="filter-id">ID</Label>
        <Input
          id="filter-id"
          inputMode="numeric"
          placeholder="ID…"
          value={id}
          onChange={(event) => setId(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="filter-name">Name</Label>
        <Input
          id="filter-name"
          placeholder="Name suchen…"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="filter-email">E-Mail</Label>
        <Input
          id="filter-email"
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
