import { StyleSheet, Switch, View } from 'react-native'

import { Txt } from '@/components/Txt'
import { useTheme } from '@/theme'

interface ToggleRowProps {
  label: string
  hint?: string
  value: boolean
  onChange: (value: boolean) => void
}

/** Beschriftung mit optionalem Hinweis und Schalter in Mandantenfarbe. */
export function ToggleRow({ label, hint, value, onChange }: ToggleRowProps) {
  const theme = useTheme()

  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Txt variant="strong">{label}</Txt>
        {hint !== undefined ? <Txt variant="small">{hint}</Txt> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: theme.bar, true: theme.accent }}
        thumbColor={value ? theme.accentFg : theme.muted}
        ios_backgroundColor={theme.bar}
        accessibilityLabel={label}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  text: { flex: 1, gap: 2 },
})
