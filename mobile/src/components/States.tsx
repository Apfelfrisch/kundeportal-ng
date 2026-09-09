import { ActivityIndicator, StyleSheet, View } from 'react-native'

import { Button } from '@/components/Button'
import { Txt } from '@/components/Txt'
import { apiErrorMessage } from '@/api/client'
import { useTheme } from '@/theme'

export function Loading() {
  const theme = useTheme()
  return (
    <View style={styles.center}>
      <ActivityIndicator color={theme.accent} size="large" />
    </View>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <Txt variant="muted" style={styles.message}>
        {apiErrorMessage(error)}
      </Txt>
      {onRetry !== undefined ? <Button label="Erneut versuchen" variant="outline" onPress={onRetry} /> : null}
    </View>
  )
}

export function Empty({ message }: { message: string }) {
  return (
    <View style={styles.center}>
      <Txt variant="muted" style={styles.message}>
        {message}
      </Txt>
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, minHeight: 200, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  message: { textAlign: 'center', lineHeight: 20 },
})
