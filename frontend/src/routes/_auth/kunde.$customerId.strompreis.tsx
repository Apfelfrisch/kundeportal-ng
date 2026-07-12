import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { z } from 'zod'

import { ChartEmptyState } from '#/components/charts/chart-empty-state'
import { ChartErrorState } from '#/components/charts/chart-error'
import {
  CurrentPriceGauge,
  CurrentPriceGaugePlaceholder,
} from '#/components/charts/current-price-gauge'
import { DayPager } from '#/components/charts/day-pager'
import { QuarterHourChart } from '#/components/charts/quarter-hour-chart'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Label } from '#/components/ui/label'
import { Switch } from '#/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import {
  NEUTRAL_SERIES_COLOR,
  PRICE_DIVERGING_COLORS,
  buildQuarterHourSeries,
  chartDateSearchSchema,
  formatCtSummary,
  formatCtValue,
  formatDayHeading,
  formatUhrzeit,
  groupByDay,
  parseApiDateTime,
  sumBy,
} from '#/lib/charts'
import { marketPricesQuery } from '#/queries/charts'
import { requireFeature } from '#/queries/tenant'
import type { MarketPriceSlot } from '#/queries/charts'

/**
 * Strompreis: viertelstündliche Spotmarktpreise als Stufendiagramm über
 * ein 3-Tage-Fenster plus Tagestabellen – Nachfolger der alten
 * `exchange-electricity-prices`-Seite.
 */
export const Route = createFileRoute('/_auth/kunde/$customerId/strompreis')({
  // `vertrag`: Absprung-Vertrag für den Zurück-Link (die Seite selbst ist
  // kundenweit, der Einstieg sitzt auf der Vertragsseite).
  validateSearch: chartDateSearchSchema.extend({
    vertrag: z
      .string()
      .regex(/^\d+$/)
      .optional()
      .catch(undefined),
  }),
  beforeLoad: requireFeature('dynamic_electric_prices'),
  loaderDeps: ({ search }) => ({ date: search.date }),
  loader: ({ context, params, deps }) =>
    context.queryClient.ensureQueryData(
      marketPricesQuery(params.customerId, deps.date),
    ),
  errorComponent: ChartErrorState,
  component: MarketPricesPage,
})

