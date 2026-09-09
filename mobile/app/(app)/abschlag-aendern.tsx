import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, StyleSheet, View } from 'react-native'

import { firstApiErrorMessage, isApiError } from '@/api/client'
import { useSubmitInstallment } from '@/api/queries'
import type { Contract } from '@/api/types'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { ContractScreen } from '@/components/ContractScreen'
import { DateField } from '@/components/DateField'
import { Slider } from '@/components/Slider'
import { Txt } from '@/components/Txt'
import { firstOfNextMonth, installmentRange } from '@/lib/contracts'
import { formatCents, formatEuro, toIsoDate } from '@/lib/format'
import { useUser } from '@/providers/AuthProvider'

export default function AbschlagAendernScreen() {
  return <ContractScreen>{(contract) => <InstallmentForm contract={contract} />}</ContractScreen>
}

function InstallmentForm({ contract }: { contract: Contract }) {
  const user = useUser()
  const router = useRouter()
  const submit = useSubmitInstallment(user.id, contract.contract_number)
  const range = installmentRange(contract)
  const [value, setValue] = useState(range.current)
  const [effectiveFrom, setEffectiveFrom] = useState(() => firstOfNextMonth())
  const [errors, setErrors] = useState<Record<string, string>>({})

  const today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())
  const valid = value >= range.min && value <= range.max
  const unchanged = value === range.current

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
          <View style={styles.amountRow}>
            <Txt variant="muted">Neuer Abschlag</Txt>
            <Txt variant="heading" style={styles.amount}>
              {formatEuro(value)}
            </Txt>
          </View>
          <Slider value={value} min={range.min} max={range.max} onChange={setValue} accessibilityLabel="Neuer Abschlag in Euro" />
          <View style={styles.amountRow}>
            <Txt variant="small">{formatEuro(range.min)}</Txt>
            <Txt variant="small">{formatEuro(range.max)}</Txt>
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

const styles = StyleSheet.create({
  form: { gap: 16 },
  field: { gap: 4 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  amount: { fontVariant: ['tabular-nums'] },
  note: { lineHeight: 18 },
})
