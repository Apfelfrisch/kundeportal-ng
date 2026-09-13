import { StyleSheet, View } from 'react-native'

import type { UsageWindow } from '@/api/types'
import { Card } from '@/components/Card'
import { ChartLegendCard } from '@/components/ChartLegendCard'
import { CostSplitCard } from '@/components/CostSplitCard'
import { LoadingBars } from '@/components/LoadingBars'
import { Txt } from '@/components/Txt'
import { UsageChart } from '@/components/UsageChart'
import { formatEuro, formatEuroValue, formatKwh, formatKwhValue } from '@/lib/format'
import { displayCostCt, invoicedNote, periodTitle, usageNote, type UsageUnit } from '@/lib/usage'
import { useTheme } from '@/theme'

interface UsageOverviewProps {
  data: UsageWindow
  unit: UsageUnit
  /** Neue Antwort unterwegs: Inhalt gedämpft, Welle über dem Diagramm. */
  busy?: boolean
  busyLabel: string
  /** Überschrift der Summenkarte; Standard ist der Kalenderzeitraum. */
  title?: string
  /** Erklärungskarte unter der Kostenaufteilung. */
  legend?: boolean
}

/**
 * Summenkarte, Diagramm und Kostenaufteilung eines Verbrauchszeitraums –
 * auf der Verbrauchsseite wie in der Rechnungsansicht.
 */
export function UsageOverview({ data, unit, busy = false, busyLabel, title, legend = true }: UsageOverviewProps) {
  const theme = useTheme()
  const totals = data.totals
  const costEur = displayCostCt(data) / 100
  const stale = busy ? styles.stale : undefined

  return (
    <View style={styles.content}>
      <Card gap={12} style={stale}>
        <Txt variant="label">{title ?? periodTitle(data.period, data.from)}</Txt>
        <View style={styles.summary}>
          <View style={styles.total}>
            <Txt variant="number">
              {unit === 'kwh' ? formatKwhValue(totals.usage_kwh) : formatEuroValue(costEur)}
            </Txt>
            <Txt variant="strong" color="muted">
              {unit === 'kwh' ? 'kWh' : '€'}
            </Txt>
          </View>
          <View style={styles.secondary}>
            <Txt variant="small">{unit === 'kwh' ? (data.invoiced === null ? 'Kosten' : 'Rechnung') : 'Verbrauch'}</Txt>
            <Txt variant="strong" color="muted" style={styles.secondaryValue}>
              {unit === 'kwh' ? formatEuro(costEur) : formatKwh(totals.usage_kwh)}
            </Txt>
          </View>
        </View>
        <Txt variant="muted">{data.invoiced === null ? usageNote(totals, data.available !== null) : invoicedNote(data.invoiced)}</Txt>
      </Card>
      <View>
        <Card padding={12} style={stale}>
          <UsageChart period={data.period} unit={unit} buckets={data.buckets} />
        </Card>
        {busy ? (
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: `${theme.bg}99`, borderRadius: theme.radius }]}>
            <LoadingBars label={busyLabel} />
          </View>
        ) : null}
      </View>
      {totals.has_data ? (
        <View style={stale}>
          <CostSplitCard totals={totals} />
        </View>
      ) : null}
      {legend ? <ChartLegendCard /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  stale: { opacity: 0.35 },
  overlay: { alignItems: 'center', justifyContent: 'center' },
  summary: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  total: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  secondary: { alignItems: 'flex-end', gap: 2 },
  secondaryValue: { fontVariant: ['tabular-nums'] },
})
