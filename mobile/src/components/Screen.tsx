import type { PropsWithChildren } from 'react'
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

/** Scrollbarer Screen-Inhalt auf dem Mandanten-Hintergrund. */
export function Screen({ children, padding = 16, gap = 16, refreshing = false, onRefresh, style }: ScreenProps) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: theme.bg }]}
      contentContainerStyle={[{ padding, gap, paddingBottom: padding + insets.bottom }, style]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh === undefined ? undefined : (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />
        )
      }
    >
      {children}
    </ScrollView>
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
