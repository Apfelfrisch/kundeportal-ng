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
  className,
}: QuarterHourChartProps) {
  const config: ChartConfig = Object.fromEntries(
    series.map((entry) => [
      entry.key,
      { label: entry.label, theme: entry.color },
    ]),
  )
  const seriesByKey = new Map(series.map((entry) => [entry.key, entry]))
  const domain = chartDomain(from, until)
  const nowTs = showNow ? nowWithin(domain) : null

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
          domain={[(dataMin: number) => Math.min(0, dataMin), 'auto']}
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
        {series.map((entry) =>
          entry.kind === 'area' ? (
            <Area
              key={entry.key}
              dataKey={entry.key}
              type="stepAfter"
              stroke={`var(--color-${entry.key})`}
              strokeWidth={2}
              fill={`var(--color-${entry.key})`}
              fillOpacity={0.1}
              dot={false}
              activeDot={{ r: 4, stroke: 'var(--card)', strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          ) : (
            <Line
              key={entry.key}
              dataKey={entry.key}
              type="stepAfter"
              stroke={`var(--color-${entry.key})`}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: 'var(--card)', strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          ),
        )}
        {series.length > 1 ? (
          <ChartLegend content={<ChartLegendContent />} />
        ) : null}
      </ComposedChart>
    </ChartContainer>
  )
}
