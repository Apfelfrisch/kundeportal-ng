import { useState } from 'react'
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { firstApiErrorMessage, isApiError } from '@/api/client'
import { useTenant } from '@/api/queries'
import { Button } from '@/components/Button'
import { Field } from '@/components/Field'
import { Fill } from '@/components/Screen'
import { Txt } from '@/components/Txt'
import { useAuth } from '@/providers/AuthProvider'

export default function LoginScreen() {
  const { login } = useAuth()
  const tenant = useTenant()
  const insets = useSafeAreaInsets()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await login(email.trim(), password)
    } catch (caught) {
      setError(isApiError(caught) ? firstApiErrorMessage(caught) : 'Keine Verbindung zum Server. Bitte prüfe deine Internetverbindung.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Fill>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.wrap, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]}
      >
        <View style={styles.header}>
          <Txt variant="muted">{tenant.data?.name.short ?? 'Kundenportal'}</Txt>
          <Txt variant="title">Anmelden</Txt>
        </View>
        <View style={styles.form}>
          <Field
            label="E-Mail-Adresse"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="next"
          />
          <Field
            label="Passwort"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            returnKeyType="done"
            onSubmitEditing={() => void submit()}
          />
          {error !== null ? (
            <Txt variant="muted" color="danger">
              {error}
            </Txt>
          ) : null}
          <Button label="Anmelden" onPress={() => void submit()} loading={submitting} disabled={email === '' || password === ''} />
        </View>
        <Txt variant="muted" style={styles.footer}>
          Passwort vergessen oder noch kein Zugang? Beides richtest du im Kundenportal im Browser ein.
        </Txt>
      </KeyboardAvoidingView>
    </Fill>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 20, gap: 32 },
  header: { gap: 4 },
  form: { gap: 16 },
  footer: { marginTop: 'auto', lineHeight: 20 },
})
