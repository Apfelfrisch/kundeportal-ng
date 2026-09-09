import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, StyleSheet, View } from 'react-native'

import { firstApiErrorMessage } from '@/api/client'
import { useSubmitChangeRequest } from '@/api/queries'
import type { Contract } from '@/api/types'
import { AddressFields, emptyAddress, trimAddress, validateAddress, type AddressForm } from '@/components/AddressFields'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { ContractScreen } from '@/components/ContractScreen'
import { DateField } from '@/components/DateField'
import { Field } from '@/components/Field'
import { Txt } from '@/components/Txt'
import { addressLine, primaryMeter, primaryMeterPoint } from '@/lib/contracts'
import { toIsoDate } from '@/lib/format'
import { fieldErrorsFrom } from '@/lib/forms'
import { useUser } from '@/providers/AuthProvider'

export default function UmzugMeldenScreen() {
  return <ContractScreen>{(contract) => <MoveForm contract={contract} />}</ContractScreen>
}

function MoveForm({ contract }: { contract: Contract }) {
  const user = useUser()
  const router = useRouter()
  const submit = useSubmitChangeRequest(user.id, contract.contract_number, 'delivery-address')
  const currentAddress = addressLine(primaryMeterPoint(contract))

  const [address, setAddress] = useState<AddressForm>(emptyAddress)
  const [date, setDate] = useState(() => new Date())
  const [meterNumber, setMeterNumber] = useState('')
  const [malo, setMalo] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())
  const complete = address.street !== '' && address.street_number !== '' && address.zip !== '' && address.city !== ''

  async function send() {
    const nextErrors = validateAddress(address)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    try {
      await submit.mutateAsync({
        ...trimAddress(address),
        date: toIsoDate(date),
        meter_number: meterNumber.trim(),
        malo: malo.trim(),
      })
      Alert.alert('Umzug gemeldet', 'Vielen Dank! Wir kümmern uns um die Belieferung an der neuen Adresse und melden uns bei Rückfragen.', [
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
        <Txt variant="small">Bisherige Lieferadresse</Txt>
        <Txt variant="strong">{currentAddress || '–'}</Txt>
      </Card>
      <View style={styles.form}>
        <Txt variant="label">Neue Lieferadresse</Txt>
        <AddressFields value={address} onChange={setAddress} errors={errors} />
        <DateField label="Einzugsdatum" value={date} onChange={setDate} minimumDate={today} error={errors.date} />
        <Txt variant="label">Zähler am neuen Ort</Txt>
        <Field label="Zählernummer" value={meterNumber} onChangeText={setMeterNumber} autoCapitalize="characters" autoCorrect={false} placeholder={primaryMeter(primaryMeterPoint(contract))?.meter_number ?? 'optional'} error={errors.meter_number} />
        <Field label="Marktlokations-ID (MaLo)" value={malo} onChangeText={setMalo} keyboardType="number-pad" placeholder="optional" error={errors.malo} />
        <Button label="Umzug melden" onPress={() => void send()} loading={submit.isPending} disabled={!complete} />
        <Txt variant="small" style={styles.note}>
          Zählernummer und MaLo-ID findest du auf dem Zähler oder in den Unterlagen des Vormieters. Wenn du sie nicht kennst, lass die Felder frei.
        </Txt>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  note: { lineHeight: 18 },
})
