import { PRICE_DIVERGING_COLORS, formatCtSummary } from '#/lib/charts'

const RADIUS = 42
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const STROKE = 7

interface CurrentPriceGaugeProps {
  /** Aktueller Preis in ct/kWh (inkl. eventuellem Tarifaufschlag). */
  value: number
  /** Tief/Hoch des angezeigten Fensters — bestimmt die Ringfüllung. */
  min: number
  max: number
  /** Lage zum Durchschnitt — bestimmt die Ringfarbe (rot/grün). */
  aboveAverage: boolean
  /** Aktuelle Viertelstunde, z. B. `17:15 – 17:30`. */
  timeRange: string
}

/**
 * Platzhalter in Ringgröße für Fenster ohne „jetzt“ (z. B. beim Blättern in
 * die Vergangenheit) — hält das Kopfzeilen-Layout stabil.
 */
export function CurrentPriceGaugePlaceholder() {
  return (
    <div className="size-32 shrink-0" aria-hidden="true">
      <svg viewBox="0 0 100 100" className="size-full">
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={STROKE}
        />
      </svg>
    </div>
  )
}

/**
 * Aktueller Preis als Ring: der äußere Bogen füllt sich proportional zur
 * Lage des Preises zwischen Fenster-Tief (leer) und -Hoch (voll), gefärbt
 * nach der Seite des Durchschnitts.
 */
export function CurrentPriceGauge({
  value,
  min,
  max,
  aboveAverage,
  timeRange,
}: CurrentPriceGaugeProps) {
  const span = max - min
  const fraction =
    span <= 0 ? 1 : Math.min(Math.max((value - min) / span, 0), 1)
  const color = aboveAverage
    ? PRICE_DIVERGING_COLORS.high.far.dark
    : PRICE_DIVERGING_COLORS.low.far.dark

  return (
    <div
      className="relative size-32 shrink-0"
      role="img"
      aria-label={`Aktueller Preis ${formatCtSummary(value)} ct/kWh (${timeRange} Uhr), ${Math.round(fraction * 100)} % zwischen Tief und Hoch des Zeitraums`}
    >
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={STROKE}
        />
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${fraction * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
        />
      </svg>
      {/* inset-4: Luft zwischen Ziffern und Ring. */}
      <div className="absolute inset-4 flex flex-col items-center justify-center gap-1">
        <span className="text-xl leading-none font-bold tabular-nums">
          {formatCtSummary(value)}
        </span>
        <span className="text-muted-foreground text-xs leading-none">
          ct/kWh
        </span>
        <span className="text-muted-foreground text-[11px] leading-none tabular-nums">
          {timeRange}
        </span>
      </div>
    </div>
  )
}
