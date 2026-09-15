import { useRouter } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'
import { Pressable, StyleSheet, View } from 'react-native'

import { useUsage } from '@/api/queries'
import type { Contract } from '@/api/types'
import { Card } from '@/components/Card'
import { LoadingBars } from '@/components/LoadingBars'
import { Txt } from '@/components/Txt'
import { UsageChart } from '@/components/UsageChart'
import { formatEuro, formatKwh } from '@/lib/format'
import { displayCostCt, periodTitle } from '@/lib/usage'
import { useUser } from '@/providers/AuthProvider'
import { useTheme } from '@/theme'

/**
 * Startseite: der laufende Monat (genauer: der Monat mit den neuesten
 * Werten) als Summe und Tagesverlauf, antippen öffnet die Verbrauchsseite.
 */
export function UsageMonthCard({ contract }: { contract: Contract }) {
  const user = useUser()
  const router = useRouter()
  const theme = useTheme()
  const usage = useUsage(user.id, contract.contract_number, { period: 'month', date: null }, contract.is_dynamic)

  if (usage.isError) return null

  const data = usage.data

  return (
    <Pressable
      onPress={() => router.push('/(app)/verbrauch')}
      accessibilityRole="button"
      accessibilityLabel="Verbrauch des Monats öffnen"
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Card gap={8}>
        <View style={styles.header}>
          <Txt variant="label">{data === undefined ? 'Verbrauch' : `Verbrauch · ${periodTitle('month', data.from)}`}</Txt>
          <ChevronRight size={18} color={theme.faint} />
        </View>
        {data === undefined ? (
          <LoadingBars minHeight={100} />
        ) : (
          <>
            <View style={styles.summary}>
              <Txt variant="heading" style={styles.value}>
                {formatKwh(data.totals.usage_kwh)}
              </Txt>
              <Txt variant="strong" color="muted" style={styles.value}>
                {formatEuro(displayCostCt(data) / 100)}
                {data.totals.unbilled_kwh > 0 ? ' · teils vorläufig' : ''}
              </Txt>
            </View>
            <UsageChart period={data.period} unit="kwh" buckets={data.buckets} height={110} />
          </>
        )}
      </Card>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.85 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summary: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  value: { fontVariant: ['tabular-nums'] },
})
