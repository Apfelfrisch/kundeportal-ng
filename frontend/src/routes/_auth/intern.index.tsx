import { useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

import { apiErrorMessage } from '#/api/client'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Skeleton } from '#/components/ui/skeleton'
import { adminDashboardQuery, searchContract, searchUser } from '#/queries/admin'

export const Route = createFileRoute('/_auth/intern/')({
  component: AdminDashboardPage,
})

function AdminDashboardPage() {
  const { session } = Route.useRouteContext()
  const { data: dashboard, isPending } = useQuery(adminDashboardQuery)
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Offene Meldungen"
          count={dashboard?.tickets.open}
          isPending={isPending}
          search={{ status: 'open' as const }}
        />
        <StatCard
          title="In Arbeit"
          count={dashboard?.tickets.in_process}
          isPending={isPending}
          search={{ status: 'in_process' as const }}
        />
        <StatCard
          title="Meine Vorgänge"
          count={dashboard?.tickets.mine}
          isPending={isPending}
          search={{
            status: 'in_process' as const,
            caseworker: String(session.id),
          }}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SearchCard
          title="Suche nach Vertragsnummer"
          label="Vertragsnummer"
          inputId="search-contract-number"
          placeholder="Vertragsnummer suchen"
          buttonLabel="Zum Vertrag"
          onSearch={async (value) => {
            const response = await searchContract(value)
            await navigate({
              to: '/intern/vertraege',
              search: {
                contract_number: String(response.data.contract_number),
              },
            })
          }}
        />
        <SearchCard
          title="Suche nach Stammnummer (User ID)"
          label="Stammnummer"
          inputId="search-user-id"
          placeholder="Benutzer-ID suchen"
          buttonLabel="Zum Kunden"
          onSearch={async (value) => {
            const response = await searchUser(value)
            await navigate({
              to: '/intern/benutzer',
              search: { id: String(response.data.user_id) },
            })
          }}
        />
      </div>
    </div>
  )
}

function StatCard({
  title,
  count,
  isPending,
  search,
}: {
  title: string
  count: number | undefined
  isPending: boolean
  search: { status: 'open' | 'in_process'; caseworker?: string }
}) {
  return (
    <Link to="/intern/tickets" search={search} className="group">
      <Card className="h-full transition-colors group-hover:border-primary">
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          {isPending || count === undefined ? (
            <Skeleton className="h-10 w-16" />
          ) : (
            <p className="text-4xl font-semibold">{count}</p>
          )}
          <p className="text-muted-foreground mt-2 text-sm">
            Nachrichten anzeigen
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}

/** Suchkarte des Dashboards: eine Nummer eingeben, bei Treffer navigieren. */
function SearchCard({
  title,
  label,
  inputId,
  placeholder,
  buttonLabel,
  onSearch,
}: {
  title: string
  label: string
  inputId: string
  placeholder: string
  buttonLabel: string
  onSearch: (value: string) => Promise<void>
}) {
  const [value, setValue] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  async function submit() {
    if (value.trim() === '') return
    setIsSearching(true)
    try {
      await onSearch(value.trim())
    } catch (error) {
      toast.error(apiErrorMessage(error))
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <div className="space-y-2">
            <Label htmlFor={inputId}>{label}</Label>
            <Input
              id={inputId}
              type="number"
              inputMode="numeric"
              placeholder={placeholder}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={isSearching}>
            {isSearching ? 'Wird gesucht…' : buttonLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