function MarketPricesPage() {
  const { customerId } = Route.useParams()
  const { date, vertrag } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data } = useSuspenseQuery(marketPricesQuery(customerId, date))
  const [withTariffCosts, setWithTariffCosts] = useState(false)

  const tariffCosts = data.tariff_costs
  const surcharge =
    withTariffCosts && tariffCosts !== null ? tariffCosts.total_ct : 0

  // Der Tarifaufschlag ist je Viertelstunde konstant — Chart, Durchschnitt
  // und Tabellen verschieben sich gemeinsam.
  const displayPrices =
    surcharge === 0
      ? data.prices
      : data.prices.map((price) => ({
          ...price,
          cent_per_kwh: price.cent_per_kwh + surcharge,
        }))

  const averagePrice =
    displayPrices.length > 0
      ? sumBy(displayPrices, (price) => price.cent_per_kwh) /
        displayPrices.length
      : null

  // Aktuelle Viertelstunde für den Preis-Ring (nur wenn „jetzt“ im Fenster
  // liegt, z. B. nicht beim Blättern in die Vergangenheit).
  const nowMs = Date.now()
  const currentSlot =
    displayPrices.find(
      (price) =>
        parseApiDateTime(price.starts_at) <= nowMs &&
        nowMs < parseApiDateTime(price.ends_at),
    ) ?? null

  const series = buildQuarterHourSeries({
    from: data.from,
    until: data.until,
    entries: displayPrices,
    getStart: (price) => price.starts_at,
    getValues: (price) => ({ price: price.cent_per_kwh }),
    keys: ['price'],
  })

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          {vertrag !== undefined ? (
            <Link
              to="/kunde/$customerId/vertrag/$contractId"
              params={{ customerId, contractId: vertrag }}
            >
              <ArrowLeft aria-hidden="true" />
              Zurück zum Vertrag
            </Link>
          ) : (
            <Link to="/kunde/$customerId" params={{ customerId }}>
              <ArrowLeft aria-hidden="true" />
              Zurück zur Übersicht
            </Link>
          )}
        </Button>
        <h1 className="text-3xl font-semibold">Strompreis</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            {currentSlot !== null && averagePrice !== null ? (
              <CurrentPriceGauge
                value={currentSlot.cent_per_kwh}
                min={Math.min(...displayPrices.map((p) => p.cent_per_kwh))}
                max={Math.max(...displayPrices.map((p) => p.cent_per_kwh))}
                aboveAverage={currentSlot.cent_per_kwh >= averagePrice}
                timeRange={`${formatUhrzeit(parseApiDateTime(currentSlot.starts_at))} – ${formatUhrzeit(parseApiDateTime(currentSlot.ends_at))}`}
              />
            ) : (
              <CurrentPriceGaugePlaceholder />
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {averagePrice !== null ? (
                <span
                  className="text-lg leading-none font-semibold tabular-nums"
                  title={`Durchschnittspreis im Zeitraum${withTariffCosts ? ' (inkl. Tarifkosten)' : ''}`}
                >
                  <span className="sr-only">
                    Durchschnittspreis im Zeitraum
                    {withTariffCosts ? ' inkl. Tarifkosten' : ''}:{' '}
                  </span>
                  Ø {formatCtSummary(averagePrice)} ct/kWh
                </span>
              ) : null}
              {tariffCosts !== null ? (
                <span className="flex items-center gap-2">
                  <Switch
                    id="tariff-costs"
                    size="sm"
                    checked={withTariffCosts}
                    onCheckedChange={setWithTariffCosts}
                  />
                  <Label
                    htmlFor="tariff-costs"
                    className="text-sm font-normal"
                    // Aufschlüsselung ohne eigene Zeile — per Hover/Fokus.
                    title={`${Object.entries(tariffCosts.components)
                      .map(([label, ct]) => `${label} ${formatCtSummary(ct)}`)
                      .join(', ')} ct/kWh, netto`}
                  >
                    inkl. Tarifkosten ({formatCtSummary(tariffCosts.total_ct)}
                    {' ct/kWh)'}
                  </Label>
                </span>
              ) : null}
            </div>
          </div>
          <DayPager
            date={data.date}
            prevDate={data.navigation.prev_date}
            nextDate={data.navigation.next_date}
            showReset={date !== undefined}
            onSelect={(value) =>
              void navigate({ search: (prev) => ({ ...prev, date: value }) })
            }
          />
        </CardHeader>
        <CardContent>
          {data.prices.length > 0 ? (
            <QuarterHourChart
              data={series}
              from={data.from}
              until={data.until}
              unit="ct/kWh"
              showNow
              yMin="data"
              ariaLabel="Stufendiagramm der viertelstündlichen Strompreise in Cent pro Kilowattstunde. Preise über dem Durchschnitt sind rot, darunter grün eingefärbt. Die Detailwerte stehen in der Tabellenübersicht unterhalb."
              series={[
                {
                  key: 'price',
                  label: withTariffCosts
                    ? 'Preis inkl. Tarifkosten (ct/kWh)'
                    : 'Strompreis (ct/kWh)',
                  color: NEUTRAL_SERIES_COLOR,
                  kind: 'area',
                  formatValue: (value) => `${formatCtValue(value)} ct/kWh`,
                  ...(averagePrice !== null
                    ? {
                        diverging: {
                          baseline: averagePrice,
                          high: PRICE_DIVERGING_COLORS.high,
                          low: PRICE_DIVERGING_COLORS.low,
                        },
                      }
                    : {}),
                },
              ]}
            />
          ) : (
            <ChartEmptyState>
              Für diesen Zeitraum liegen keine Strompreise vor.
            </ChartEmptyState>
          )}
        </CardContent>
      </Card>

      {data.prices.length > 0 ? (
        <section aria-label="Tabellenübersicht" className="space-y-3">
          <h2 className="text-lg font-semibold">Tabellenübersicht</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {groupByDay(displayPrices, (price) => price.starts_at).map(
              ([day, prices]) => (
                <MarketPriceDayTable
                  key={day}
                  day={day}
                  prices={prices}
                  withTariffCosts={withTariffCosts && tariffCosts !== null}
                />
              ),
            )}
          </div>
        </section>
      ) : null}
    </div>
  )
}

function MarketPriceDayTable({
  day,
  prices,
  withTariffCosts,
}: {
  day: string
  prices: Array<MarketPriceSlot>
  withTariffCosts: boolean
}) {
  const heading = formatDayHeading(day)

  return (
    <Card className="gap-2">
      <CardHeader>
        <CardTitle className="text-sm">{heading}</CardTitle>
      </CardHeader>
      <CardContent className="max-h-80 overflow-y-auto">
        <Table aria-label={`Strompreise für ${heading}`}>
          <TableHeader className="bg-card sticky top-0">
            <TableRow>
              <TableHead>Uhrzeit</TableHead>
              <TableHead className="text-right">
                {withTariffCosts
                  ? 'Preis inkl. Tarifkosten (ct/kWh)'
                  : 'Preis (ct/kWh)'}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prices.map((price) => (
              <TableRow key={price.starts_at}>
                <TableCell>
                  {formatUhrzeit(parseApiDateTime(price.starts_at))}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCtValue(price.cent_per_kwh)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
