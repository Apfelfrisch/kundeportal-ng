import type { ComponentType } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, type ViewStyle } from 'react-native'

import { Txt } from '@/components/Txt'
import { useTheme } from '@/theme'

interface ButtonProps {
  label: string
  onPress: () => void
  variant?: 'primary' | 'outline' | 'link'
  icon?: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>
  loading?: boolean
  disabled?: boolean
  style?: ViewStyle
}

/** Primäre (Pille), sekundäre (grau) und Link-Aktion nach Mandanten-Tokens. */
export function Button({ label, onPress, variant = 'primary', icon: Icon, loading = false, disabled = false, style }: ButtonProps) {
  const theme = useTheme()
  const inactive = disabled || loading

  const colors =
    variant === 'primary'
      ? { bg: theme.btnBg, fg: theme.btnFg, border: theme.btnBorder }
      : variant === 'outline'
        ? { bg: theme.outlineBg, fg: theme.outlineFg, border: theme.outlineBorder }
        : { bg: 'transparent', fg: theme.accent, border: 'transparent' }

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          borderRadius: variant === 'link' ? theme.radius : theme.btnRadius,
          opacity: inactive ? 0.6 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.fg} />
      ) : (
        <>
          {Icon !== undefined ? <Icon size={20} color={colors.fg} strokeWidth={2} /> : null}
          <Txt variant="strong" color={colors.fg} style={variant === 'outline' && { fontWeight: '700' }}>
            {label}
          </Txt>
        </>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
})
