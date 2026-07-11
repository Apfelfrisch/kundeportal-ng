import { useDeferredValue, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'

import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Skeleton } from '#/components/ui/skeleton'
import { adminUsersQuery } from '#/queries/admin'
import type { AdminUser } from '#/types/api'

interface UserPickerProps {
  value: AdminUser | null
  onSelect: (user: AdminUser | null) => void
}

/**
 * Empfänger-Auswahl für Firmen-Nachrichten: sucht in der Benutzerliste per
 * Name oder E-Mail (Eingaben mit `@` filtern nach E-Mail) und übernimmt
 * den gewählten Benutzer.
 */
export function UserPicker({ value, onSelect }: UserPickerProps) {
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search.trim())

  const filters = deferredSearch.includes('@')
    ? { email: deferredSearch }
    : { name: deferredSearch }

  const { data, isPending } = useQuery({
    ...adminUsersQuery(filters),
    enabled: deferredSearch.length >= 2,
  })

  if (value !== null) {
    return (
      <div className="bg-muted flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
        <span>
          {value.name} ({value.email}) – ID {value.id}
        </span>
        <button
          type="button"
          aria-label="Empfänger entfernen"
          onClick={() => onSelect(null)}
        >
          <X className="size-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Input
        placeholder="Name oder E-Mail suchen…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        autoComplete="off"
      />
      {deferredSearch.length < 2 ? (
        <p className="text-muted-foreground text-xs">
          Mindestens zwei Zeichen eingeben, um Benutzer zu suchen.
        </p>
      ) : isPending ? (
        <div className="space-y-1">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : data === undefined || data.data.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          Keine Benutzer gefunden.
        </p>
      ) : (
        <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-1">
          {data.data.slice(0, 10).map((user) => (
            <li key={user.id}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => onSelect(user)}
              >
                {user.name} ({user.email}) – ID {user.id}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
