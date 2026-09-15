import { StyleSheet, View } from 'react-native'

import type { UsageBucket } from '@/api/types'
import { Card } from '@/components/Card'
import { Txt } from '@/components/Txt'
import { formatEuro } from '@/lib/format'
import { SHARE_COLORS } from '@/lib/chartColors'
import { COST_SHARES, costSplit, wholePercents } from '@/lib/usage'
import { useTheme } from '@/theme'

/** Aufteilung der Kosten des Zeitraums in Börsenpreis, Aufschlag und Abgaben. */
export function CostSplitCard({ totals }: { totals: UsageBucket }) {
  const theme = useTheme()
  const split = costSplit(totals)
  const percents = wholePercents(split.share)

  return (
    <Card gap={14}>
      <View style={styles.row}>
        {COST_SHARES.map(({ key, label }) => (
          <View key={key} style={styles.entry}>
            <View style={styles.legend}>
              <View style={[styles.swatch, { backgroundColor: SHARE_COLORS[key] }]} />
              <Txt variant="strong">{percents[key]} %</Txt>
            </View>
            <Txt variant="small" numberOfLines={1}>
              {label}
            </Txt>
            <Txt variant="muted" style={styles.amount}>
              {formatEuro(split.ct[key] / 100)}
            </Txt>
          </View>
        ))}
      </View>
      <View style={[styles.bar, { backgroundColor: theme.bar }]}>
        {COST_SHARES.map(({ key }) =>
          split.share[key] > 0 ? <View key={key} style={{ flex: split.share[key], backgroundColor: SHARE_COLORS[key] }} /> : null,
        )}
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  entry: { flex: 1, gap: 2 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  amount: { fontVariant: ['tabular-nums'] },
  bar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden' },
})
