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

const TOOLTIP_WIDTH = 132
const TOOLTIP_HEIGHT = 40

/**
 * Tagesverlauf als 24 Balken, aktuelle Stunde in Mandantenfarbe. Beim
 * Tippen oder Darüberwischen erscheint der Preis der Stunde als Tooltip
 * über dem Balken.
 */
export function PriceStrip({ hourly, currentHour, height = 48 }: PriceStripProps) {
  const theme = useTheme()
  const [width, setWidth] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const known = hourly.filter((value): value is number => value !== null)
  const max = known.length === 0 ? 0 : Math.max(...known)

  // Die Balken sind für Touches unsichtbar, deshalb ist locationX immer
  // relativ zum Streifen selbst.
  function hourAt(event: GestureResponderEvent): number | null {
    if (width <= 0) return null
    return Math.min(23, Math.max(0, Math.floor((event.nativeEvent.locationX / width) * 24)))
  }

  const value = selected === null ? null : (hourly[selected] ?? null)
  const barWidth = width / 24
  const tooltipLeft =
    selected === null ? 0 : Math.min(Math.max(0, (selected + 0.5) * barWidth - TOOLTIP_WIDTH / 2), Math.max(0, width - TOOLTIP_WIDTH))

  return (
    <View style={styles.wrap}>
      <View
        onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(event) => setSelected(hourAt(event))}
        onResponderMove={(event) => setSelected(hourAt(event))}
        style={[styles.touchArea, { paddingTop: TOOLTIP_HEIGHT + 8 }]}
        accessibilityLabel="Stundenpreise des Tages"
      >
        <View pointerEvents="none" style={[styles.bars, { height, borderBottomColor: theme.border }]}>
          {hourly.map((entry, hour) => {
            const barHeight = entry === null || max <= 0 ? 2 : Math.max(4, Math.round((entry / max) * height))
            const color = hour === selected ? theme.fg : hour === currentHour ? theme.accent : theme.bar
            return <View key={hour} style={[styles.bar, { height: barHeight, backgroundColor: color }]} />
          })}
        </View>
        {selected !== null ? (
          <View pointerEvents="none" style={[styles.tooltip, { left: tooltipLeft, backgroundColor: theme.fg, borderRadius: theme.radius }]}>
            <Txt variant="small" color={theme.bg}>
              {hourRange(selected)}
            </Txt>
            <Txt variant="strong" color={theme.bg} style={styles.tooltipValue}>
              {value === null ? '–' : formatCt(value, 2)}
            </Txt>
          </View>
        ) : null}
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
  touchArea: { position: 'relative' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, borderBottomWidth: StyleSheet.hairlineWidth },
  bar: { flex: 1, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  tooltip: {
    position: 'absolute',
    top: 0,
    width: TOOLTIP_WIDTH,
    height: TOOLTIP_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  tooltipValue: { fontVariant: ['tabular-nums'] },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
  axisLabel: { fontSize: 11, fontVariant: ['tabular-nums'] },
})
