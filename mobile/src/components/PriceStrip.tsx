import { useState } from 'react'
import { StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native'

import { Txt } from '@/components/Txt'
import { formatCt } from '@/lib/format'
import { hourRange } from '@/lib/prices'
import { useTheme } from '@/theme'

interface PriceStripProps {
  /** 24 Stundenwerte, null ohne Preis. */
  hourly: ReadonlyArray<number | null>
  currentHour: number
  height?: number
}

/**
 * Tagesverlauf als 24 Balken, aktuelle Stunde in Mandantenfarbe. Tippen
 * oder mit dem Finger darüberfahren zeigt den Preis der Stunde an.
 */
export function PriceStrip({ hourly, currentHour, height = 48 }: PriceStripProps) {
  const theme = useTheme()
  const [width, setWidth] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const known = hourly.filter((value): value is number => value !== null)
  const max = known.length === 0 ? 0 : Math.max(...known)

  function hourAt(event: GestureResponderEvent): number | null {
    if (width <= 0) return null
    const hour = Math.floor((event.nativeEvent.locationX / width) * 24)
    return Math.min(23, Math.max(0, hour))
  }

  const shown = selected ?? currentHour
  const shownValue = hourly[shown] ?? null

  return (
    <View style={styles.wrap}>
      <View style={styles.caption}>
        <Txt variant="muted">{hourRange(shown)}</Txt>
        <Txt variant="strong" style={styles.captionValue}>
          {shownValue === null ? '–' : formatCt(shownValue, 2)}
        </Txt>
      </View>
      <View
        onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(event) => setSelected(hourAt(event))}
        onResponderMove={(event) => setSelected(hourAt(event))}
        style={[styles.bars, { height, borderBottomColor: theme.border }]}
        accessibilityLabel="Stundenpreise des Tages"
      >
        {hourly.map((value, hour) => {
          const barHeight = value === null || max <= 0 ? 2 : Math.max(4, Math.round((value / max) * height))
          const color = hour === currentHour ? theme.accent : hour === selected ? theme.fg : theme.bar
          return <View key={hour} style={[styles.bar, { height: barHeight, backgroundColor: color }]} />
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
  caption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 2 },
  captionValue: { fontVariant: ['tabular-nums'] },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, borderBottomWidth: StyleSheet.hairlineWidth },
  bar: { flex: 1, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
  axisLabel: { fontSize: 11, fontVariant: ['tabular-nums'] },
})
