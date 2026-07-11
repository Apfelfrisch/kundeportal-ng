import { useId } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { formatDate } from '#/lib/format'

interface DayPagerProps {
  /** Zentrumstag des angezeigten Fensters (`yyyy-mm-dd`, von der API). */
  date: string
  prevDate: string
  /** null: vorwärts würde das Fenster keine zwei Tage mehr abdecken. */
  nextDate: string | null
  /** `?date=` gesetzt? Dann „Heute“-Button zum Zurücksetzen anzeigen. */
  showReset: boolean
  /** `undefined` = Parameter entfernen (Standardtag des Backends). */
  onSelect: (date: string | undefined) => void
}

/**
 * Tages-Navigation der Chart-Seiten: runde Vor-/Zurück-Knöpfe um die
 * Datumsauswahl, „Heute“ zum Zurücksetzen – portiert aus der
 * Zeitraum-Navigation des Altsystems.
 */
export function DayPager({
  date,
  prevDate,
  nextDate,
  showReset,
  onSelect,
}: DayPagerProps) {
  const inputId = useId()

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="navigation"
      aria-label="Zeitraum-Navigation"
    >
      <Button
        variant="outline"
        size="icon"
        className="size-8 rounded-full"
        onClick={() => onSelect(prevDate)}
        aria-label={`Einen Tag zurück: ${formatDate(prevDate)}`}
      >
        <ChevronLeft aria-hidden="true" />
      </Button>
      <label htmlFor={inputId} className="sr-only">
        Datum auswählen
      </label>
      <Input
        id={inputId}
        // Key erzwingt den Reset auf den neuen Zentrumstag nach Navigation,
        // ohne Tipp-Zwischenstände (unvollständige Daten) zu verwerfen.
        key={date}
        type="date"
        defaultValue={date}
        onChange={(event) => {
          const value = event.target.value
          if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            onSelect(value)
          }
        }}
        className="h-8 w-fit"
      />
      <Button
        variant="outline"
        size="icon"
        className="size-8 rounded-full"
        disabled={nextDate === null}
        onClick={() => {
          if (nextDate !== null) {
            onSelect(nextDate)
          }
        }}
        aria-label={
          nextDate === null
            ? 'Einen Tag vor (keine weiteren Preise verfügbar)'
            : `Einen Tag vor: ${formatDate(nextDate)}`
        }
      >
        <ChevronRight aria-hidden="true" />
      </Button>
      {showReset ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onSelect(undefined)}
        >
          Heute
        </Button>
      ) : null}
    </div>
  )
}
