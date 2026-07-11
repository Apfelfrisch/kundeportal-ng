import { useState } from 'react'
import { Link, Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Menu } from 'lucide-react'

import { tenantQuery } from '#/queries/tenant'
import { TenantLogo } from '#/components/shared/tenant-logo'
import { UserMenu } from '#/components/shared/user-menu'
import { Button } from '#/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '#/components/ui/sheet'

export const Route = createFileRoute('/_auth/kunde/$customerId')({
  beforeLoad: ({ context, params }) => {
    const session = context.session
    // Kunden dürfen nur den eigenen Bereich sehen; Admins jeden.
    if (!session.admin && String(session.id) !== params.customerId) {
      throw redirect({
        to: '/kunde/$customerId',
        params: { customerId: String(session.id) },
      })
    }
  },
  component: CustomerLayout,
})

interface NavItem {
  label: string
  available: boolean
}

function CustomerLayout() {
  const { session } = Route.useRouteContext()
  const { customerId } = Route.useParams()
  const { data: tenant } = useQuery(tenantQuery)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // „Vertrag“ ist die Index-Seite; die übrigen Bereiche folgen in Phase 9.
  const upcomingItems: Array<NavItem> = [
    { label: 'Postfach', available: false },
    { label: 'Profil', available: false },
    { label: 'Kontakt', available: false },
    ...(tenant?.features.dynamic_electric_prices
      ? [{ label: 'Börsenpreise', available: false }]
      : []),
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-background sticky top-0 z-10 border-b">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4">
          <Link
            to="/kunde/$customerId"
            params={{ customerId }}
            aria-label="Zur Übersicht"
          >
            <TenantLogo className="h-8" />
          </Link>
          <nav className="ml-6 hidden items-center gap-1 md:flex">
            <Button variant="ghost" asChild>
              <Link
                to="/kunde/$customerId"
                params={{ customerId }}
                activeProps={{ className: 'text-primary font-semibold' }}
                activeOptions={{ exact: true }}
              >
                Vertrag
              </Link>
            </Button>
            {upcomingItems.map((item) => (
              <span
                key={item.label}
                aria-disabled="true"
                title="Bald verfügbar"
                className="text-muted-foreground/60 cursor-not-allowed px-4 py-2 text-sm font-medium"
              >
                {item.label}
              </span>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <UserMenu user={session} />
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  aria-label="Menü öffnen"
                >
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>Menü</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 px-4">
                  <Link
                    to="/kunde/$customerId"
                    params={{ customerId }}
                    onClick={() => setMobileNavOpen(false)}
                    className="hover:bg-accent rounded-md px-3 py-2 text-sm font-medium"
                  >
                    Vertrag
                  </Link>
                  {upcomingItems.map((item) => (
                    <span
                      key={item.label}
                      aria-disabled="true"
                      title="Bald verfügbar"
                      className="text-muted-foreground/60 cursor-not-allowed px-3 py-2 text-sm font-medium"
                    >
                      {item.label}
                    </span>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
