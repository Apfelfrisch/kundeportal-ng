import { StyleSheet, View } from 'react-native'

import { Txt } from '@/components/Txt'
import { useTheme } from '@/theme'

/** Kleine Status-Pille: `ok` grün, `open` gelb (Mandantenfarbe). */
export function Badge({ label, tone }: { label: string; tone: 'ok' | 'open' }) {
  const theme = useTheme()
  const colors = tone === 'ok' ? { bg: theme.okBg, fg: theme.okFg } : { bg: theme.openBg, fg: theme.openFg }

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Txt variant="small" color={colors.fg} style={styles.text}>
        {label}
      </Txt>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' },
  text: { fontWeight: '600' },
})
