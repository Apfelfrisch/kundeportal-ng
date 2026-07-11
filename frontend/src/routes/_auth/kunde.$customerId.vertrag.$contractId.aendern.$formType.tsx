import { createFileRoute, notFound } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'

import { ChangeRequestForm } from '#/components/customer/change-request-form'
import { isChangeRequestType } from '#/lib/change-requests'
import { contractQuery } from '#/queries/contracts'

/**
 * Ein Route-Eintrag für alle acht Änderungsformulare – `$formType` wird
 * gegen die bekannten Typen validiert, unbekannte Typen laufen ins 404.
 */
export const Route = createFileRoute(
  '/_auth/kunde/$customerId/vertrag/$contractId/aendern/$formType',
)({
  loader: ({ params }) => {
    if (!isChangeRequestType(params.formType)) {
      throw notFound()
    }
  },
  component: ChangeRequestPage,
})

function ChangeRequestPage() {
  const { customerId, contractId, formType } = Route.useParams()
  const { data: contract } = useSuspenseQuery(
    contractQuery(customerId, contractId),
  )

  if (!isChangeRequestType(formType)) {
    throw notFound()
  }

  return (
    <ChangeRequestForm
      key={formType}
      customerId={customerId}
      contractId={contractId}
      type={formType}
      contract={contract}
    />
  )
}
