import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native'

import { Txt } from '@/components/Txt'
import { useTheme } from '@/theme'

interface FieldProps extends TextInputProps {
  label: string
  error?: string
  hint?: string
}

/** Beschriftetes Eingabefeld mit Fehlerzeile. */
export function Field({ label, error, hint, style, ...props }: FieldProps) {
  const theme = useTheme()

  return (
    <View style={styles.wrap}>
      <Txt variant="muted">{label}</Txt>
      <TextInput
        {...props}
        placeholderTextColor={theme.faint}
        style={[
          styles.input,
          {
            backgroundColor: theme.outlineBg,
            borderColor: error === undefined ? theme.outlineBorder : theme.danger,
            borderRadius: theme.radius,
            color: theme.fg,
          },
          style,
        ]}
      />
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
  input: { minHeight: 48, borderWidth: 1, paddingHorizontal: 14, fontSize: 16 },
})
