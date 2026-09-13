import { Eye, EyeOff } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native'

import { Txt } from '@/components/Txt'
import { useTheme } from '@/theme'

interface FieldProps extends TextInputProps {
  label: string
  error?: string
  hint?: string
}

/** Beschriftetes Eingabefeld mit Fehlerzeile. Passwortfelder bekommen einen Umschalter zum Anzeigen. */
export function Field({ label, error, hint, style, secureTextEntry, ...props }: FieldProps) {
  const theme = useTheme()
  const [revealed, setRevealed] = useState(false)
  const isSecure = secureTextEntry === true

  return (
    <View style={styles.wrap}>
      <Txt variant="muted">{label}</Txt>
      <View
        style={[
          styles.field,
          {
            backgroundColor: theme.outlineBg,
            borderColor: error === undefined ? theme.outlineBorder : theme.danger,
            borderRadius: theme.radius,
          },
          style,
        ]}
      >
        <TextInput
          {...props}
          secureTextEntry={isSecure && !revealed}
          placeholderTextColor={theme.faint}
          style={[styles.input, { color: theme.fg }]}
        />
        {isSecure ? (
          <Pressable
            onPress={() => setRevealed((value) => !value)}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Passwort verbergen' : 'Passwort anzeigen'}
            hitSlop={10}
            style={({ pressed }) => [styles.toggle, { opacity: pressed ? 0.6 : 1 }]}
          >
            {revealed ? (
              <EyeOff size={20} color={theme.faint} strokeWidth={1.75} />
            ) : (
              <Eye size={20} color={theme.faint} strokeWidth={1.75} />
            )}
          </Pressable>
        ) : null}
      </View>
      {error !== undefined ? (
        <Txt variant="muted" color="danger">
          {error}
        </Txt>
      ) : hint !== undefined ? (
        <Txt variant="small">{hint}</Txt>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  field: {
    minHeight: 48,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: { flex: 1, paddingVertical: 0, fontSize: 16 },
  toggle: { paddingLeft: 12, alignSelf: 'center' },
})
