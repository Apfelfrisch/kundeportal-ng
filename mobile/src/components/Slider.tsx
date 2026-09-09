import { useState } from 'react'
import { StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native'

import { useScrollLock } from '@/components/Screen'
import { tick } from '@/lib/haptics'
import { useTheme } from '@/theme'

interface SliderProps {
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  accessibilityLabel: string
}

const THUMB = 28
const TRACK = 6

/**
 * Horizontaler Regler im Design der App: Tippen oder Ziehen setzt den Wert
 * in ganzen Schritten, mit haptischem Tick je Schritt. Während der Geste
 * scrollt der Screen nicht.
 */
export function Slider({ value, min, max, step = 1, onChange, accessibilityLabel }: SliderProps) {
  const theme = useTheme()
  const lockScroll = useScrollLock()
  const [width, setWidth] = useState(0)
  const [active, setActive] = useState(false)

  const usable = Math.max(0, width - THUMB)
  const span = Math.max(step, max - min)
  const fraction = Math.min(1, Math.max(0, (value - min) / span))

  function valueAt(event: GestureResponderEvent): number {
    if (usable <= 0) return value
    const x = Math.min(usable, Math.max(0, event.nativeEvent.locationX - THUMB / 2))
    const raw = min + (x / usable) * span
    return Math.min(max, Math.max(min, Math.round(raw / step) * step))
  }

  function update(event: GestureResponderEvent) {
    const next = valueAt(event)
    if (next !== value) {
      tick()
      onChange(next)
    }
  }

  return (
    <View
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(event) => {
        lockScroll(true)
        setActive(true)
        update(event)
      }}
      onResponderMove={update}
      onResponderRelease={() => {
        lockScroll(false)
        setActive(false)
      }}
      onResponderTerminate={() => {
        lockScroll(false)
        setActive(false)
      }}
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min, max, now: value }}
      style={styles.wrap}
    >
      <View pointerEvents="none" style={[styles.track, { backgroundColor: theme.bar, marginHorizontal: THUMB / 2 }]}>
        <View style={[styles.fill, { backgroundColor: theme.accent, width: `${fraction * 100}%` }]} />
      </View>
      <View
        pointerEvents="none"
        style={[
          styles.thumb,
          {
            left: fraction * usable,
            backgroundColor: theme.accent,
            borderColor: theme.card,
            transform: [{ scale: active ? 1.15 : 1 }],
          },
        ]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { height: 44, justifyContent: 'center' },
  track: { height: TRACK, borderRadius: TRACK / 2, overflow: 'hidden' },
  fill: { height: TRACK },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 3,
    top: (44 - THUMB) / 2,
  },
})
