import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts'

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '#/components/ui/chart'
import {
  chartDomain,
  dayBoundaries,
  formatSliceLabel,
  formatTimeTick,
  nowWithin,
  timeTicks,
} from '#/lib/charts'
import { cn } from '#/lib/utils'
import type { ChartConfig } from '#/components/ui/chart'
import type { QuarterHourPoint } from '#/lib/charts'

export interface ChartSeries {
  /** Datenschlüssel im `QuarterHourPoint`. */
  key: string
  label: string
  /** Validierte Palette (siehe `CHART_COLORS`), je Modus eine eigene Stufe. */
  color: { light: string; dark: string }
  kind: 'area' | 'line'
  /** Wert-Formatierung im Tooltip (inkl. Einheit). */
  formatValue: (value: number) => string
  /**
   * Färbt die Serie divergierend um eine Basislinie (z. B. Durchschnitt):
   * die Linie verläuft durchgängig vom `low`-Pol (unten) zum `high`-Pol
   * (oben), die Füllung hinterlegt nur den Bereich über der Basislinie mit
   * dem `high`-Pol. Zeichnet zusätzlich eine gestrichelte Referenzlinie.
   */
  diverging?: {
    baseline: number
    high: { light: string; dark: string }
    low: { light: string; dark: string }
    /** Beschriftung der Referenzlinie, z. B. `Ø 8,42 ct/kWh`. */
    label: string
  }
}

/**
 * Position der Basislinie (0 = oben, 1 = unten) innerhalb des Wertebereichs
 * `top…bottom` — die Füllung schneidet dort hart ab.
 */
function baselineOffset(baseline: number, top: number, bottom: number): number {
  const span = top - bottom

  if (span <= 0) {
    return 0
  }

  return Math.min(Math.max((top - baseline) / span, 0), 1)
}

interface QuarterHourChartProps {
  data: Array<QuarterHourPoint>
  /** Fenstergrenzen (`yyyy-mm-dd`) aus der API-Antwort. */
  from: string
  until: string
  series: Array<ChartSeries>
  /** Y-Achsen-Beschriftung, z. B. `"ct/kWh"`. */
  unit: string
  ariaLabel: string
  /** Gemeinsame Tooltip-Synchronisation gestapelter Panels. */
  syncId?: string
  /** „Jetzt“-Markierung einblenden (Börsenpreise). */
  showNow?: boolean
  /**
   * Unterkante der Y-Achse: `'zero'` (Standard) schließt die Null immer ein
   * (Mengen wie kWh), `'data'` beginnt am abgerundeten Datenminimum, damit
   * hoch liegende Kurven die volle Höhe nutzen.
   */
  yMin?: 'zero' | 'data'
  className?: string
}

/**
 * Stufendiagramm über ein 3-Tage-Fenster aus 15-Minuten-Scheiben
 * (Nachfolger der alten Chart.js-`stepped: 'after'`-Diagramme):
 * X = Zeit (Ticks alle 6 Stunden, Datum an Mitternacht), gestrichelte
 * Tagesgrenzen, Crosshair-Tooltip über alle Serien, Legende ab zwei Serien.
 */
