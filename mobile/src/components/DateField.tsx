import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker'
import { CalendarDays } from 'lucide-react-native'
import { useState } from 'react'
import { Platform, Pressable, StyleSheet, View } from 'react-native'

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

/**
 * Datumsfeld mit dem nativen Kalender: Android öffnet den Systemdialog,
 * iOS klappt den Inline-Kalender unter dem Feld auf.
 */
export function DateField({ label, value, onChange, maximumDate, minimumDate, error }: DateFieldProps) {
  const theme = useTheme()
  const [open, setOpen] = useState(false)

  function select(_event: unknown, date: Date) {
    onChange(date)
  }

  function press() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value, mode: 'date', maximumDate, minimumDate, onValueChange: select })
      return
    }
    setOpen((current) => !current)
  }

  return (
    <View style={styles.wrap}>
      <Txt variant="muted">{label}</Txt>
      <Pressable
        onPress={press}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatDateValue(value)}`}
        style={({ pressed }) => [
          styles.field,
          {
            backgroundColor: theme.outlineBg,
            borderColor: error === undefined ? (open ? theme.accent : theme.outlineBorder) : theme.danger,
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
      {Platform.OS === 'ios' && open ? (
        <View style={[styles.inline, { backgroundColor: theme.card, borderColor: theme.border, borderRadius: theme.radius }]}>
          <DateTimePicker
            value={value}
            mode="date"
            display="inline"
            themeVariant="dark"
            accentColor={theme.accent}
            locale="de-DE"
            maximumDate={maximumDate}
            minimumDate={minimumDate}
            onValueChange={select}
          />
        </View>
      ) : null}
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
  inline: { borderWidth: 1, padding: 8 },
})
