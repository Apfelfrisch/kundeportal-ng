import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { tenantQuery } from '#/queries/tenant'
import { useLogin } from '#/queries/session'
import { LoginForm } from '#/components/auth/login-form'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'

const loginSearchSchema = z.object({
  redirect: z.string().optional().catch(undefined),
})

export const Route = createFileRoute('/_guest/login')({
  validateSearch: loginSearchSchema,
  component: LoginPage,
})

function LoginPage() {
  const search = Route.useSearch()
  const router = useRouter()
  const { data: tenant } = useQuery(tenantQuery)
  const login = useLogin()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Anmelden</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-muted-foreground text-sm">
          Bitte gib Deine E-Mail-Adresse und Dein Passwort ein, um dich am{' '}
          {tenant?.name.short ?? ''} Kundenportal anzumelden.
        </p>
        <LoginForm
          login={async (values) => {
            const response = await login.mutateAsync(values)
            const user = response.data

            if (
              search.redirect !== undefined &&
              search.redirect.startsWith('/')
            ) {
              router.history.push(search.redirect)
              return
            }

            if (user.admin) {
              await router.navigate({ to: '/intern' })
            } else {
              await router.navigate({
                to: '/kunde/$customerId',
                params: { customerId: String(user.id) },
              })
            }
          }}
        />
        <p className="text-sm">
          <Link
            to="/passwort-vergessen"
            className="text-primary underline-offset-4 hover:underline"
          >
            Passwort vergessen?
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
