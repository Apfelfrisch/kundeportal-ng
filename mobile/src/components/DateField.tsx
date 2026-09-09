import { CalendarDays } from 'lucide-react-native'
import { useState } from 'react'
import { Modal, Pressable, StyleSheet, View } from 'react-native'
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

/** Datumsfeld: öffnet die Monatsansicht der App in einem Bottom Sheet. */
export function DateField({ label, value, onChange, maximumDate, minimumDate, error }: DateFieldProps) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const [open, setOpen] = useState(false)

  function close() {
    setOpen(false)
  }

  function select(date: Date) {
    onChange(date)
    close()
  }

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
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              paddingBottom: insets.bottom + 16,
              borderTopLeftRadius: theme.radius * 2,
              borderTopRightRadius: theme.radius * 2,
            },
          ]}
        >
          <Txt variant="label">{label}</Txt>
          <Calendar value={value} onChange={select} maximumDate={maximumDate} minimumDate={minimumDate} />
          <Button label="Abbrechen" variant="outline" onPress={close} />
        </View>
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
})
