import { useEffect, useRef } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { toast } from 'sonner'

import { get, isApiError, post } from '#/api/client'
import { sessionQuery, setSessionUser, useLogout } from '#/queries/session'
import { TenantLogo } from '#/components/shared/tenant-logo'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'

// The mail link mirrors the signed API route's path parameters into the
// query string (user_id/email_hash). The signature covers the FULL query,
// so every search param must be passed back to the API unchanged.
const verifySearchSchema = z.object({
  user_id: z.string().optional().catch(undefined),
  email_hash: z.string().optional().catch(undefined),
  expires: z.string().optional().catch(undefined),
  signature: z.string().optional().catch(undefined),
})

export const Route = createFileRoute('/_auth/email-verifizieren')({
  validateSearch: verifySearchSchema,
  component: VerifyEmailPage,
})

function VerifyEmailPage() {
  const search = Route.useSearch()
  const router = useRouter()
  const queryClient = useQueryClient()
  const logout = useLogout()
  const verificationStarted = useRef(false)

  const hasSignedParams =
    search.user_id !== undefined &&
    search.email_hash !== undefined &&
    search.expires !== undefined &&
    search.signature !== undefined

  const verify = useMutation({
    mutationFn: () => {
      const signedQuery = new URLSearchParams(
        Object.fromEntries(
          Object.entries<string | undefined>(search).filter(
            (entry): entry is [string, string] => entry[1] !== undefined,
          ),
        ),
      ).toString()
      return get<unknown>(
        `/api/auth/verify-email/${search.user_id ?? ''}/${search.email_hash ?? ''}?${signedQuery}`,
      )
    },
    onSuccess: async () => {
      const session = queryClient.getQueryData(sessionQuery.queryKey)
      if (session) {
        setSessionUser(queryClient, { ...session, email_verified: true })
      }
      toast.success('Deine E-Mail-Adresse wurde bestätigt.')
      await router.invalidate()
      await router.navigate({ to: '/' })
    },
  })

  const startVerification = verify.mutate
  useEffect(() => {
    if (hasSignedParams && !verificationStarted.current) {
      verificationStarted.current = true
      startVerification()
    }
  }, [hasSignedParams, startVerification])

  const resend = useMutation({
    mutationFn: () =>
      post<unknown>('/api/auth/email/verification-notification'),
    onSuccess: () => {
      toast.success(
        'Ein neuer Bestätigungslink wurde an die E-Mail-Adresse gesendet, die du bei der Registrierung angegeben hast.',
      )
    },
    onError: (error) => {
      if (isApiError(error) && error.status === 429) {
        toast.error(
          'Bitte warte einen Moment, bevor du eine neue E-Mail anforderst.',
        )
      } else {
        toast.error(
          'Die E-Mail konnte nicht gesendet werden. Bitte versuche es später erneut.',
        )
      }
    },
  })

  return (
    <div className="bg-muted/40 flex min-h-screen flex-col items-center px-4 py-10">
      <div className="mb-8">
        <TenantLogo className="h-12" />
      </div>
      <main className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-xl">
              Vielen Dank für deine Anmeldung!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {verify.isPending ? (
              <p className="text-muted-foreground text-center text-sm">
                Deine E-Mail-Adresse wird bestätigt…
              </p>
            ) : (
              <>
                {verify.isError ? (
                  <Alert variant="destructive">
                    <AlertDescription>
                      Der Bestätigungslink ist ungültig oder abgelaufen. Bitte
                      fordere unten eine neue E-Mail an.
                    </AlertDescription>
                  </Alert>
                ) : null}
                <div className="text-muted-foreground space-y-2 text-sm">
                  <p>
                    Bevor du loslegen kannst, musst du noch deine E-Mail-Adresse
                    bestätigen.
                  </p>
                  <p>
                    Hierzu haben wir dir eine E-Mail an deine E-Mail-Adresse
                    gesandt. Klicke in dieser E-Mail bitte auf den
                    entsprechenden Link/Button.
                  </p>
                  <p>
                    Falls du die E-Mail nicht erhalten haben solltest, kannst du
                    dir über den folgenden Button die E-Mail erneut zusenden
                    lassen.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <Button
                    onClick={() => resend.mutate()}
                    disabled={resend.isPending}
                  >
                    {resend.isPending
                      ? 'Wird gesendet…'
                      : 'E-Mail erneut senden'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => logout.mutate()}
                    disabled={logout.isPending}
                  >
                    Abmelden
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
