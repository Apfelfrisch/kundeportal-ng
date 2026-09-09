import { Text, type TextProps, type TextStyle } from 'react-native'

import { useTheme } from '@/theme'

type Variant = 'title' | 'heading' | 'body' | 'strong' | 'muted' | 'small' | 'label' | 'number'

const variants: Record<Variant, TextStyle> = {
  title: { fontSize: 30, fontWeight: '700', letterSpacing: -0.5 },
  heading: { fontSize: 20, fontWeight: '700' },
  body: { fontSize: 16, fontWeight: '500' },
  strong: { fontSize: 15, fontWeight: '600' },
  muted: { fontSize: 13 },
  small: { fontSize: 12 },
  label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  number: { fontSize: 34, fontWeight: '700', letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
}

interface TxtProps extends TextProps {
  variant?: Variant
  /** Textfarbe: Token-Name oder beliebige Farbe. */
  color?: 'fg' | 'muted' | 'faint' | 'accent' | 'danger' | (string & {})
}

type TokenColor = 'fg' | 'muted' | 'faint' | 'accent' | 'danger'

function isTokenColor(color: string): color is TokenColor {
  return color === 'fg' || color === 'muted' || color === 'faint' || color === 'accent' || color === 'danger'
}

/** Text mit Theme-Farbe und einer der festen Typo-Stufen. */
export function Txt({ variant = 'body', color, style, ...props }: TxtProps) {
  const theme = useTheme()
  const defaultColor = variant === 'muted' || variant === 'small' || variant === 'label' ? theme.muted : theme.fg
  const resolved = color === undefined ? defaultColor : isTokenColor(color) ? theme[color] : color

  return <Text {...props} style={[variants[variant], { color: resolved }, style]} />
}
