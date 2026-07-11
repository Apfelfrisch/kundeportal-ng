import { useState } from 'react'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'

import { ChartEmptyState } from '#/components/charts/chart-empty-state'
import { ChartErrorState } from '#/components/charts/chart-error'
import { DayPager } from '#/components/charts/day-pager'
import { QuarterHourChart } from '#/components/charts/quarter-hour-chart'
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
  formatCtValue,
  formatDayHeading,
  formatUhrzeit,
  groupByDay,
  parseApiDateTime,
} from '#/lib/charts'
import { formatDate } from '#/lib/format'
import { marketPricesQuery } from '#/queries/charts'
import { tenantQuery } from '#/queries/tenant'
import type { MarketPriceSlot } from '#/queries/charts'

/**
 * Börsenpreise: viertelstündliche Spotmarktpreise als Stufendiagramm über
 * ein 3-Tage-Fenster plus Tagestabellen – Nachfolger der alten
 * `exchange-electricity-prices`-Seite.
 */
export const Route = createFileRoute('/_auth/kunde/$customerId/boersenpreise')({
  validateSearch: chartDateSearchSchema,
  beforeLoad: async ({ context }) => {
    const tenant = await context.queryClient.ensureQueryData(tenantQuery)
    if (!tenant.features.dynamic_electric_prices) {
      throw notFound()
    }
  },
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
  const { date } = Route.useSearch()
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
      ? displayPrices.reduce((sum, price) => sum + price.cent_per_kwh, 0) /
        displayPrices.length
      : null

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
      <h1 className="text-3xl font-semibold">Börsenpreise</h1>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Börsenpreise viertelstündlich</CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              <span className="sr-only">Zeitraum: </span>
              {formatDate(`${data.from}T00:00:00`)} –{' '}
              {formatDate(`${data.until}T00:00:00`)}
            </p>
            {averagePrice !== null ? (
              <p className="mt-3">
                <span className="text-muted-foreground text-sm">
                  Durchschnittspreis im Zeitraum
                  {withTariffCosts ? ' (inkl. Tarifkosten)' : ''}
                </span>
                <span className="block text-2xl font-semibold tabular-nums">
                  {formatCtValue(averagePrice)} ct/kWh
                </span>
              </p>
            ) : null}
            {tariffCosts !== null ? (
              <div className="mt-3">
                <div className="flex items-center gap-2">
                  <Switch
                    id="tariff-costs"
                    checked={withTariffCosts}
                    onCheckedChange={setWithTariffCosts}
                  />
                  <Label htmlFor="tariff-costs">
                    Tarifkosten aufschlagen (
                    {formatCtValue(tariffCosts.total_ct)} ct/kWh)
                  </Label>
                </div>
                {withTariffCosts ? (
                  <p className="text-muted-foreground mt-1 text-sm">
                    {Object.entries(tariffCosts.components)
                      .map(
                        ([label, ct]) => `${label} ${formatCtValue(ct)}`,
                      )
                      .join(' · ')}{' '}
                    ct/kWh, netto
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
          <DayPager
            date={data.date}
            prevDate={data.navigation.prev_date}
            nextDate={data.navigation.next_date}
            showReset={date !== undefined}
            onSelect={(value) => void navigate({ search: { date: value } })}
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
              ariaLabel="Stufendiagramm der viertelstündlichen Börsenstrompreise in Cent pro Kilowattstunde. Eine gestrichelte Linie markiert den Durchschnittspreis; Preise darüber sind rot, darunter grün eingefärbt. Die Detailwerte stehen in der Tabellenübersicht unterhalb."
              series={[
                {
                  key: 'price',
                  label: withTariffCosts
                    ? 'Preis inkl. Tarifkosten (ct/kWh)'
                    : 'Börsenpreis (ct/kWh)',
                  color: NEUTRAL_SERIES_COLOR,
                  kind: 'area',
                  formatValue: (value) => `${formatCtValue(value)} ct/kWh`,
                  ...(averagePrice !== null
                    ? {
                        diverging: {
                          baseline: averagePrice,
                          high: PRICE_DIVERGING_COLORS.high,
                          low: PRICE_DIVERGING_COLORS.low,
                          label: `Ø ${formatCtValue(averagePrice)} ct/kWh`,
                        },
                      }
                    : {}),
                },
              ]}
            />
          ) : (
            <ChartEmptyState>
              Für diesen Zeitraum liegen keine Börsenpreise vor.
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
        <Table aria-label={`Börsenpreise für ${heading}`}>
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
