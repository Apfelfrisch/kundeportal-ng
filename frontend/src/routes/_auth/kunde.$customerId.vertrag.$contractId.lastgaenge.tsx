import { Link, createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'

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
  formatDayHeading,
  formatKwhValue,
  formatUhrzeit,
  groupByDay,
  parseApiDateTime,
  sumBy,
} from '#/lib/charts'
import { formatDate, parseIsoDate } from '#/lib/format'
import { ediLoadProfilesQuery } from '#/queries/charts'
import { requireFeature } from '#/queries/tenant'
import type { EdiLoadProfileSlot } from '#/queries/charts'

/**
 * Lastgänge: viertelstündliche Smart-Meter-Verbräuche (EDI) als
 * Stufendiagramm plus Tagestabellen – Nachfolger der alten
 * `edi-contract-load-profile`-Seite.
 */
export const Route = createFileRoute(
  '/_auth/kunde/$customerId/vertrag/$contractId/lastgaenge',
)({
  validateSearch: chartDateSearchSchema,
  beforeLoad: requireFeature('edi_load_profiles'),
  loaderDeps: ({ search }) => ({ date: search.date }),
  loader: ({ context, params, deps }) =>
    context.queryClient.ensureQueryData(
      ediLoadProfilesQuery(params.customerId, params.contractId, deps.date),
    ),
  errorComponent: ChartErrorState,
  component: EdiLoadProfilesPage,
})

function EdiLoadProfilesPage() {
  const { customerId, contractId } = Route.useParams()
  const { date } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data } = useSuspenseQuery(
    ediLoadProfilesQuery(customerId, contractId, date),
  )

  const series = buildQuarterHourSeries({
    from: data.from,
    until: data.until,
    entries: data.entries,
    getStart: (entry) => entry.from,
    getValues: (entry) => ({ usage: entry.usage_kwh }),
    keys: ['usage'],
  })

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
        <h1 className="text-3xl font-semibold">Lastgänge</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Lastprofil viertelstündlich</CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              <span className="sr-only">Zeitraum: </span>
              {formatDate(parseIsoDate(data.from))} –{' '}
              {formatDate(parseIsoDate(data.until))}
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
        <CardContent>
          {data.entries.length > 0 ? (
            <QuarterHourChart
              data={series}
              from={data.from}
              until={data.until}
              unit="kWh"
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
          ) : (
            <ChartEmptyState>
              Für diesen Zeitraum liegen noch keine Lastgänge vor.
            </ChartEmptyState>
          )}
        </CardContent>
      </Card>

      {data.entries.length > 0 ? (
        <section aria-label="Tabellenübersicht" className="space-y-3">
          <h2 className="text-lg font-semibold">Tabellenübersicht</h2>
          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-3">
            {groupByDay(data.entries, (entry) => entry.from).map(
              ([day, entries]) => (
                <EdiDayTable key={day} day={day} entries={entries} />
              ),
            )}
          </div>
        </section>
      ) : null}
    </div>
  )
}

function EdiDayTable({
  day,
  entries,
}: {
  day: string
  entries: Array<EdiLoadProfileSlot>
}) {
  const heading = formatDayHeading(day)
  const totalUsage = sumBy(entries, (entry) => entry.usage_kwh)

  return (
    <Card className="gap-2">
      <CardHeader>
        <CardTitle className="text-sm">{heading}</CardTitle>
        <div className="text-muted-foreground text-xs">
          Gesamt:{' '}
          <span className="text-foreground font-medium tabular-nums">
            {formatKwhValue(totalUsage)} kWh
          </span>
        </div>
      </CardHeader>
      <CardContent className="max-h-80 overflow-y-auto">
        <Table aria-label={`Lastprofil für ${heading}`}>
          <TableHeader className="bg-card sticky top-0">
            <TableRow>
              <TableHead>Von</TableHead>
              <TableHead>Bis</TableHead>
              <TableHead className="text-right">Verbrauch (kWh)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.from}>
                <TableCell>
                  {formatUhrzeit(parseApiDateTime(entry.from))}
                </TableCell>
                <TableCell>
                  {formatUhrzeit(parseApiDateTime(entry.until))}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatKwhValue(entry.usage_kwh)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
