import { useEffect, useState } from 'react'
import { Animated, Easing, StyleSheet, View } from 'react-native'

import { Txt } from '@/components/Txt'
import { useTheme } from '@/theme'

const BARS = 9
const BAR_WIDTH = 6
const BAR_HEIGHT = 28
const STEP_MS = 80
const RISE_MS = 380

/**
 * Ladeanzeige in der Form des Diagramms: eine Reihe Balken, die als Welle
 * auf- und abschwellen. Läuft über den nativen Treiber, damit sie auch
 * flüssig bleibt, während die neue Antwort verarbeitet wird.
 */
export function LoadingBars({ label, minHeight }: { label?: string; minHeight?: number }) {
  const theme = useTheme()
  // Lazy: der Initialisierer läuft nur beim ersten Render, nicht bei jedem.
  const [scales] = useState(() => Array.from({ length: BARS }, () => new Animated.Value(0.25)))

  useEffect(() => {
    const loops = scales.map((scale, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * STEP_MS),
          Animated.timing(scale, { toValue: 1, duration: RISE_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(scale, { toValue: 0.25, duration: RISE_MS, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.delay((BARS - 1 - index) * STEP_MS),
        ]),
      ),
    )
    loops.forEach((loop) => loop.start())
    return () => loops.forEach((loop) => loop.stop())
  }, [scales])

  return (
    <View style={[styles.wrap, { minHeight }]} accessibilityRole="progressbar" accessibilityLabel={label ?? 'Wird geladen'}>
      <View style={styles.bars}>
        {scales.map((scale, index) => (
          <Animated.View
            key={index}
            style={[
              styles.bar,
              {
                backgroundColor: index % 3 === 1 ? theme.chartSupplier : theme.chartUsage,
                transform: [{ scaleY: scale }],
                transformOrigin: 'bottom',
              },
            ]}
          />
        ))}
      </View>
      {label !== undefined ? (
        <Txt variant="small" style={styles.label}>
          {label}
        </Txt>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: BAR_HEIGHT },
  bar: { width: BAR_WIDTH, height: BAR_HEIGHT, borderRadius: 3 },
  label: { letterSpacing: 0.2 },
})
