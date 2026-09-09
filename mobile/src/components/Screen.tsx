import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react'
import { RefreshControl, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useTheme } from '@/theme'

interface ScreenProps extends PropsWithChildren {
  /** Innenabstand des Inhalts (Standard 16). */
  padding?: number
  gap?: number
  refreshing?: boolean
  onRefresh?: () => void
  style?: ViewStyle
}

/**
 * Ein Kind (z. B. der Preisstreifen) kann das Scrollen und Pull-to-Refresh
 * des Screens für die Dauer einer eigenen Wischgeste sperren.
 */
const ScrollLockContext = createContext<(locked: boolean) => void>(() => undefined)

export function useScrollLock(): (locked: boolean) => void {
  return useContext(ScrollLockContext)
}

/** Scrollbarer Screen-Inhalt auf dem Mandanten-Hintergrund. */
export function Screen({ children, padding = 16, gap = 16, refreshing = false, onRefresh, style }: ScreenProps) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const [locked, setLocked] = useState(false)
  const lock = useMemo(() => (value: boolean) => setLocked(value), [])

  return (
    <ScrollLockContext.Provider value={lock}>
      <ScrollView
        style={[styles.scroll, { backgroundColor: theme.bg }]}
        contentContainerStyle={[{ padding, gap, paddingBottom: padding + insets.bottom }, style]}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!locked}
        refreshControl={
          onRefresh === undefined ? undefined : (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} enabled={!locked} />
          )
        }
      >
        {children}
      </ScrollView>
    </ScrollLockContext.Provider>
  )
}

/** Nicht scrollender Vollbild-Container (Ladezustand, Login). */
export function Fill({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  const theme = useTheme()
  return <View style={[styles.fill, { backgroundColor: theme.bg }, style]}>{children}</View>
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  fill: { flex: 1 },
})
