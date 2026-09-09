import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, StyleSheet, View } from 'react-native'

import { firstApiErrorMessage, isApiError } from '@/api/client'
import { useUpdateEmail } from '@/api/queries'
import { Button } from '@/components/Button'
import { Field } from '@/components/Field'
import { Screen } from '@/components/Screen'
import { Txt } from '@/components/Txt'
import { useAuth, useUser } from '@/providers/AuthProvider'

export default function EmailAendernScreen() {
  const user = useUser()
  const { refreshUser } = useAuth()
  const router = useRouter()
  const update = useUpdateEmail(user.id)
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | undefined>(undefined)

  async function send() {
    setError(undefined)
    try {
      const response = await update.mutateAsync(email.trim())
      await refreshUser().catch(() => undefined)
      Alert.alert('E-Mail-Adresse geändert', response.message ?? 'Bitte bestätige die neue Adresse über den Link in der E-Mail.', [
        { text: 'OK', onPress: () => router.back() },
      ])
    } catch (caught) {
      setError(isApiError(caught) ? firstApiErrorMessage(caught) : 'Keine Verbindung zum Server.')
    }
  }

  return (
    <Screen>
      <View style={styles.form}>
        <Txt variant="muted">Aktuell: {user.email}</Txt>
        <Field
          label="Neue E-Mail-Adresse"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
          error={error}
        />
        <Button label="E-Mail-Adresse ändern" onPress={() => void send()} loading={update.isPending} disabled={email.trim() === ''} />
        <Txt variant="small" style={styles.note}>
          Nach der Änderung schicken wir dir eine E-Mail zur Bestätigung an die neue Adresse. Bis zur Bestätigung bleibt die App gesperrt.
        </Txt>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  note: { lineHeight: 18 },
})
