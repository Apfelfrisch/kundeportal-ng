import { Fragment, useState } from 'react'
import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react'

import { ChartEmptyState } from '#/components/charts/chart-empty-state'
import { ChartErrorState } from '#/components/charts/chart-error'
import { DayPager } from '#/components/charts/day-pager'
import { QuarterHourChart } from '#/components/charts/quarter-hour-chart'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import {
  CHART_COLORS,
  buildQuarterHourSeries,
  chartDateSearchSchema,
  formatCtValue,
  formatDayHeading,
  formatKwhValue,
  formatUhrzeit,
  groupByDay,
  parseApiDateTime,
  sumBy,
} from '#/lib/charts'
import { formatCt, formatDate, formatKwh } from '#/lib/format'
import { billedLoadProfilesQuery } from '#/queries/charts'
import { tenantQuery } from '#/queries/tenant'
import type { BilledLoadProfileSlot } from '#/queries/charts'

/**
 * Abrechnung dynamischer Strompreis: abgerechnete 15-Minuten-Lastprofile mit
 * Kostensplit – Nachfolger der alten `billed-contract-load-profile`-Seite.
 * Statt der alten Doppelachse (kWh + ct/kWh in einem Chart) zwei synchron
 * gekoppelte Panels mit gemeinsamer Zeitachse.
 */
export const Route = createFileRoute(
  '/_auth/kunde/$customerId/vertrag/$contractId/abrechnung',
)({
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
      billedLoadProfilesQuery(params.customerId, params.contractId, deps.date),
    ),
  errorComponent: ChartErrorState,
  component: BilledLoadProfilesPage,
})

function BilledLoadProfilesPage() {
  const { customerId, contractId } = Route.useParams()
  const { date } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data } = useSuspenseQuery(
    billedLoadProfilesQuery(customerId, contractId, date),
  )

  const series = buildQuarterHourSeries({
    from: data.from,
    until: data.until,
    entries: data.entries,
    getStart: (entry) => entry.from,
    getValues: (entry) => ({
      usage: entry.usage_kwh,
      stock: entry.stock_exchange_ct_kwh,
      total: entry.total_ct_kwh,
    }),
    keys: ['usage', 'stock', 'total'],
  })
  const hasEntries = data.entries.length > 0

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link
            to="/kunde/$customerId/vertrag/$contractId"
            params={{ customerId, contractId }}
          >
            <ArrowLeft aria-hidden="true" />
            Zurück zum Vertrag
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">Abgerechnete Lastprofile</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Lastprofil viertelstündlich</CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              <span className="sr-only">Zeitraum: </span>
              {formatDate(`${data.from}T00:00:00`)} –{' '}
              {formatDate(`${data.until}T00:00:00`)}
            </p>
          </div>
          <DayPager
            date={data.date}
            prevDate={data.navigation.prev_date}
            nextDate={data.navigation.next_date}
            showReset={date !== undefined}
            onSelect={(value) => void navigate({ search: { date: value } })}
          />
        </CardHeader>
        <CardContent className="space-y-4">
          {hasEntries ? (
            <>
              <QuarterHourChart
                data={series}
                from={data.from}
                until={data.until}
                unit="kWh"
                syncId="abrechnung"
                className="max-h-64"
                ariaLabel="Stufendiagramm des viertelstündlichen Verbrauchs in Kilowattstunden. Die Detailwerte stehen in der Tabellenübersicht unterhalb."
                series={[
                  {
                    key: 'usage',
                    label: 'Verbrauch (kWh)',
                    color: CHART_COLORS.blue,
                    kind: 'area',
                    formatValue: (value) => `${formatKwhValue(value)} kWh`,
                  },
                ]}
              />
              <QuarterHourChart
                data={series}
                from={data.from}
                until={data.until}
                unit="ct/kWh"
                syncId="abrechnung"
                className="max-h-64"
                ariaLabel="Stufendiagramm des viertelstündlichen Börsenpreises und Gesamtpreises in Cent pro Kilowattstunde. Die Detailwerte stehen in der Tabellenübersicht unterhalb."
                series={[
                  {
                    key: 'stock',
                    label: 'Börsenpreis (ct/kWh)',
                    color: CHART_COLORS.aqua,
                    kind: 'line',
                    formatValue: (value) => `${formatCtValue(value)} ct/kWh`,
                  },
                  {
                    key: 'total',
                    label: 'Gesamtpreis (ct/kWh)',
                    color: CHART_COLORS.yellow,
                    kind: 'line',
                    formatValue: (value) => `${formatCtValue(value)} ct/kWh`,
                  },
                ]}
              />
            </>
          ) : (
            <ChartEmptyState>
              Für diesen Zeitraum liegen noch keine abgerechneten Lastprofile
              vor.
            </ChartEmptyState>
          )}
        </CardContent>
      </Card>

      {hasEntries ? (
        <section aria-label="Tabellenübersicht" className="space-y-3">
          <h2 className="text-lg font-semibold">Tabellenübersicht</h2>
          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-3">
            {groupByDay(data.entries, (entry) => entry.from).map(
              ([day, entries]) => (
                <BilledDayTable key={day} day={day} entries={entries} />
              ),
            )}
          </div>
        </section>
      ) : null}
    </div>
  )
}

