import { Check } from 'lucide-react-native'
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native'

import { Txt } from '@/components/Txt'
import { tick } from '@/lib/haptics'
import { useTheme } from '@/theme'

interface SegmentedProps<T extends string> {
  options: ReadonlyArray<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
  style?: ViewStyle
}

/** Umschalter mit Häkchen vor der aktiven Option (Einheit, Zeitraum). */
export function Segmented<T extends string>({ options, value, onChange, style }: SegmentedProps<T>) {
  const theme = useTheme()

  return (
    <View style={[styles.wrap, { backgroundColor: theme.card, borderColor: theme.border, borderRadius: theme.radius }, style]} accessibilityRole="tablist">
      {options.map((option) => {
        const active = option.value === value
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              if (active) return
              tick()
              onChange(option.value)
            }}
            style={[styles.segment, active && { backgroundColor: theme.outlineBg }]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            {active ? <Check size={16} color={theme.fg} strokeWidth={2.5} /> : null}
            <Txt variant="strong" color={active ? 'fg' : 'muted'}>
              {option.label}
            </Txt>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', borderWidth: 1, overflow: 'hidden' },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 46,
    paddingHorizontal: 12,
  },
})
