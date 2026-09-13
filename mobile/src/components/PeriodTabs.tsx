import { useEffect, useRef } from 'react'
import { FlatList, Pressable, StyleSheet, View } from 'react-native'

import { Txt } from '@/components/Txt'
import { tick } from '@/lib/haptics'
import type { PeriodOption } from '@/lib/usage'
import { useTheme } from '@/theme'

interface PeriodTabsProps {
  options: ReadonlyArray<PeriodOption>
  value: string
  onChange: (date: string) => void
}

const ITEM_WIDTH = 72
const INITIAL_ITEMS = 12

const keyExtractor = (option: PeriodOption): string => option.date
const getItemLayout = (_: ArrayLike<PeriodOption> | null | undefined, position: number) => ({
  length: ITEM_WIDTH,
  offset: ITEM_WIDTH * position,
  index: position,
})

/**
 * Waagerecht scrollbare Zeitraum-Tabs, der aktive unterstrichen und mittig.
 * Bewusst ohne `initialScrollIndex`: Liegt der Index außerhalb des
 * scrollbaren Bereichs (wenige Monate, Bildschirm breiter als die Liste),
 * rendert die FlatList leer. `scrollToIndex` nach dem Layout klemmt den
 * Versatz dagegen auf den gültigen Bereich.
 */
export function PeriodTabs({ options, value, onChange }: PeriodTabsProps) {
  const theme = useTheme()
  const list = useRef<FlatList<PeriodOption>>(null)
  const laidOut = useRef(false)
  const index = options.findIndex((option) => option.date === value)

  function centerSelected(animated: boolean) {
    if (index < 0 || !laidOut.current) return
    list.current?.scrollToIndex({ index, viewPosition: 0.5, animated })
  }

  useEffect(() => {
    centerSelected(true)
    // Nur der Index zählt – die Funktion selbst ändert sich bei jedem Render.
  }, [index])

  return (
    <FlatList
      ref={list}
      horizontal
      data={options}
      keyExtractor={keyExtractor}
      showsHorizontalScrollIndicator={false}
      // Dank getItemLayout erreicht scrollToIndex auch nicht gerenderte Tabs – kein Vorab-Rendern nötig.
      getItemLayout={getItemLayout}
      initialNumToRender={INITIAL_ITEMS}
      onLayout={() => {
        laidOut.current = true
        centerSelected(false)
      }}
      onContentSizeChange={() => centerSelected(false)}
      style={styles.list}
      renderItem={({ item }) => {
        const active = item.date === value
        return (
          <Pressable
            onPress={() => {
              if (active) return
              tick()
              onChange(item.date)
            }}
            style={styles.item}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Txt variant="strong" color={active ? 'fg' : 'muted'} numberOfLines={1} style={styles.label}>
              {item.label}
            </Txt>
            <View style={[styles.underline, { backgroundColor: active ? theme.accent : 'transparent' }]} />
          </Pressable>
        )
      }}
    />
  )
}

const styles = StyleSheet.create({
  list: { marginHorizontal: -16, flexGrow: 0 },
  item: { width: ITEM_WIDTH, alignItems: 'center', gap: 8, paddingTop: 6 },
  label: { fontSize: 16 },
  underline: { height: 2, width: ITEM_WIDTH - 24, borderRadius: 1 },
})
