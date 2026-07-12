import { Link, createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { apiErrorMessage, get, post } from '#/api/client'
import { TenantLogo } from '#/components/shared/tenant-logo'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import type { ApiResponse, ContractConfirmationInfo } from '#/types/api'

// The mail link mirrors the signed API route's path parameter into the
// query string (contract). The signature covers the FULL query, so every
// search param must be passed back to the API unchanged.
const confirmationSearchSchema = z.object({
  contract: z.string().catch(''),
  expires: z.string().catch(''),
  signature: z.string().catch(''),
})

export const Route = createFileRoute('/vertrag-bestaetigen')({
  validateSearch: confirmationSearchSchema,
  component: ContractConfirmationPage,
})

function ContractConfirmationPage() {
  const search = Route.useSearch()

  const hasValidParams =
    search.contract !== '' && search.expires !== '' && search.signature !== ''

  const signedQuery = new URLSearchParams(search).toString()

  const confirmationUrl = `/api/auth/contract-confirmation/${encodeURIComponent(search.contract)}?${signedQuery}`

  const confirmationInfo = useQuery({
    queryKey: ['contract-confirmation', search],
    queryFn: async ({ signal }) => {
      const response = await get<ApiResponse<ContractConfirmationInfo>>(
        confirmationUrl,
        { signal },
      )
      return response.data
    },
    enabled: hasValidParams,
    retry: false,
    staleTime: Infinity,
  })

  const confirm = useMutation({
    mutationFn: () => post<undefined>(confirmationUrl),
  })

  const invalidLink = !hasValidParams || confirmationInfo.isError

  return (
    <div className="bg-muted/40 flex min-h-screen flex-col items-center px-4 py-10">
      <div className="mb-8">
        <TenantLogo className="h-12" />
      </div>
      <main className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Vertrag bestätigen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {invalidLink ? (
              <Alert variant="destructive">
                <AlertDescription>
                  Der Link ist ungültig oder abgelaufen. Bitte wende dich an
                  deinen Ansprechpartner, um eine neue Bestätigungs-E-Mail zu
                  erhalten.
                </AlertDescription>
              </Alert>
            ) : confirm.isSuccess ? (
              <>
                <Alert>
                  <AlertDescription>
                    Vielen Dank! Der Vertrag {search.contract} wurde
                    bestätigt.
                  </AlertDescription>
                </Alert>
                <p className="text-sm">
                  <Link
                    to="/login"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    Zur Anmeldung
                  </Link>
                </p>
              </>
            ) : confirmationInfo.data === undefined ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <>
                <p className="text-muted-foreground text-sm">
                  Bitte bestätige, dass der Vertrag{' '}
                  <strong>{confirmationInfo.data.contract_number}</strong>{' '}
                  deinem Benutzerkonto zugeordnet werden darf.
                </p>
                {confirm.isError ? (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {apiErrorMessage(confirm.error)}
                    </AlertDescription>
                  </Alert>
                ) : null}
                <Button
                  className="w-full"
                  onClick={() => confirm.mutate()}
                  disabled={confirm.isPending}
                >
                  {confirm.isPending ? 'Wird bestätigt…' : 'Vertrag bestätigen'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
