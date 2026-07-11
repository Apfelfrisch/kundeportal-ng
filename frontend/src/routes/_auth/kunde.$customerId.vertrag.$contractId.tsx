import { Link, Outlet, createFileRoute, notFound } from '@tanstack/react-router'

import { isApiError } from '#/api/client'
import { Button } from '#/components/ui/button'
import { contractQuery } from '#/queries/contracts'

/**
 * Vertrags-Layout: lädt den vollständigen Vertrag in den Query-Cache –
 * Dashboard und Änderungsformulare lesen ihn per `useSuspenseQuery`.
 */
export const Route = createFileRoute(
  '/_auth/kunde/$customerId/vertrag/$contractId',
)({
  loader: async ({ context, params }) => {
    if (!/^\d+$/.test(params.contractId)) {
      throw notFound()
    }
    await context.queryClient.ensureQueryData(
      contractQuery(params.customerId, params.contractId),
    )
  },
  errorComponent: ContractErrorComponent,
  component: () => <Outlet />,
})

function ContractErrorComponent({ error }: { error: Error }) {
  const { customerId } = Route.useParams()
  const message =
    isApiError(error) && (error.status === 404 || error.status === 403)
      ? 'Der Vertrag wurde nicht gefunden oder du hast keinen Zugriff darauf.'
      : 'Der Vertrag konnte nicht geladen werden. Bitte versuche es später erneut.'

  return (
    <div className="space-y-4 py-12 text-center">
      <h1 className="text-2xl font-semibold">Vertrag nicht verfügbar</h1>
      <p className="text-muted-foreground">{message}</p>
      <Button asChild variant="outline">
        <Link to="/kunde/$customerId" params={{ customerId }}>
          Zur Vertragsübersicht
        </Link>
      </Button>
    </div>
  )
}
