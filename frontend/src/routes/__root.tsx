import { useEffect } from 'react'
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { useQuery } from '@tanstack/react-query'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'
import { tenantQuery } from '#/queries/tenant'
import { Toaster } from '#/components/ui/sonner'
import { Button } from '#/components/ui/button'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

interface RouterAppContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Kundenportal',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
  component: RootComponent,
  errorComponent: RootErrorComponent,
  notFoundComponent: RootNotFoundComponent,
})

function RootComponent() {
  const { data: tenant } = useQuery(tenantQuery)

  useEffect(() => {
    if (tenant) {
      document.title = `${tenant.name.short} Kundenportal`
    }
  }, [tenant])

  return (
    <div className={tenant ? `theme-${tenant.slug}` : undefined}>
      <Outlet />
      <Toaster richColors position="top-center" />
    </div>
  )
}

function RootErrorComponent({ error }: { error: Error }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Es ist ein Fehler aufgetreten</h1>
      <p className="text-muted-foreground max-w-md">
        {error.message !== ''
          ? error.message
          : 'Bitte versuche es später erneut.'}
      </p>
      <Button onClick={() => window.location.reload()}>Seite neu laden</Button>
    </div>
  )
}

function RootNotFoundComponent() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Seite nicht gefunden</h1>
      <p className="text-muted-foreground max-w-md">
        Die angeforderte Seite existiert nicht oder wurde verschoben.
      </p>
      <Button asChild>
        <Link to="/">Zur Startseite</Link>
      </Button>
    </div>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
