import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react-native'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { Txt } from '@/components/Txt'
import { MONTHS, WEEKDAYS, formatMonth, isSameDay, isWithin, monthGrid, shiftMonth, yearRange } from '@/lib/calendar'
import { tick } from '@/lib/haptics'
import { useTheme } from '@/theme'

interface CalendarProps {
  value: Date
  onChange: (date: Date) => void
  minimumDate?: Date
  maximumDate?: Date
}

/**
 * Monatsansicht im Design der App: Wochenstart Montag, Auswahl in
 * Akzentfarbe. Ein Tipp auf den Monatstitel öffnet – wie bei den nativen
 * Pickern – die Jahres- und Monatswahl zum schnellen Springen.
 */
export function Calendar({ value, onChange, minimumDate, maximumDate }: CalendarProps) {
  const theme = useTheme()
  const [view, setView] = useState({ year: value.getFullYear(), month: value.getMonth() })
  const [mode, setMode] = useState<'days' | 'months'>('days')
  const today = new Date()
  const weeks = monthGrid(view.year, view.month)

  const canGoBack = minimumDate === undefined || new Date(view.year, view.month, 1) > minimumDate
  const canGoForward = maximumDate === undefined || new Date(view.year, view.month + 1, 1) <= maximumDate

  const dayGrid = (
      <>
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
                onPress={() => {
                  tick()
                  onChange(day)
                }}
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
      </>
  )

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <NavButton disabled={!canGoBack || mode === 'months'} onPress={() => {
            tick()
            setView(shiftMonth(view.year, view.month, -1))
          }} label="Vorheriger Monat">
          <ChevronLeft size={22} color={canGoBack && mode === 'days' ? theme.accent : theme.faint} />
        </NavButton>
        <Pressable
          onPress={() => {
            tick()
            setMode((current) => (current === 'days' ? 'months' : 'days'))
          }}
          accessibilityRole="button"
          accessibilityLabel={mode === 'days' ? 'Monat und Jahr wählen' : 'Zurück zur Tagesansicht'}
          hitSlop={8}
          style={styles.title}
        >
          <Txt variant="strong">{formatMonth(view.year, view.month)}</Txt>
          <ChevronDown size={18} color={theme.accent} style={mode === 'months' ? styles.flipped : undefined} />
        </Pressable>
        <NavButton disabled={!canGoForward || mode === 'months'} onPress={() => {
            tick()
            setView(shiftMonth(view.year, view.month, 1))
          }} label="Nächster Monat">
          <ChevronRight size={22} color={canGoForward && mode === 'days' ? theme.accent : theme.faint} />
        </NavButton>
      </View>
      {mode === 'months' ? (
        <MonthPicker
          year={view.year}
          month={view.month}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onSelect={(year, month) => {
            setView({ year, month })
            setMode('days')
          }}
        />
      ) : (
        dayGrid
      )}
    </View>
  )

}

interface MonthPickerProps {
  year: number
  month: number
  minimumDate?: Date
  maximumDate?: Date
  onSelect: (year: number, month: number) => void
}

/** Jahresleiste (scrollbar) und 3×4-Monatsraster, jeweils auf den erlaubten Bereich begrenzt. */
function MonthPicker({ year, month, minimumDate, maximumDate, onSelect }: MonthPickerProps) {
  const theme = useTheme()
  const [selectedYear, setSelectedYear] = useState(year)
  const years = yearRange(year, minimumDate, maximumDate)
  const scroll = useRef<ScrollView>(null)

  useEffect(() => {
    const index = years.indexOf(selectedYear)
    if (index >= 0) scroll.current?.scrollTo({ x: Math.max(0, index * YEAR_PILL_WIDTH - YEAR_PILL_WIDTH * 1.5), animated: false })
    // Nur beim Öffnen zum aktuellen Jahr scrollen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function monthEnabled(index: number): boolean {
    const first = new Date(selectedYear, index, 1)
    const last = new Date(selectedYear, index + 1, 0)
    return isWithin(last, minimumDate, undefined) && isWithin(first, undefined, maximumDate)
  }

  return (
    <View style={styles.picker}>
      <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.years}>
        {years.map((entry) => {
          const active = entry === selectedYear
          return (
            <Pressable
              key={entry}
              onPress={() => {
                tick()
                setSelectedYear(entry)
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.yearPill, { backgroundColor: active ? theme.accent : theme.iconBg }]}
            >
              <Txt variant="strong" color={active ? theme.accentFg : theme.fg} style={styles.dayText}>
                {entry}
              </Txt>
            </Pressable>
          )
        })}
      </ScrollView>
      <View style={styles.months}>
        {MONTHS.map((label, index) => {
          const active = selectedYear === year && index === month
          const enabled = monthEnabled(index)
          return (
            <Pressable
              key={label}
              disabled={!enabled}
              onPress={() => {
                tick()
                onSelect(selectedYear, index)
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active, disabled: !enabled }}
              style={({ pressed }) => [
                styles.monthCell,
                { borderRadius: theme.radius },
                active && { backgroundColor: theme.accent },
                pressed && !active && { backgroundColor: theme.iconBg },
              ]}
            >
              <Txt variant="strong" color={active ? theme.accentFg : enabled ? theme.fg : theme.faint}>
                {label}
              </Txt>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const YEAR_PILL_WIDTH = 84

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
  title: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, paddingHorizontal: 8 },
  flipped: { transform: [{ rotate: '180deg' }] },
  picker: { gap: 12, minHeight: 6 * 44 + 8 },
  years: { gap: 8, paddingVertical: 4 },
  yearPill: { width: YEAR_PILL_WIDTH - 8, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  months: { flexDirection: 'row', flexWrap: 'wrap' },
  monthCell: { width: '33.333%', height: 48, alignItems: 'center', justifyContent: 'center' },
  nav: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row' },
  cell: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' },
  day: { borderRadius: 22, marginHorizontal: 2 },
  dayText: { fontVariant: ['tabular-nums'] },
})
