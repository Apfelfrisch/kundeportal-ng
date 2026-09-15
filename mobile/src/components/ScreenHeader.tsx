import type { Stack } from 'expo-router'
import { ChevronLeft, X } from 'lucide-react-native'
import type { ComponentProps } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Txt } from '@/components/Txt'
import { tick } from '@/lib/haptics'
import { useTheme } from '@/theme'

/** Props der `header`-Option des Stacks – expo-router exportiert den Typ nicht direkt. */
type ScreenOptions = Exclude<ComponentProps<typeof Stack>['screenOptions'], undefined | ((...args: never[]) => unknown)>
type HeaderProps = Parameters<NonNullable<ScreenOptions['header']>>[0]

/** Höhe der Kopfzeile ohne Statusleiste. */
const HEADER_HEIGHT = 60
/** Breite der Schaltfläche links – rechts gleich breit, damit der Titel mittig steht. */
const SLOT_WIDTH = 44

/**
 * Kompakte Kopfzeile der Unterseiten statt der nativen Stack-Kopfzeile:
 * Zurück (bzw. Schließen im Modal), Titel mittig, auf dem Seitenhintergrund.
 */
export function ScreenHeader({ navigation, options, back }: HeaderProps) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const modal = options.presentation === 'modal' || options.presentation === 'formSheet'
  const Icon = modal ? X : ChevronLeft
  const title = options.title ?? ''

  return (
    <View style={[styles.wrap, { backgroundColor: theme.bg, paddingTop: insets.top }]}>
      <View style={styles.row}>
        <View style={styles.slot}>
          {back !== undefined ? (
            <Pressable
              onPress={() => {
                tick()
                navigation.goBack()
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={modal ? 'Schließen' : 'Zurück'}
              style={({ pressed }) => [styles.button, pressed && { backgroundColor: theme.iconBg }]}
            >
              <Icon size={24} color={theme.accent} strokeWidth={2} />
            </Pressable>
          ) : null}
        </View>
        <Txt variant="strong" numberOfLines={1} style={styles.title}>
          {title}
        </Txt>
        <View style={styles.slot} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 4 },
  row: { height: HEADER_HEIGHT, flexDirection: 'row', alignItems: 'center' },
  slot: { width: SLOT_WIDTH, alignItems: 'center', justifyContent: 'center' },
  button: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 17 },
})
