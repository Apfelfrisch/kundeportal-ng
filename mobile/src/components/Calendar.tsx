import { ChevronLeft, ChevronRight } from 'lucide-react-native'
import { useState, type ReactNode } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { Txt } from '@/components/Txt'
import { WEEKDAYS, formatMonth, isSameDay, isWithin, monthGrid, shiftMonth } from '@/lib/calendar'
import { useTheme } from '@/theme'

interface CalendarProps {
  value: Date
  onChange: (date: Date) => void
  minimumDate?: Date
  maximumDate?: Date
}

/** Monatsansicht im Design der App: Wochenstart Montag, Auswahl in Akzentfarbe. */
export function Calendar({ value, onChange, minimumDate, maximumDate }: CalendarProps) {
  const theme = useTheme()
  const [view, setView] = useState({ year: value.getFullYear(), month: value.getMonth() })
  const today = new Date()
  const weeks = monthGrid(view.year, view.month)

  const canGoBack = minimumDate === undefined || new Date(view.year, view.month, 1) > minimumDate
  const canGoForward = maximumDate === undefined || new Date(view.year, view.month + 1, 1) <= maximumDate

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <NavButton disabled={!canGoBack} onPress={() => setView(shiftMonth(view.year, view.month, -1))} label="Vorheriger Monat">
          <ChevronLeft size={22} color={canGoBack ? theme.accent : theme.faint} />
        </NavButton>
        <Txt variant="strong">{formatMonth(view.year, view.month)}</Txt>
        <NavButton disabled={!canGoForward} onPress={() => setView(shiftMonth(view.year, view.month, 1))} label="Nächster Monat">
          <ChevronRight size={22} color={canGoForward ? theme.accent : theme.faint} />
        </NavButton>
      </View>
      <View style={styles.row}>
        {WEEKDAYS.map((day) => (
          <View key={day} style={styles.cell}>
            <Txt variant="small">{day}</Txt>
          </View>
        ))}
      </View>
      {weeks.map((week, index) => (
        <View key={index} style={styles.row}>
          {week.map((day, column) => {
            if (day === null) return <View key={column} style={styles.cell} />
            const selected = isSameDay(day, value)
            const isToday = isSameDay(day, today)
            const enabled = isWithin(day, minimumDate, maximumDate)
            return (
              <Pressable
                key={column}
                disabled={!enabled}
                onPress={() => onChange(day)}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled: !enabled }}
                style={({ pressed }) => [
                  styles.cell,
                  styles.day,
                  selected && { backgroundColor: theme.accent },
                  !selected && isToday && { borderWidth: 1, borderColor: theme.accent },
                  pressed && !selected && { backgroundColor: theme.iconBg },
                ]}
              >
                <Txt
                  variant="strong"
                  color={selected ? theme.accentFg : enabled ? theme.fg : theme.faint}
                  style={styles.dayText}
                >
                  {day.getDate()}
                </Txt>
              </Pressable>
            )
          })}
        </View>
      ))}
    </View>
  )
}

function NavButton({ children, disabled, onPress, label }: { children: ReactNode; disabled: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} hitSlop={8} style={styles.nav}>
      {children}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8 },
  nav: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row' },
  cell: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' },
  day: { borderRadius: 22, marginHorizontal: 2 },
  dayText: { fontVariant: ['tabular-nums'] },
})
