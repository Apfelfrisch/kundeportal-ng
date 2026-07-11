import { useEffect, useState } from 'react'
import { Link, Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { Menu } from 'lucide-react'

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

const navItems = [
  { label: 'Postfach', to: '/kunde/$customerId/postfach' },
  { label: 'Profil', to: '/kunde/$customerId/profil' },
  { label: 'Kontakt', to: '/kunde/$customerId/kontakt' },
] as const

function CustomerLayout() {
  const { session } = Route.useRouteContext()
  const { customerId } = Route.useParams()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Nur der Kundenbereich trägt das volle Tenant-Portal-Theme (bei
  // FriesenWerk dunkel); Login und Adminbereich bleiben neutral — wie im
  // alten App-Split zwischen layout/main und layout/guest|company.
  useEffect(() => {
    document.documentElement.classList.add('portal')
    return () => document.documentElement.classList.remove('portal')
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-background sticky top-0 z-10 border-b">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4">
          <Link
            to="/kunde/$customerId"
            params={{ customerId }}
            aria-label="Zur Übersicht"
          >
            <TenantLogo className="h-8" onDark />
          </Link>
          <nav className="ml-6 hidden items-center gap-1 md:flex">
            <Button variant="ghost" className="text-lg" asChild>
              <Link
                to="/kunde/$customerId"
                params={{ customerId }}
                activeProps={{ className: 'text-primary font-semibold' }}
                activeOptions={{ exact: true }}
              >
                Vertrag
              </Link>
            </Button>
            {navItems.map((item) => (
              <Button key={item.label} variant="ghost" className="text-lg" asChild>
                <Link
                  to={item.to}
                  params={{ customerId }}
                  activeProps={{ className: 'text-primary font-semibold' }}
                >
                  {item.label}
                </Link>
              </Button>
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
                    className="hover:bg-accent rounded-md px-3 py-2 text-lg font-medium"
                  >
                    Vertrag
                  </Link>
                  {navItems.map((item) => (
                    <Link
                      key={item.label}
                      to={item.to}
                      params={{ customerId }}
                      onClick={() => setMobileNavOpen(false)}
                      className="hover:bg-accent rounded-md px-3 py-2 text-lg font-medium"
                    >
                      {item.label}
                    </Link>
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
