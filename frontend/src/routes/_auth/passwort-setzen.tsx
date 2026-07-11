import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { post } from '#/api/client'
import { sessionQuery, setSessionUser, useLogout } from '#/queries/session'
import { PasswordForm } from '#/components/auth/password-form'
import { TenantLogo } from '#/components/shared/tenant-logo'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Button } from '#/components/ui/button'

export const Route = createFileRoute('/_auth/passwort-setzen')({
  beforeLoad: ({ context }) => {
    if (context.session.password_set) {
      throw redirect({ to: '/' })
    }
  },
  component: SetPasswordPage,
})

function SetPasswordPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const logout = useLogout()

  return (
    <div className="bg-muted/40 flex min-h-screen flex-col items-center px-4 py-10">
      <div className="mb-8">
        <TenantLogo className="h-12" />
      </div>
      <main className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Neues Passwort speichern</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-muted-foreground space-y-2 text-sm">
              <p>
                Bitte setzen Sie hier Ihr Passwort, um sich am Kundenportal
                anmelden zu können.
              </p>
              <p>Das neue Passwort muss aus mindestens 12 Zeichen bestehen.</p>
            </div>
            <PasswordForm
              submitLabel="Neues Passwort speichern"
              submit={async (values) => {
                await post('/api/auth/set-password', values)
                const session = queryClient.getQueryData(sessionQuery.queryKey)
                if (session) {
                  setSessionUser(queryClient, {
                    ...session,
                    password_set: true,
                  })
                }
                toast.success('Dein Passwort wurde gespeichert.')
                await router.invalidate()
                await router.navigate({ to: '/' })
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
            >
              Abmelden
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
