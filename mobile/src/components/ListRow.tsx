import { ChevronRight } from 'lucide-react-native'
import type { ComponentType } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { Txt } from '@/components/Txt'
import { useTheme } from '@/theme'

export type IconComponent = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>

interface ListRowProps {
  icon: IconComponent
  label: string
  hint?: string
  onPress: () => void
  danger?: boolean
  last?: boolean
}

/** Navigationszeile: Icon-Kachel, Titel, Hinweiszeile, Chevron. */
export function ListRow({ icon: Icon, label, hint, onPress, danger = false, last = false }: ListRowProps) {
  const theme = useTheme()

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: theme.iconBg }}
      style={({ pressed }) => [
        styles.row,
        { borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, borderBottomColor: theme.border },
        pressed && { backgroundColor: theme.iconBg },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.icon, { backgroundColor: theme.iconBg, borderRadius: theme.radius }]}>
        <Icon size={22} color={danger ? theme.danger : theme.accent} strokeWidth={1.75} />
      </View>
      <View style={styles.text}>
        <Txt color={danger ? 'danger' : 'fg'}>{label}</Txt>
        {hint !== undefined && hint !== '' ? (
          <Txt variant="muted" numberOfLines={1}>
            {hint}
          </Txt>
        ) : null}
      </View>
      <ChevronRight size={20} color={theme.faint} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 64,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  icon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
})
