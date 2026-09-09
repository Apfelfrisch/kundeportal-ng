import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, StyleSheet, View } from 'react-native'

import { firstApiErrorMessage, isApiError } from '@/api/client'
import { useUpdatePassword } from '@/api/queries'
import { Button } from '@/components/Button'
import { Field } from '@/components/Field'
import { Screen } from '@/components/Screen'
import { useUser } from '@/providers/AuthProvider'

export default function PasswortAendernScreen() {
  const user = useUser()
  const router = useRouter()
  const update = useUpdatePassword(user.id)
  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function send() {
    if (password !== confirmation) {
      setErrors({ password_confirmation: 'Die Passwörter stimmen nicht überein.' })
      return
    }
    setErrors({})
    try {
      const response = await update.mutateAsync({ current_password: current, password, password_confirmation: confirmation })
      Alert.alert('Passwort geändert', response.message ?? 'Dein Passwort wurde aktualisiert.', [{ text: 'OK', onPress: () => router.back() }])
    } catch (caught) {
      if (isApiError(caught) && caught.errors !== undefined) {
        const fieldErrors: Record<string, string> = {}
        for (const [field, messages] of Object.entries(caught.errors)) fieldErrors[field] = messages[0] ?? ''
        setErrors(fieldErrors)
      } else {
        setErrors({ password: firstApiErrorMessage(caught) })
      }
    }
  }

  const complete = current !== '' && password !== '' && confirmation !== ''

  return (
    <Screen>
      <View style={styles.form}>
        <Field label="Aktuelles Passwort" value={current} onChangeText={setCurrent} secureTextEntry textContentType="password" error={errors.current_password} />
        <Field label="Neues Passwort" value={password} onChangeText={setPassword} secureTextEntry textContentType="newPassword" error={errors.password} hint="Mindestens 8 Zeichen." />
        <Field label="Neues Passwort wiederholen" value={confirmation} onChangeText={setConfirmation} secureTextEntry textContentType="newPassword" error={errors.password_confirmation} />
        <Button label="Passwort ändern" onPress={() => void send()} loading={update.isPending} disabled={!complete} />
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  form: { gap: 16 },
})
