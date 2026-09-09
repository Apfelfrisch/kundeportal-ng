import type { PropsWithChildren } from 'react'
import { View, type ViewStyle } from 'react-native'

import { useTheme } from '@/theme'

interface CardProps extends PropsWithChildren {
  /** Hervorgehobene Fläche ohne Rand (Tarifkarte). */
  soft?: boolean
  padding?: number
  gap?: number
  style?: ViewStyle
}

/** Kartenfläche mit Rand – Basis aller Gruppen auf den Screens. */
export function Card({ children, soft = false, padding = 16, gap = 12, style }: CardProps) {
  const theme = useTheme()

  return (
    <View
      style={[
        {
          backgroundColor: theme.card,
          borderRadius: theme.radius,
          borderWidth: soft ? 0 : 1,
          borderColor: theme.border,
          padding,
          gap,
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}
