import { CircleUserRound, LogOut } from 'lucide-react'

import { useLogout } from '#/queries/session'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { Button } from '#/components/ui/button'
import type { User } from '#/types/api'

export function UserMenu({ user }: { user: User }) {
  const logout = useLogout()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2">
          <CircleUserRound className="size-5" />
          <span className="hidden sm:inline">{user.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span>{user.name}</span>
            <span className="text-muted-foreground text-xs font-normal">
              {user.email}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => logout.mutate()}
          disabled={logout.isPending}
        >
          <LogOut className="size-4" />
          Abmelden
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
