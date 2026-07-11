import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import { get, post } from '#/api/client'
import { setSessionUser } from '#/queries/session'
import { PasswordForm } from '#/components/auth/password-form'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Skeleton } from '#/components/ui/skeleton'
import type { AccountSetupInfo, ApiResponse, User } from '#/types/api'

// The mail link mirrors the signed API route's path parameters into the
// query string (user_id/email_hash). The signature covers the FULL query,
// so every search param must be passed back to the API unchanged.
const accountSetupSearchSchema = z.object({
  user_id: z.string().catch(''),
  email_hash: z.string().catch(''),
  expires: z.string().catch(''),
  signature: z.string().catch(''),
})

export const Route = createFileRoute('/_guest/account/einrichten')({
  validateSearch: accountSetupSearchSchema,
  component: AccountSetupPage,
})

function AccountSetupPage() {
  const search = Route.useSearch()
  const router = useRouter()
  const queryClient = useQueryClient()

  const hasValidParams =
    search.user_id !== '' &&
    search.email_hash !== '' &&
    search.expires !== '' &&
    search.signature !== ''

  const signedQuery = new URLSearchParams(search).toString()

  const setupUrl = `/api/auth/account-setup/${search.user_id}/${search.email_hash}?${signedQuery}`

  const setupInfo = useQuery({
    queryKey: ['account-setup', search],
    queryFn: async ({ signal }) => {
      const response = await get<ApiResponse<AccountSetupInfo>>(setupUrl, {
        signal,
      })
      return response.data
    },
    enabled: hasValidParams,
    retry: false,
    staleTime: Infinity,
  })

  const invalidLink = !hasValidParams || setupInfo.isError

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center text-xl">Willkommen!</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {invalidLink ? (
          <>
            <Alert variant="destructive">
              <AlertDescription>
                Der Link ist ungültig oder abgelaufen. Bitte wende dich an
                deinen Ansprechpartner, um eine neue Einladung zu erhalten.
              </AlertDescription>
            </Alert>
            <p className="text-sm">
              <Link
                to="/login"
                className="text-primary underline-offset-4 hover:underline"
              >
                Zurück zur Anmeldung
              </Link>
            </p>
          </>
        ) : setupInfo.data === undefined ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <>
            <div className="text-muted-foreground space-y-2 text-sm">
              <p>
                Hallo {setupInfo.data.name} ({setupInfo.data.email}), bitte
                setzen Sie ein Passwort, um Ihren Account einzurichten.
              </p>
              <p>Das Passwort muss aus mindestens 12 Zeichen bestehen.</p>
            </div>
            <PasswordForm
              submitLabel="Account einrichten"
              submit={async (values) => {
                const response = await post<ApiResponse<User>>(setupUrl, values)
                setSessionUser(queryClient, response.data)
                await router.invalidate()
                await router.navigate({ to: '/' })
              }}
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}
