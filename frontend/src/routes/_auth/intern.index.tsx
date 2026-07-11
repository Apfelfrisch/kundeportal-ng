import { useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

import { isApiError } from '#/api/client'
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
        <ContractSearchCard />
        <UserSearchCard />
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

function ContractSearchCard() {
  const navigate = useNavigate()
  const [contractNumber, setContractNumber] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  async function submit() {
    if (contractNumber.trim() === '') return
    setIsSearching(true)
    try {
      const response = await searchContract(contractNumber.trim())
      await navigate({
        to: '/intern/vertraege',
        search: { contract_number: String(response.data.contract_number) },
      })
    } catch (error) {
      toast.error(
        isApiError(error)
          ? error.message
          : 'Es ist ein unerwarteter Fehler aufgetreten. Bitte versuche es später erneut.',
      )
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Suche nach Vertragsnummer</CardTitle>
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
            <Label htmlFor="search-contract-number">Vertragsnummer</Label>
            <Input
              id="search-contract-number"
              type="number"
              inputMode="numeric"
              placeholder="Vertragsnummer suchen"
              value={contractNumber}
              onChange={(event) => setContractNumber(event.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={isSearching}>
            {isSearching ? 'Wird gesucht…' : 'Zum Vertrag'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function UserSearchCard() {
  const navigate = useNavigate()
  const [userId, setUserId] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  async function submit() {
    if (userId.trim() === '') return
    setIsSearching(true)
    try {
      const response = await searchUser(userId.trim())
      await navigate({
        to: '/intern/benutzer',
        search: { id: String(response.data.user_id) },
      })
    } catch (error) {
      toast.error(
        isApiError(error)
          ? error.message
          : 'Es ist ein unerwarteter Fehler aufgetreten. Bitte versuche es später erneut.',
      )
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Suche nach Stammnummer (User ID)
        </CardTitle>
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
            <Label htmlFor="search-user-id">Stammnummer</Label>
            <Input
              id="search-user-id"
              type="number"
              inputMode="numeric"
              placeholder="Benutzer-ID suchen"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={isSearching}>
            {isSearching ? 'Wird gesucht…' : 'Zum Kunden'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
