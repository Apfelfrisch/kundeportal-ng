import * as Haptics from 'expo-haptics'
import { useRef, useState } from 'react'
import { StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native'

import { useScrollLock } from '@/components/Screen'
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

const TOOLTIP_HEIGHT = 36

/**
 * Tagesverlauf als 24 Balken, aktuelle Stunde in Mandantenfarbe. Solange
 * ein Finger auf dem Streifen liegt, zeigt ein Tooltip den Preis der
 * berührten Stunde; der Screen scrollt in dieser Zeit nicht.
 */
export function PriceStrip({ hourly, currentHour, height = 48 }: PriceStripProps) {
  const theme = useTheme()
  const lockScroll = useScrollLock()
  const [width, setWidth] = useState(0)
  const [tooltipWidth, setTooltipWidth] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [touchX, setTouchX] = useState(0)
  const lastHour = useRef<number | null>(null)

  function track(event: GestureResponderEvent) {
    const hour = hourAt(event)
    setTouchX(event.nativeEvent.locationX)
    setSelected(hour)
    // Ein kurzes Tick je Balkenwechsel, wie beim Drehen eines Rasters.
    if (hour !== null && hour !== lastHour.current) {
      lastHour.current = hour
      void Haptics.selectionAsync().catch(() => undefined)
    }
  }

  function start(event: GestureResponderEvent) {
    lockScroll(true)
    track(event)
  }

  function end() {
    lockScroll(false)
    setSelected(null)
    lastHour.current = null
  }
  const known = hourly.filter((value): value is number => value !== null)
  const max = known.length === 0 ? 0 : Math.max(...known)

  // Die Balken sind für Touches unsichtbar, deshalb ist locationX immer
  // relativ zum Streifen selbst.
  function hourAt(event: GestureResponderEvent): number | null {
    if (width <= 0) return null
    return Math.min(23, Math.max(0, Math.floor((event.nativeEvent.locationX / width) * 24)))
  }

  const value = selected === null ? null : (hourly[selected] ?? null)
  // Der Tooltip folgt dem Finger und bleibt innerhalb des Streifens.
  const tooltipLeft = Math.min(Math.max(0, touchX - tooltipWidth / 2), Math.max(0, width - tooltipWidth))

  return (
    <View style={styles.wrap}>
      <View
        onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={start}
        onResponderMove={track}
        onResponderRelease={end}
        onResponderTerminate={end}
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
          <View
            pointerEvents="none"
            onLayout={(event: LayoutChangeEvent) => setTooltipWidth(event.nativeEvent.layout.width)}
            style={[styles.tooltip, { left: tooltipLeft, opacity: tooltipWidth === 0 ? 0 : 1, backgroundColor: theme.fg, borderRadius: theme.radius }]}
          >
            <Txt variant="strong" color={theme.bg} numberOfLines={1} style={styles.tooltipText}>
              {hourRange(selected)} · {value === null ? '–' : formatCt(value, 2)}
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
    height: TOOLTIP_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  tooltipText: { fontVariant: ['tabular-nums'], fontSize: 14 },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
  axisLabel: { fontSize: 11, fontVariant: ['tabular-nums'] },
})
