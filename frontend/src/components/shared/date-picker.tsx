import { useRef, useState } from 'react'
import type { ComponentProps, FocusEvent } from 'react'
import { CalendarIcon } from 'lucide-react'
import { de } from 'react-day-picker/locale'

import { Button } from '#/components/ui/button'
import { Calendar } from '#/components/ui/calendar'
import { Input } from '#/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'
import { formatDate, parseIsoDate, toIsoDate } from '#/lib/format'
import { cn } from '#/lib/utils'

const GERMAN_DATE_PATTERN = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/

/** `"1.2.2026"` → `"2026-02-01"`; ungültige Eingaben (auch 31.02.) → undefined. */
function parseGermanDate(text: string): string | undefined {
  const match = GERMAN_DATE_PATTERN.exec(text.trim())
  if (match === null) {
    return undefined
  }
  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined
  }
  return toIsoDate(date)
}

interface CalendarPanelProps {
  value: string | undefined
  min?: string
  max?: string
  onSelect: (date: string) => void
}

/** Gemeinsamer Popover-Kalender beider Varianten (deutsch, Monat/Jahr-Dropdowns). */
function CalendarPanel({ value, min, max, onSelect }: CalendarPanelProps) {
  const selected = value === undefined ? undefined : parseIsoDate(value)
  const minDate = min === undefined ? undefined : parseIsoDate(min)
  const maxDate = max === undefined ? undefined : parseIsoDate(max)

  // Tage außerhalb von min/max sperren (Array = ODER-Verknüpfung der Matcher).
  const disabledDays = [
    ...(minDate !== undefined ? [{ before: minDate }] : []),
    ...(maxDate !== undefined ? [{ after: maxDate }] : []),
  ]

  // Navigierbarer Bereich der Monat/Jahr-Dropdowns: ohne explizite Grenzen
  // endet react-day-picker im aktuellen Jahr – künftige Termine (z. B.
  // Kündigungsdatum) wären sonst unerreichbar.
  const endMonth = maxDate ?? new Date(new Date().getFullYear() + 10, 11)

  return (
    <Calendar
      mode="single"
      locale={de}
      selected={selected}
      defaultMonth={selected ?? minDate}
      captionLayout="dropdown"
      startMonth={minDate}
      endMonth={endMonth}
      disabled={disabledDays.length > 0 ? disabledDays : undefined}
      onSelect={(day) => {
        if (day) {
          onSelect(toIsoDate(day))
        }
      }}
    />
  )
}

interface DatePickerProps {
  /** Ausgewählter Tag als `yyyy-mm-dd`; `undefined` = noch keine Auswahl. */
  value: string | undefined
  onChange: (date: string) => void
  /** Beschriftung für Screenreader, z. B. "Datum auswählen". */
  label: string
  /** Platzhaltertext des Buttons, solange kein Datum gewählt ist. */
  placeholder?: string
  /** Frühester wählbarer Tag als `yyyy-mm-dd`. */
  min?: string
  /** Spätester wählbarer Tag als `yyyy-mm-dd`. */
  max?: string
  className?: string
}

/**
 * Kompakte Datumsauswahl (Button + Popover-Kalender) für Toolbars wie die
 * Chart-Navigation. In Formularen stattdessen {@link DateInput} verwenden –
 * dort soll das Datum auch tippbar sein und wie die übrigen Felder aussehen.
 * Native `<input type="date">` gibt es im Portal nicht.
 */
export function DatePicker({
  value,
  onChange,
  label,
  placeholder = 'Datum wählen',
  min,
  max,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const display = value === undefined ? undefined : formatDate(value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-8 font-normal',
            display === undefined && 'text-muted-foreground',
            className,
          )}
          aria-label={
            display === undefined ? label : `${label}, aktuell ${display}`
          }
        >
          <CalendarIcon aria-hidden="true" />
          {display ?? placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <CalendarPanel
          value={value}
          min={min}
          max={max}
          onSelect={(date) => {
            onChange(date)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

interface DateInputProps extends Omit<
  ComponentProps<'input'>,
  'value' | 'onChange' | 'type' | 'min' | 'max' | 'placeholder'
> {
  /** Ausgewählter Tag als `yyyy-mm-dd`; `undefined` = noch keine Auswahl. */
  value: string | undefined
  /** Erhält `yyyy-mm-dd` bzw. `''`, solange die Eingabe leer/unvollständig ist. */
  onChange: (date: string) => void
  /**
   * Frühester/spätester Tag als `yyyy-mm-dd` – sperrt nur den Kalender;
   * getippte Daten prüft das jeweilige Zod-Schema.
   */
  min?: string
  max?: string
}

/**
 * Datumsfeld für Formulare: sieht aus wie jedes andere `Input`, das Datum
 * lässt sich als `TT.MM.JJJJ` tippen ODER über den Kalender-Button rechts
 * im Feld auswählen. Wert nach außen bleibt `yyyy-mm-dd`.
 */
export function DateInput({
  value,
  onChange,
  min,
  max,
  className,
  onBlur,
  ...inputProps
}: DateInputProps) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(value === undefined ? '' : formatDate(value))

  // Externe Wertänderungen (Kalender-Auswahl, form.reset) in den Text
  // spiegeln, ohne die laufende Tastatureingabe zu überschreiben: `committed`
  // merkt sich den zuletzt selbst gemeldeten Wert.
  const committed = useRef(value)
  const normalizedValue = value === '' ? undefined : value
  if (normalizedValue !== committed.current) {
    committed.current = normalizedValue
    setText(normalizedValue === undefined ? '' : formatDate(normalizedValue))
  }

  function handleTextChange(raw: string) {
    setText(raw)
    const iso = parseGermanDate(raw)
    committed.current = iso
    onChange(iso ?? '')
  }

  function handleSelect(date: string) {
    committed.current = date
    setText(formatDate(date))
    onChange(date)
    setOpen(false)
  }

  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    // Gültige Eingaben beim Verlassen vereinheitlichen: "1.2.2026" → "01.02.2026".
    const iso = parseGermanDate(text)
    if (iso !== undefined) {
      setText(formatDate(iso))
    }
    onBlur?.(event)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn('relative', className)}>
        <Input
          type="text"
          autoComplete="off"
          placeholder="TT.MM.JJJJ"
          {...inputProps}
          value={text}
          onChange={(event) => handleTextChange(event.target.value)}
          onBlur={handleBlur}
          className="pr-9"
        />
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-1/2 right-1 size-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Kalender öffnen"
          >
            <CalendarIcon aria-hidden="true" />
          </Button>
        </PopoverTrigger>
      </div>
      <PopoverContent className="w-auto p-0" align="end">
        <CalendarPanel
          value={normalizedValue}
          min={min}
          max={max}
          onSelect={handleSelect}
        />
      </PopoverContent>
    </Popover>
  )
}
