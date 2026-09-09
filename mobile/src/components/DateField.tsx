import { CalendarDays, X } from 'lucide-react-native'
import { useState } from 'react'
import { Modal, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

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
        <View style={styles.modalRoot}>
          <Pressable style={styles.above} onPress={close} accessibilityLabel="Schließen" />
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: theme.card,
                paddingBottom: insets.bottom + 16,
                borderTopLeftRadius: theme.radius * 2,
                borderTopRightRadius: theme.radius * 2,
                shadowColor: '#000000',
              },
            ]}
          >
            <View style={styles.sheetHeader}>
              <Txt variant="label">{label}</Txt>
              <Pressable
                onPress={close}
                accessibilityRole="button"
                accessibilityLabel="Schließen"
                hitSlop={8}
                style={({ pressed }) => [styles.closeButton, { backgroundColor: theme.iconBg, opacity: pressed ? 0.6 : 1 }]}
              >
                <X size={18} color={theme.fg} strokeWidth={2.25} />
              </Pressable>
            </View>
            <Calendar value={value} onChange={select} maximumDate={maximumDate} minimumDate={minimumDate} />
          </View>
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
  modalRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'transparent' },
  above: { flex: 1 },
  sheet: {
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
    // Abhebung ohne Abdunkeln des restlichen Bildschirms.
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  closeButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
})