export function QuarterHourChart({
  data,
  from,
  until,
  series,
  unit,
  ariaLabel,
  syncId,
  showNow = false,
  yMin = 'zero',
  className,
}: QuarterHourChartProps) {
  const config: ChartConfig = Object.fromEntries(
    series.flatMap((entry) => [
      [entry.key, { label: entry.label, theme: entry.color }],
      ...(entry.diverging !== undefined
        ? [
            [`${entry.key}High`, { theme: entry.diverging.high }],
            [`${entry.key}Low`, { theme: entry.diverging.low }],
          ]
        : []),
    ]),
  )
  const seriesByKey = new Map(series.map((entry) => [entry.key, entry]))
  const domain = chartDomain(from, until)
  const nowTs = showNow ? nowWithin(domain) : null

  const divergingSeries = series.filter(
    (entry) => entry.diverging !== undefined,
  )
  const valueRange = (key: string): { min: number; max: number } => {
    const values = data
      .map((point) => point[key])
      .filter((value): value is number => typeof value === 'number')
    return { min: Math.min(...values), max: Math.max(...values) }
  }

  // Explizite Unterkante bei `yMin: 'data'` — sie ist zugleich die Basislinie
  // der Area-Füllung und geht darum in die Füllverlaufs-Berechnung ein.
  const allValues = series
    .flatMap((entry) =>
      data.map((point) => point[entry.key]),
    )
    .filter((value): value is number => typeof value === 'number')
  const domainMin =
    yMin === 'data' && allValues.length > 0
      ? Math.floor(Math.min(...allValues))
      : null

  /**
   * Untere Kante des Füllpfads einer divergierenden Area. Recharts leitet
   * die Standard-Basislinie aus der GERENDERTEN Achsen-Domain ab (die durch
   * Tick-Rundung vom gesetzten Minimum abweichen kann) — deshalb wird sie
   * per `baseValue` explizit auf genau den Wert gepinnt, mit dem auch der
   * Füllverlaufs-Schnitt rechnet. Unterhalb der Basislinie ist die Füllung
   * ohnehin transparent.
   */
  const fillBaseline = (key: string): number =>
    domainMin ?? Math.min(0, valueRange(key).min)

  return (
    <ChartContainer
      config={config}
      className={cn('aspect-video max-h-96 w-full', className)}
      role="img"
      aria-label={ariaLabel}
    >
      <ComposedChart
        data={data}
        syncId={syncId}
        margin={{ top: 12, right: 24, left: 4, bottom: 0 }}
      >
        <defs>
          {divergingSeries.map((entry) => {
            const diverging = entry.diverging
            if (diverging === undefined || data.length === 0) {
              return null
            }
            const fillOffset = baselineOffset(
              diverging.baseline,
              valueRange(entry.key).max,
              fillBaseline(entry.key),
            )
            return [
              // Linie: durchgängiger Verlauf vom high- zum low-Pol.
              <linearGradient
                key={`${entry.key}-stroke`}
                id={`diverging-${entry.key}-stroke`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset={0}
                  style={{ stopColor: `var(--color-${entry.key}High)` }}
                />
                <stop
                  offset={1}
                  style={{ stopColor: `var(--color-${entry.key}Low)` }}
                />
              </linearGradient>,
              // Füllung: nur der Bereich über der Basislinie, harter Schnitt.
              <linearGradient
                key={`${entry.key}-fill`}
                id={`diverging-${entry.key}-fill`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset={0}
                  style={{ stopColor: `var(--color-${entry.key}High)` }}
                />
                <stop
                  offset={fillOffset}
                  style={{ stopColor: `var(--color-${entry.key}High)` }}
                />
                <stop
                  offset={fillOffset}
                  style={{
                    stopColor: `var(--color-${entry.key}High)`,
                    stopOpacity: 0,
                  }}
                />
              </linearGradient>,
            ]
          })}
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="ts"
          type="number"
          domain={domain}
          ticks={timeTicks(from, until)}
          tickFormatter={formatTimeTick}
          // Auf schmalen Screens kollidierende Ticks ausdünnen.
          interval="preserveStartEnd"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={11}
          // Eigene Zeile unter den Ticks für die Achsenbeschriftung.
          height={44}
          label={{
            value: 'Uhrzeit',
            position: 'insideBottomRight',
            fontSize: 11,
            fill: 'var(--muted-foreground)',
          }}
        />
        <YAxis
          width={56}
          domain={[
            domainMin ?? ((dataMin: number) => Math.min(0, dataMin)),
            'auto',
          ]}
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          fontSize={11}
          tickFormatter={(value: number) => value.toLocaleString('de-DE')}
          label={{
            value: unit,
            angle: -90,
            position: 'insideLeft',
            style: { textAnchor: 'middle' },
            fontSize: 11,
            fill: 'var(--muted-foreground)',
          }}
        />
        {dayBoundaries(from, until).map((boundary) => (
          <ReferenceLine
            key={boundary}
            x={boundary}
            stroke="var(--border)"
            strokeDasharray="5 4"
            label={{
              value: formatTimeTick(boundary),
              position: 'insideTopLeft',
              fontSize: 11,
              fill: 'var(--muted-foreground)',
            }}
          />
        ))}
        {divergingSeries.map((entry) =>
          entry.diverging === undefined ? null : (
            <ReferenceLine
              key={`baseline-${entry.key}`}
              y={entry.diverging.baseline}
              stroke="var(--muted-foreground)"
              strokeDasharray="6 4"
              label={{
                value: entry.diverging.label,
                position: 'insideBottomLeft',
                fontSize: 11,
                fill: 'var(--muted-foreground)',
              }}
            />
          ),
        )}
        {nowTs !== null ? (
          <ReferenceLine
            x={nowTs}
            stroke="var(--destructive)"
            strokeDasharray="4 4"
            label={{
              value: 'Jetzt',
              position: 'insideTopRight',
              fontSize: 11,
              fill: 'var(--destructive)',
            }}
          />
        ) : null}
        <ChartTooltip
          cursor={{ strokeDasharray: '4 4' }}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => {
                const first = payload[0]?.payload as
                  QuarterHourPoint | undefined
                return first === undefined ? null : formatSliceLabel(first.ts)
              }}
              formatter={(value, name) => {
                const entry = seriesByKey.get(String(name))
                if (entry === undefined || typeof value !== 'number') {
                  return null
                }
                return (
                  <>
                    <div
                      className="h-0.5 w-3 shrink-0 self-center rounded-full"
                      style={{ backgroundColor: `var(--color-${entry.key})` }}
                      aria-hidden="true"
                    />
                    <div className="flex flex-1 items-center justify-between gap-4 leading-none">
                      <span className="text-muted-foreground">
                        {entry.label}
                      </span>
                      <span className="text-foreground font-mono font-medium tabular-nums">
                        {entry.formatValue(value)}
                      </span>
                    </div>
                  </>
                )
              }}
            />
          }
        />
        {series.map((entry) => {
          const stroke =
            entry.diverging === undefined
              ? `var(--color-${entry.key})`
              : `url(#diverging-${entry.key}-stroke)`
          const activeDot = {
            r: 4,
            stroke: 'var(--card)',
            strokeWidth: 2,
            // Ein Verlauf würde relativ zur winzigen Punkt-Box aufgelöst.
            ...(entry.diverging === undefined
              ? {}
              : { fill: 'var(--muted-foreground)' }),
          }
          return entry.kind === 'area' ? (
            <Area
              key={entry.key}
              dataKey={entry.key}
              type="stepAfter"
              stroke={stroke}
              strokeWidth={2}
              baseValue={
                entry.diverging === undefined || data.length === 0
                  ? undefined
                  : fillBaseline(entry.key)
              }
              fill={
                entry.diverging === undefined
                  ? `var(--color-${entry.key})`
                  : `url(#diverging-${entry.key}-fill)`
              }
              fillOpacity={0.1}
              dot={false}
              activeDot={activeDot}
              connectNulls={false}
              isAnimationActive={false}
            />
          ) : (
            <Line
              key={entry.key}
              dataKey={entry.key}
              type="stepAfter"
              stroke={stroke}
              strokeWidth={2}
              dot={false}
              activeDot={activeDot}
              connectNulls={false}
              isAnimationActive={false}
            />
          )
        })}
        {series.length > 1 ? (
          <ChartLegend content={<ChartLegendContent />} />
        ) : null}
      </ComposedChart>
    </ChartContainer>
  )
}