function BilledDayTable({
  day,
  entries,
}: {
  day: string
  entries: Array<BilledLoadProfileSlot>
}) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const heading = formatDayHeading(day)
  const totalUsage = sumBy(entries, (entry) => entry.usage_kwh)
  const totalCostCt = sumBy(
    entries,
    (entry) => entry.total_ct_kwh * entry.usage_kwh,
  )

  return (
    <Card className="gap-2">
      <CardHeader>
        <CardTitle className="text-sm">{heading}</CardTitle>
        <div className="text-muted-foreground flex gap-4 text-xs">
          <span>
            Verbrauch:{' '}
            <span className="text-foreground font-medium">
              {formatKwh(totalUsage)}
            </span>
          </span>
          <span>
            Kosten:{' '}
            <span className="text-foreground font-medium">
              {formatCt(totalCostCt)}
            </span>
          </span>
        </div>
      </CardHeader>
      <CardContent className="max-h-80 overflow-y-auto">
        <Table
          aria-label={`Lastprofil für ${heading} – Zeile aufklappen für die Preisaufschlüsselung`}
        >
          <TableHeader className="bg-card sticky top-0">
            <TableRow>
              <TableHead className="w-8">
                <span className="sr-only">Aufschlüsselung</span>
              </TableHead>
              <TableHead>Bis</TableHead>
              <TableHead className="text-right">kWh</TableHead>
              <TableHead className="text-right">ct/kWh</TableHead>
              <TableHead className="text-right">Cent</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => {
              const isExpanded = expanded === entry.from
              return (
                <Fragment key={entry.from}>
                  <TableRow
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    aria-label={`Preisaufschlüsselung für ${formatUhrzeit(parseApiDateTime(entry.until))} Uhr ${isExpanded ? 'verbergen' : 'anzeigen'}`}
                    className="cursor-pointer"
                    onClick={() => setExpanded(isExpanded ? null : entry.from)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setExpanded(isExpanded ? null : entry.from)
                      }
                    }}
                  >
                    <TableCell className="text-muted-foreground">
                      {isExpanded ? (
                        <ChevronDown className="size-3.5" aria-hidden="true" />
                      ) : (
                        <ChevronRight className="size-3.5" aria-hidden="true" />
                      )}
                    </TableCell>
                    <TableCell>
                      {formatUhrzeit(parseApiDateTime(entry.until))}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatKwhValue(entry.usage_kwh)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCtValue(entry.total_ct_kwh)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCtValue(entry.total_ct_kwh * entry.usage_kwh)}
                    </TableCell>
                  </TableRow>
                  {isExpanded ? (
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableCell colSpan={5}>
                        <PriceBreakdown entry={entry} />
                      </TableCell>
                    </TableRow>
                  ) : null}
                </Fragment>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

/** Preisaufschlüsselung einer 15-Minuten-Scheibe (ct/kWh + Anteil). */
function PriceBreakdown({ entry }: { entry: BilledLoadProfileSlot }) {
  const total = entry.total_ct_kwh
  const share = (part: number) =>
    total > 0 ? `${((part / total) * 100).toFixed(1).replace('.', ',')} %` : '–'

  const rows: Array<[string, number]> = [
    ['Börsenpreis', entry.stock_exchange_ct_kwh],
    ['Abgaben/Umlagen', entry.legal_costs_ct_kwh],
    ['Unser Aufschlag', entry.supplier_costs_ct_kwh],
  ]

  return (
    <dl className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1 text-xs">
      {rows.map(([label, value]) => (
        <Fragment key={label}>
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="text-right tabular-nums">
            {formatCtValue(value)} ct/kWh
          </dd>
          <dd className="text-muted-foreground text-right tabular-nums">
            {share(value)}
          </dd>
        </Fragment>
      ))}
      <dt className="border-t pt-1 font-medium">Summe</dt>
      <dd className="border-t pt-1 text-right font-medium tabular-nums">
        {formatCtValue(total)} ct/kWh
      </dd>
      <dd className="border-t pt-1" />
    </dl>
  )
}
