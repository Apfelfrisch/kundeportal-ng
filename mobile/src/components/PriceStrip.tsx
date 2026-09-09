import { StyleSheet, View } from 'react-native'

import { Txt } from '@/components/Txt'
import { useTheme } from '@/theme'

interface PriceStripProps {
  /** 24 Stundenwerte, null ohne Preis. */
  hourly: ReadonlyArray<number | null>
  currentHour: number
  height?: number
}

/** Tagesverlauf als 24 Balken, aktuelle Stunde in Mandantenfarbe. */
export function PriceStrip({ hourly, currentHour, height = 48 }: PriceStripProps) {
  const theme = useTheme()
  const known = hourly.filter((value): value is number => value !== null)
  const max = known.length === 0 ? 0 : Math.max(...known)

  return (
    <View style={styles.wrap}>
      <View
        style={[styles.bars, { height, borderBottomColor: theme.border }]}
        accessibilityLabel="Stundenpreise des Tages"
      >
        {hourly.map((value, hour) => {
          const barHeight = value === null || max <= 0 ? 2 : Math.max(4, Math.round((value / max) * height))
          return (
            <View
              key={hour}
              style={[
                styles.bar,
                { height: barHeight, backgroundColor: hour === currentHour ? theme.accent : theme.bar },
              ]}
            />
          )
        })}
      </View>
      <View style={styles.axis}>
        {['0', '6', '12', '18', '24 Uhr'].map((label) => (
          <Txt key={label} variant="small" style={styles.axisLabel}>
            {label}
          </Txt>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, borderBottomWidth: StyleSheet.hairlineWidth },
  bar: { flex: 1, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
  axisLabel: { fontSize: 11, fontVariant: ['tabular-nums'] },
})
