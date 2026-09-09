import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, StyleSheet, View } from 'react-native'

import { firstApiErrorMessage } from '@/api/client'
import { useSubmitChangeRequest } from '@/api/queries'
import type { Contract } from '@/api/types'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { ContractScreen } from '@/components/ContractScreen'
import { DateField } from '@/components/DateField'
import { Field } from '@/components/Field'
import { Txt } from '@/components/Txt'
import { formatDate, formatDateValue, parseIsoDate, toIsoDate } from '@/lib/format'
import { fieldErrorsFrom } from '@/lib/forms'
import { useUser } from '@/providers/AuthProvider'

export default function VertragKuendigenScreen() {
  return <ContractScreen>{(contract) => <TerminationForm contract={contract} />}</ContractScreen>
}

function TerminationForm({ contract }: { contract: Contract }) {
  const user = useUser()
  const router = useRouter()
  const submit = useSubmitChangeRequest(user.id, contract.contract_number, 'termination')

  const today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())
  const earliest = contract.earliest_termination_date === null ? today : parseIsoDate(contract.earliest_termination_date)
  const minimum = earliest > today ? earliest : today

  const [terminationAt, setTerminationAt] = useState(minimum)
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function confirm() {
    Alert.alert(
      'Vertrag kündigen?',
      `Du kündigst Vertrag ${contract.contract_number} zum ${formatDateValue(terminationAt)}. Möchtest du die Kündigung absenden?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Kündigen', style: 'destructive', onPress: () => void send() },
      ],
    )
  }

  async function send() {
    setErrors({})
    try {
      await submit.mutateAsync({ termination_at: toIsoDate(terminationAt), reason_of_termination: reason.trim() })
      Alert.alert('Kündigung eingereicht', 'Wir haben deine Kündigung erhalten und bestätigen sie dir schriftlich.', [
        { text: 'OK', onPress: () => router.back() },
      ])
    } catch (caught) {
      const fieldErrors = fieldErrorsFrom(caught)
      if (fieldErrors !== null) setErrors(fieldErrors)
      else Alert.alert('Übermittlung fehlgeschlagen', firstApiErrorMessage(caught))
    }
  }

  return (
    <>
      <Card gap={4}>
        <Txt variant="small">Vertrag {contract.contract_number}</Txt>
        <Txt variant="strong">{contract.tariff ?? 'Stromvertrag'}</Txt>
        <Txt variant="muted">
          {contract.earliest_termination_date === null
            ? 'Frühestmöglicher Kündigungstermin: nach Vertragslaufzeit.'
            : `Frühestmöglicher Kündigungstermin: ${formatDate(contract.earliest_termination_date)}.`}
        </Txt>
      </Card>
      <View style={styles.form}>
        <DateField label="Kündigen zum" value={terminationAt} onChange={setTerminationAt} minimumDate={minimum} error={errors.termination_at} />
        <Field
          label="Kündigungsgrund"
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          placeholder="Schreib uns kurz, warum du uns verlassen möchtest (optional)."
          style={styles.textarea}
          error={errors.reason_of_termination}
        />
        <Button label="Kündigung absenden" onPress={confirm} loading={submit.isPending} />
        <Txt variant="small" style={styles.note}>
          Schade, dass du gehst. Wir bestätigen die Kündigung schriftlich und teilen dir das Vertragsende mit.
        </Txt>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  textarea: { minHeight: 112, paddingTop: 12 },
  note: { lineHeight: 18 },
})
