import { CalendarDays } from 'lucide-react-native'
import { useEffect, useRef, useState } from 'react'
import { Animated, Modal, PanResponder, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button } from '@/components/Button'
import { Calendar } from '@/components/Calendar'
import { Txt } from '@/components/Txt'
import { formatDateValue } from '@/lib/format'
import { useTheme } from '@/theme'

interface DateFieldProps {
  label: string
  value: Date
  onChange: (date: Date) => void
  maximumDate?: Date
  minimumDate?: Date
  error?: string
}

const DISMISS_DISTANCE = 100

/** Datumsfeld: öffnet die Monatsansicht der App in einem Bottom Sheet, das sich nach unten wegwischen lässt. */
export function DateField({ label, value, onChange, maximumDate, minimumDate, error }: DateFieldProps) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const [open, setOpen] = useState(false)
  const translateY = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (open) translateY.setValue(0)
  }, [open, translateY])

  function close() {
    setOpen(false)
  }

  function select(date: Date) {
    onChange(date)
    close()
  }

  const pan = useRef(
    PanResponder.create({
      // Erst ab einer klaren Abwärtsbewegung übernehmen, damit Tipps auf Tage und
      // das seitliche Scrollen der Jahresleiste ungestört bleiben.
      onMoveShouldSetPanResponder: (_event, gesture) => gesture.dy > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.5,
      onPanResponderMove: (_event, gesture) => {
        translateY.setValue(Math.max(0, gesture.dy))
      },
      onPanResponderRelease: (_event, gesture) => {
        if (gesture.dy > DISMISS_DISTANCE || gesture.vy > 0.8) {
          Animated.timing(translateY, { toValue: 600, duration: 180, useNativeDriver: true }).start(() => setOpen(false))
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start()
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start()
      },
    }),
  ).current

  return (
    <View style={styles.wrap}>
      <Txt variant="muted">{label}</Txt>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatDateValue(value)}`}
        style={({ pressed }) => [
          styles.field,
          {
            backgroundColor: theme.outlineBg,
            borderColor: error === undefined ? theme.outlineBorder : theme.danger,
            borderRadius: theme.radius,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Txt style={styles.value}>{formatDateValue(value)}</Txt>
        <CalendarDays size={20} color={theme.accent} strokeWidth={1.75} />
      </Pressable>
      {error !== undefined ? (
        <Txt variant="muted" color="danger">
          {error}
        </Txt>
      ) : null}
      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Schließen" />
        <Animated.View
          {...pan.panHandlers}
          style={[
            styles.sheet,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              paddingBottom: insets.bottom + 16,
              borderTopLeftRadius: theme.radius * 2,
              borderTopRightRadius: theme.radius * 2,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: theme.faint }]} />
          <Txt variant="label">{label}</Txt>
          <Calendar value={value} onChange={select} maximumDate={maximumDate} minimumDate={minimumDate} />
          <Button label="Abbrechen" variant="outline" onPress={close} />
        </Animated.View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  field: {
    minHeight: 48,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  value: { fontVariant: ['tabular-nums'] },
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  sheet: { borderWidth: 1, borderBottomWidth: 0, padding: 16, gap: 12 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
})
