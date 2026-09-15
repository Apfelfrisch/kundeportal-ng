import { useRef, useState } from 'react'
import { StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native'

import { useScrollLock } from '@/components/Screen'
import { Txt } from '@/components/Txt'
import { formatCtValue } from '@/lib/format'
import { tick } from '@/lib/haptics'
import { priceColor, priceColorDim, pricePosition } from '@/lib/priceColor'
import { priceTicks } from '@/lib/prices'
import { useTheme } from '@/theme'

interface PriceStripProps {
  /** 24 Stundenwerte, null ohne Preis. */
  hourly: ReadonlyArray<number | null>
  currentHour: number
  height?: number
  /** Stunde unter dem Finger, null sobald er den Streifen verlässt. */
  onSelect?: (hour: number | null) => void
}

const AXIS_LABEL_HEIGHT = 14
const UNIT_GAP = 10
/** Platz über den Balken für die Einheit der Achse. */
const TOP_SPACE = AXIS_LABEL_HEIGHT + UNIT_GAP

/**
 * Tagesverlauf als 24 Balken, von Grün (Tagestief) bis Rot (Tageshoch)
 * gefärbt; die aktuelle Stunde leuchtet kräftig mit hellem Rand, die
 * übrigen sind gedämpft. Links eine Preisachse mit Einheit und runden
 * Stufen, die als feine Linien durch das Diagramm laufen. Solange ein
 * Finger auf dem Streifen liegt, wird der berührte Balken hervorgehoben und
 * die Stunde per `onSelect` gemeldet (die Karte zeigt dann deren Preis);
 * der Screen scrollt in dieser Zeit nicht.
 */
export function PriceStrip({ hourly, currentHour, height = 64, onSelect }: PriceStripProps) {
  const theme = useTheme()
  const lockScroll = useScrollLock()
  const [width, setWidth] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const lastHour = useRef<number | null>(null)

  function select(hour: number | null) {
    setSelected(hour)
    onSelect?.(hour)
  }

  function track(event: GestureResponderEvent) {
    const hour = hourAt(event)
    select(hour)
    // Ein kurzes Tick je Balkenwechsel, wie beim Drehen eines Rasters.
    if (hour !== null && hour !== lastHour.current) {
      lastHour.current = hour
      tick()
    }
  }

  function start(event: GestureResponderEvent) {
    lockScroll(true)
    track(event)
  }

  function end() {
    lockScroll(false)
    select(null)
    lastHour.current = null
  }
  const known = hourly.filter((value): value is number => value !== null)
  const max = known.length === 0 ? 0 : Math.max(...known)
  const min = known.length === 0 ? 0 : Math.min(...known)
  // Der höchste Balken füllt die ganze Höhe; die Achsenstufen enden darunter.
  const ticks = priceTicks(max)
  const scale = max <= 0 ? 0 : height / max

  // Die Balken sind für Touches unsichtbar, deshalb ist locationX immer
  // relativ zum Streifen selbst.
  function hourAt(event: GestureResponderEvent): number | null {
    if (width <= 0) return null
    return Math.min(23, Math.max(0, Math.floor((event.nativeEvent.locationX / width) * 24)))
  }

  return (
    <View style={styles.row}>
      <View style={[styles.axis, { paddingTop: TOP_SPACE - AXIS_LABEL_HEIGHT - UNIT_GAP }]}>
        <Txt variant="small" style={[styles.axisLabel, styles.axisUnit, { paddingBottom: UNIT_GAP }]}>
          Cent
        </Txt>
        <View style={[styles.axisTicks, { height }]}>
          {ticks.map((level) => (
            <Txt key={level} variant="small" style={[styles.axisLabel, styles.axisTick, { bottom: level * scale - AXIS_LABEL_HEIGHT / 2 }]}>
              {formatCtValue(level, 0)}
            </Txt>
          ))}
        </View>
      </View>
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
          style={[styles.touchArea, { paddingTop: TOP_SPACE }]}
          accessibilityLabel="Stundenpreise des Tages"
        >
          <View pointerEvents="none" style={[styles.bars, { height }]}>
            {ticks.map((level) => (
              <View key={level} style={[styles.gridLine, { bottom: level * scale, backgroundColor: level === 0 ? theme.border : theme.divider }]} />
            ))}
            {hourly.map((entry, hour) => {
              const barHeight = entry === null || scale <= 0 ? 2 : Math.max(4, Math.round(entry * scale))
              const current = hour === currentHour
              const position = entry === null ? null : pricePosition(entry, min, max)
              const color =
                hour === selected ? theme.fg
                : position === null ? theme.bar
                : current ? priceColor(position)
                : priceColorDim(position)
              return (
                <View
                  key={hour}
                  style={[
                    styles.bar,
                    { height: barHeight, backgroundColor: color },
                    current ? [styles.currentBar, { borderColor: theme.fg }] : null,
                  ]}
                />
              )
            })}
          </View>
        </View>
        <View style={styles.hours}>
          {['0', '6', '12', '18', '24 Uhr'].map((label) => (
            <Txt key={label} variant="small" style={styles.axisLabel}>
              {label}
            </Txt>
          ))}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  axis: { alignItems: 'flex-end', minWidth: 36 },
  axisUnit: { alignSelf: 'stretch', textAlign: 'center' },
  axisTicks: { alignSelf: 'stretch' },
  axisTick: { position: 'absolute', left: 0, right: 0, textAlign: 'center' },
  wrap: { flex: 1, gap: 4 },
  touchArea: { position: 'relative' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  gridLine: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth },
  bar: { flex: 1, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  currentBar: { borderWidth: 1.5, borderBottomWidth: 0 },
  hours: { flexDirection: 'row', justifyContent: 'space-between' },
  axisLabel: { fontSize: 11, lineHeight: AXIS_LABEL_HEIGHT, fontVariant: ['tabular-nums'] },
})
