import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

import { sessionQuery } from '#/queries/session'
import { tenantQuery } from '#/queries/tenant'
import { TenantLogo } from '#/components/shared/tenant-logo'

export const Route = createFileRoute('/_guest')({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(sessionQuery)
    if (session) {
      throw redirect({ to: '/' })
    }
  },
  component: GuestLayout,
})

function GuestLayout() {
  const { data: tenant } = useQuery(tenantQuery)

  return (
    <div className="bg-muted/40 flex min-h-screen flex-col items-center px-4 py-10">
      <div className="mb-8">
        <TenantLogo className="h-12" />
      </div>
      <main className="w-full max-w-md">
        <Outlet />
      </main>
      {tenant ? (
        <footer className="text-muted-foreground mt-10 text-center text-sm">
          <p>{tenant.name.long}</p>
          <p>
            <a
              href={tenant.website.href}
              target="_blank"
              rel="noreferrer"
              className="hover:underline"
            >
              {tenant.website.show}
            </a>
          </p>
        </footer>
      ) : null}
    </div>
  )
}
