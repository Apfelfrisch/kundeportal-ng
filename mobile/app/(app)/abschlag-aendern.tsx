import { useRouter } from 'expo-router'
import { Minus, Plus } from 'lucide-react-native'
import { useState } from 'react'
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native'

import { firstApiErrorMessage, isApiError } from '@/api/client'
import { useSubmitInstallment } from '@/api/queries'
import type { Contract } from '@/api/types'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { ContractScreen } from '@/components/ContractScreen'
import { DateField } from '@/components/DateField'
import { Txt } from '@/components/Txt'
import { firstOfNextMonth, installmentRange } from '@/lib/contracts'
import { formatCents, formatEuro, toIsoDate } from '@/lib/format'
import { tick } from '@/lib/haptics'
import { useUser } from '@/providers/AuthProvider'
import { useTheme } from '@/theme'

export default function AbschlagAendernScreen() {
  return <ContractScreen>{(contract) => <InstallmentForm contract={contract} />}</ContractScreen>
}

function InstallmentForm({ contract }: { contract: Contract }) {
  const user = useUser()
  const router = useRouter()
  const theme = useTheme()
  const submit = useSubmitInstallment(user.id, contract.contract_number)
  const range = installmentRange(contract)
  const [amount, setAmount] = useState(String(range.current))
  const [effectiveFrom, setEffectiveFrom] = useState(() => firstOfNextMonth())
  const [errors, setErrors] = useState<Record<string, string>>({})

  const today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())
  const value = Number(amount.replace(/[^0-9]/g, ''))
  const valid = amount !== '' && Number.isInteger(value) && value >= range.min && value <= range.max
  const unchanged = value === range.current

  function step(delta: number) {
    const next = Math.min(range.max, Math.max(range.min, (Number.isFinite(value) ? value : range.current) + delta))
    if (next !== value) tick()
    setAmount(String(next))
  }

  async function send() {
    if (!valid) {
      setErrors({ installment: `Wähle einen Abschlag zwischen ${formatEuro(range.min)} und ${formatEuro(range.max)}.` })
      return
    }
    setErrors({})
    try {
      await submit.mutateAsync({ installment: value, effective_from: toIsoDate(effectiveFrom) })
      Alert.alert('Abschlag beantragt', `Wir haben deinen Wunsch über ${formatEuro(value)} monatlich erhalten und melden uns, sobald er umgesetzt ist.`, [
        { text: 'OK', onPress: () => router.back() },
      ])
    } catch (caught) {
      if (isApiError(caught) && caught.errors !== undefined) {
        const fieldErrors: Record<string, string> = {}
        for (const [field, messages] of Object.entries(caught.errors)) fieldErrors[field] = messages[0] ?? ''
        setErrors(fieldErrors)
      } else {
        Alert.alert('Übermittlung fehlgeschlagen', firstApiErrorMessage(caught))
      }
    }
  }

  if (range.current === 0) {
    return (
      <Card>
        <Txt variant="muted">Für diesen Vertrag ist kein Abschlag hinterlegt, der angepasst werden könnte.</Txt>
      </Card>
    )
  }

  return (
    <>
      <Card gap={4}>
        <Txt variant="small">Aktueller Abschlag</Txt>
        <Txt variant="heading">{formatCents(contract.installment?.amount_cents ?? 0)} monatlich</Txt>
        <Txt variant="muted">
          Möglich sind {formatEuro(range.min)} bis {formatEuro(range.max)}.
        </Txt>
      </Card>
      <View style={styles.form}>
        <View style={styles.field}>
          <Txt variant="muted">Neuer Abschlag</Txt>
          <View style={[styles.stepper, { backgroundColor: theme.outlineBg, borderColor: errors.installment === undefined ? theme.outlineBorder : theme.danger, borderRadius: theme.radius }]}>
            <StepButton icon={Minus} onPress={() => step(-1)} disabled={value <= range.min} label="Einen Euro weniger" />
            <View style={styles.amount}>
              <TextInput
                value={amount}
                onChangeText={(text) => setAmount(text.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                maxLength={5}
                selectTextOnFocus
                style={[styles.amountInput, { color: theme.fg }]}
                accessibilityLabel="Neuer Abschlag in Euro"
              />
              <Txt variant="strong" color="muted">
                €
              </Txt>
            </View>
            <StepButton icon={Plus} onPress={() => step(1)} disabled={value >= range.max} label="Einen Euro mehr" />
          </View>
          {errors.installment !== undefined ? (
            <Txt variant="muted" color="danger">
              {errors.installment}
            </Txt>
          ) : null}
        </View>
        <DateField label="Gültig ab" value={effectiveFrom} onChange={setEffectiveFrom} minimumDate={today} error={errors.effective_from} />
        <Button label="Abschlag beantragen" onPress={() => void send()} loading={submit.isPending} disabled={!valid || unchanged} />
        <Txt variant="small" style={styles.note}>
          Der neue Abschlag wird als Änderungswunsch an uns übermittelt und nach Prüfung übernommen.
        </Txt>
      </View>
    </>
  )
}

function StepButton({ icon: Icon, onPress, disabled, label }: { icon: typeof Plus; onPress: () => void; disabled: boolean; label: string }) {
  const theme = useTheme()
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.stepButton, { opacity: disabled ? 0.35 : pressed ? 0.7 : 1 }]}
    >
      <Icon size={22} color={theme.accent} strokeWidth={2} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  field: { gap: 6 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, minHeight: 56 },
  stepButton: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  amount: { flex: 1, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 6 },
  amountInput: { fontSize: 28, fontWeight: '700', minWidth: 60, textAlign: 'right', padding: 0, fontVariant: ['tabular-nums'] },
  note: { lineHeight: 18 },
})
