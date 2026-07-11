import { ChevronLeft, ChevronRight } from 'lucide-react'

import { DatePicker } from '#/components/shared/date-picker'
import { Button } from '#/components/ui/button'
import { formatDate } from '#/lib/format'

interface DayPagerProps {
  /** Zentrumstag des angezeigten Fensters (`yyyy-mm-dd`, von der API). */
  date: string
  prevDate: string
  /** null: vorwärts wäre das Fenster nicht mehr voll mit Preisen abgedeckt. */
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
      <DatePicker value={date} onChange={onSelect} label="Datum auswählen" />
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
