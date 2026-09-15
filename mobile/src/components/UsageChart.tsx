import { Fragment, useMemo, useRef, useState } from 'react'
import { StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native'
import Svg, { Line, Path, Rect } from 'react-native-svg'

import type { UsageBucket, UsagePeriod } from '@/api/types'
import { useScrollLock } from '@/components/Screen'
import { Txt } from '@/components/Txt'
import { SHARE_COLORS } from '@/lib/chartColors'
import { formatCt, formatCtValue, formatEuro, formatEuroValue, formatKwh, formatKwhValue } from '@/lib/format'
import { tick } from '@/lib/haptics'
import { axisLabels, bucketLabel, niceMax, smoothPath, stackedSegments, tooltipPrice, type Point, type UsageUnit } from '@/lib/usage'
import { useTheme } from '@/theme'

interface UsageChartProps {
  period: UsagePeriod
  unit: UsageUnit
  buckets: ReadonlyArray<UsageBucket>
  /** Höhe der Zeichenfläche (Standard 200). */
  height?: number
}

const DEFAULT_PLOT_HEIGHT = 200
const TOOLTIP_HEIGHT = 36
const AXIS_WIDTH = 48
const AXIS_GAP = 10
const PROVISIONAL_OPACITY = 0.45
const DIM_OPACITY = 0.45

/**
 * Balken je Stunde/Tag/Monat (kWh oder gestapelte Kosten in €) mit dem
 * einfachen Preisdurchschnitt als Linie an der rechten Achse – wie auf der
 * Lastgang-Seite in KVS unabhängig vom Verbrauch, daher ohne Lücken. Der
 * noch nicht abgerechnete Anteil ist blasser: in kWh als eigenes Segment
 * oben auf dem Balken, in € der ganze Balken. Ein Finger auf dem Diagramm
 * zeigt den berührten Balken im Detail; der Screen scrollt in dieser Zeit
 * nicht.
 */
export function UsageChart({ period, unit, buckets, height: plotHeight = DEFAULT_PLOT_HEIGHT }: UsageChartProps) {
  const theme = useTheme()
  const lockScroll = useScrollLock()
  const [width, setWidth] = useState(0)
  const [tooltipWidth, setTooltipWidth] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const lastIndex = useRef<number | null>(null)

  const count = buckets.length
  const slot = count === 0 || width <= 0 ? 0 : width / count
  const barWidth = Math.max(2, slot * (period === 'year' ? 0.55 : 0.68))
  const center = (index: number): number => slot * index + slot / 2
  const value = (bucket: UsageBucket): number => (unit === 'kwh' ? bucket.usage_kwh : bucket.cost_ct / 100)

  // Geometrie nur neu rechnen, wenn sich Daten, Einheit oder Breite ändern – nicht je Fingerbewegung.
  const geometry = useMemo(() => {
    const leftMax = niceMax(Math.max(0, ...buckets.map(value)))
    const rightMax = niceMax(Math.max(0, ...buckets.map((bucket) => bucket.price_ct_kwh ?? 0)))
    const y = (amount: number, max: number): number => plotHeight - Math.min(plotHeight, Math.max(0, (amount / max) * plotHeight))

    // Die Preislinie läuft nur durch Balken mit Werten – jede Lücke beginnt einen neuen Abschnitt.
    const runs: Array<Array<Point>> = [[]]
    buckets.forEach((bucket, index) => {
      const run = runs[runs.length - 1] ?? []
      if (bucket.price_ct_kwh === null) {
        if (run.length > 0) runs.push([])
        return
      }
      run.push({ x: center(index), y: y(bucket.price_ct_kwh, rightMax) })
    })

    const bars = buckets.map((bucket, index) => {
      const x = center(index) - barWidth / 2
      if (unit === 'kwh') {
        const total = Math.max(bucket.has_data ? 2 : 0, plotHeight - y(bucket.usage_kwh, leftMax))
        const provisional = Math.min(total, plotHeight - y(bucket.unbilled_kwh, leftMax))
        return { x, total, provisional, segments: [] as Array<{ key: string; y: number; height: number; color: string }> }
      }
      let bottom = plotHeight
      const segments = stackedSegments(bucket).map((segment) => {
        const height = (segment.ct / 100 / leftMax) * plotHeight
        bottom -= height
        return { key: segment.key, y: bottom, height, color: SHARE_COLORS[segment.key] }
      })
      return { x, total: 0, provisional: 0, segments }
    })

    return { leftMax, rightMax, runs: runs.filter((run) => run.length > 1).map(smoothPath), bars, labels: axisLabels(period, buckets) }
    // slot und barWidth folgen aus width und count, value aus unit.
  }, [buckets, unit, width, period, plotHeight])

  function indexAt(event: GestureResponderEvent): number | null {
    if (slot <= 0) return null
    return Math.min(count - 1, Math.max(0, Math.floor(event.nativeEvent.locationX / slot)))
  }

  function track(event: GestureResponderEvent) {
    const index = indexAt(event)
    if (index === lastIndex.current) return
    lastIndex.current = index
    setSelected(index)
    if (index !== null) tick()
  }

  function start(event: GestureResponderEvent) {
    lockScroll(true)
    track(event)
  }

  function end() {
    lockScroll(false)
    setSelected(null)
    lastIndex.current = null
  }

  const selectedBucket = selected === null ? null : (buckets[selected] ?? null)
  const tooltipLeft =
    selected === null ? 0 : Math.min(Math.max(0, center(selected) - tooltipWidth / 2), Math.max(0, width - tooltipWidth))
  const formatLeft = (amount: number): string => (unit === 'kwh' ? formatKwh(amount) : formatEuro(amount))

  function tooltipText(bucket: UsageBucket): string {
    if (!bucket.has_data) return `${bucketLabel(period, bucket)} · keine Werte`
    const price = tooltipPrice(bucket)
    return [
      bucketLabel(period, bucket),
      formatLeft(value(bucket)),
      price === null ? null : formatCt(price, 1),
    ]
      .filter((part) => part !== null)
      .join(' · ')
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.unitRow}>
        <Txt variant="small" style={[styles.unit, styles.axis]}>
          {unit === 'kwh' ? 'kWh' : '€'}
        </Txt>
        <Txt variant="small" style={[styles.unit, styles.axis, styles.axisRight]}>
          ct
        </Txt>
      </View>
      <View style={styles.plotRow}>
        <View style={[styles.axis, { height: plotHeight }]}>
          {[geometry.leftMax, geometry.leftMax / 2, 0].map((amount, index) => (
            <Txt key={index} variant="small" style={styles.axisLabel} numberOfLines={1}>
              {unit === 'kwh' ? formatKwhValue(amount) : formatEuroValue(amount)}
            </Txt>
          ))}
        </View>
        <View
          style={[styles.plot, { height: plotHeight }]}
          onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={start}
          onResponderMove={track}
          onResponderRelease={end}
          onResponderTerminate={end}
          accessibilityLabel="Verbrauch je Zeitabschnitt"
        >
          {width > 0 ? (
            <Svg width={width} height={plotHeight} pointerEvents="none">
              {[0, 0.5, 1].map((fraction) => (
                // Eine feine Linie je Achsenschritt, wie im Preisverlauf: Grundlinie
                // in Rahmenfarbe, die Stufen darüber in Trennlinienfarbe.
                <Line
                  key={fraction}
                  x1={0}
                  x2={width}
                  y1={plotHeight - fraction * plotHeight}
                  y2={plotHeight - fraction * plotHeight}
                  stroke={fraction === 0 ? theme.border : theme.divider}
                  strokeWidth={StyleSheet.hairlineWidth}
                />
              ))}
              {geometry.bars.map((bar, index) => {
                const bucket = buckets[index]
                if (bucket === undefined) return null
                const dim = selected !== null && selected !== index
                const fill = (color: string): string => (selected === index ? theme.fg : color)
                if (unit === 'kwh') {
                  return (
                    <Fragment key={bucket.from}>
                      <Rect x={bar.x} y={plotHeight - bar.total} width={barWidth} height={bar.total} rx={2} fill={fill(theme.chartUsage)} opacity={dim ? DIM_OPACITY : 1} />
                      {bar.provisional > 0 ? (
                        <Rect
                          x={bar.x}
                          y={plotHeight - bar.total}
                          width={barWidth}
                          height={bar.provisional}
                          rx={2}
                          fill={theme.bg}
                          opacity={(dim ? DIM_OPACITY : 1) * (1 - PROVISIONAL_OPACITY)}
                        />
                      ) : null}
                    </Fragment>
                  )
                }
                const provisionalBar = bucket.unbilled_ct > 0
                return bar.segments.map((segment) => (
                  <Rect
                    key={`${bucket.from}-${segment.key}`}
                    x={bar.x}
                    y={segment.y}
                    width={barWidth}
                    height={segment.height}
                    fill={fill(segment.color)}
                    opacity={(dim ? DIM_OPACITY : 1) * (provisionalBar ? PROVISIONAL_OPACITY + 0.15 : 1)}
                  />
                ))
              })}
              {geometry.runs.map((run, index) => (
                <Path key={index} d={run} fill="none" stroke={theme.chartLine} strokeWidth={1.5} strokeLinecap="round" />
              ))}
            </Svg>
          ) : null}
          {selectedBucket !== null ? (
            <View
              pointerEvents="none"
              onLayout={(event: LayoutChangeEvent) => setTooltipWidth(event.nativeEvent.layout.width)}
              style={[
                styles.tooltip,
                { left: tooltipLeft, opacity: tooltipWidth === 0 ? 0 : 1, backgroundColor: theme.fg, borderRadius: theme.radius },
              ]}
            >
              <Txt variant="strong" color={theme.bg} numberOfLines={1} style={styles.tooltipText}>
                {tooltipText(selectedBucket)}
              </Txt>
            </View>
          ) : null}
        </View>
        <View style={[styles.axis, styles.axisRight, { height: plotHeight }]}>
          {[geometry.rightMax, geometry.rightMax / 2, 0].map((amount, index) => (
            <Txt key={index} variant="small" style={styles.axisLabel} numberOfLines={1}>
              {formatCtValue(amount, 0)}
            </Txt>
          ))}
        </View>
      </View>
      <View style={[styles.labels, { marginLeft: AXIS_WIDTH, marginRight: AXIS_WIDTH }]}>
        {geometry.labels.map(({ index, label }) => (
          <Txt key={index} variant="small" style={[styles.label, { left: center(index) - 30 }]} numberOfLines={1}>
            {label}
          </Txt>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  // Einheit je Achse über den Werten, bündig mit der Achsenspalte und mit etwas Abstand zu den Zahlen.
  unitRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  unit: { fontSize: 11, textAlign: 'center' },
  plotRow: { flexDirection: 'row', alignItems: 'flex-start' },
  axis: { width: AXIS_WIDTH, justifyContent: 'space-between', paddingRight: AXIS_GAP },
  axisRight: { paddingRight: 0, paddingLeft: AXIS_GAP },
  // Werte und Einheit mittig in derselben Spalte, damit die Einheit genau über den Zahlen steht.
  axisLabel: { fontSize: 11, fontVariant: ['tabular-nums'], lineHeight: 12, textAlign: 'center' },
  plot: { flex: 1 },
  // Liegt in der Zeichenfläche – ein reservierter Streifen darüber hätte nur dafür Platz gekostet.
  tooltip: {
    position: 'absolute',
    top: 0,
    height: TOOLTIP_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  tooltipText: { fontVariant: ['tabular-nums'], fontSize: 14 },
  labels: { height: 16 },
  label: { position: 'absolute', width: 60, textAlign: 'center', fontSize: 11, fontVariant: ['tabular-nums'] },
})
