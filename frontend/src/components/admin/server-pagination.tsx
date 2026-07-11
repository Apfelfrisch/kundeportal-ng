import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '#/components/ui/button'
import type { PaginationMeta } from '#/types/api'

interface ServerPaginationProps {
  meta: PaginationMeta | undefined
  /** Wird mit der Zielseite aufgerufen; die Route schreibt sie in die URL. */
  onPageChange: (page: number) => void
  /** Einzahl/Mehrzahl für die Gesamtanzeige, z. B. ['Vertrag', 'Verträge']. */
  itemLabel?: [string, string]
}

/**
 * Server-Paginierung der Admin-Listen, gebunden an den `page`-Suchparameter
 * der Route (Zurück/Weiter wie die alte Blade-Paginierung).
 */
export function ServerPagination({
  meta,
  onPageChange,
  itemLabel = ['Eintrag', 'Einträge'],
}: ServerPaginationProps) {
  if (meta === undefined) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-muted-foreground text-sm">
        Seite {meta.current_page} von {Math.max(meta.last_page, 1)}
        {' · '}
        {meta.total} {meta.total === 1 ? itemLabel[0] : itemLabel[1]}
      </p>
      {meta.last_page > 1 ? (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={meta.current_page <= 1}
            onClick={() => onPageChange(meta.current_page - 1)}
          >
            <ChevronLeft className="size-4" />
            Zurück
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={meta.current_page >= meta.last_page}
            onClick={() => onPageChange(meta.current_page + 1)}
          >
            Weiter
            <ChevronRight className="size-4" />
          </Button>
        </div>
      ) : null}
    </div>
  )
}
