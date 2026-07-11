import { useState } from 'react'
import { Link, Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import {
  FileText,
  LayoutDashboard,
  Menu,
  Send,
  Ticket,
  UserRound,
  Users,
} from 'lucide-react'

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
import type { LucideIcon } from 'lucide-react'

export const Route = createFileRoute('/_auth/intern')({
  beforeLoad: ({ context }) => {
    if (!context.session.admin) {
      throw redirect({ to: '/' })
    }
  },
  component: AdminLayout,
})

interface AdminNavItem {
  label: string
  icon: LucideIcon
  to:
    | '/intern'
    | '/intern/vertraege'
    | '/intern/benutzer'
    | '/intern/tickets'
    | '/intern/ausgang'
    | '/intern/profil'
  exact?: boolean
}

const navItems: Array<AdminNavItem> = [
  { label: 'Start', icon: LayoutDashboard, to: '/intern', exact: true },
  { label: 'Verträge', icon: FileText, to: '/intern/vertraege' },
  { label: 'Benutzer', icon: Users, to: '/intern/benutzer' },
  { label: 'Tickets', icon: Ticket, to: '/intern/tickets' },
  { label: 'Ausgang', icon: Send, to: '/intern/ausgang' },
  { label: 'Profil', icon: UserRound, to: '/intern/profil' },
]

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1 p-4">
      {navItems.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          activeProps={{ className: 'bg-accent text-primary font-semibold' }}
          activeOptions={{
            exact: item.exact ?? false,
            includeSearch: false,
          }}
          className="hover:bg-accent flex items-center gap-2 rounded-md px-3 py-2 text-base font-medium"
        >
          <item.icon className="size-4" />
          {item.label}
        </Link>
      ))}
    </nav>
  )
}

function AdminLayout() {
  const { session } = Route.useRouteContext()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-background sticky top-0 z-10 border-b">
        <div className="flex h-16 items-center gap-4 px-4">
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
            <SheetContent side="left" className="w-64 p-0">
              <SheetHeader>
                <SheetTitle>Intern</SheetTitle>
              </SheetHeader>
              <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
            </SheetContent>
          </Sheet>
          <Link to="/intern" aria-label="Zum internen Bereich">
            <TenantLogo className="h-8" />
          </Link>
          <span className="text-muted-foreground hidden text-sm font-medium sm:inline">
            Interner Bereich
          </span>
          <div className="ml-auto">
            <UserMenu user={session} />
          </div>
        </div>
      </header>
      <div className="flex flex-1">
        <aside className="bg-sidebar hidden w-60 shrink-0 border-r md:block">
          <SidebarNav />
        </aside>
        <main className="w-full flex-1 px-4 py-8 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
