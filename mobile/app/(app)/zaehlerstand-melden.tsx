import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, StyleSheet, View } from 'react-native'

import { firstApiErrorMessage, isApiError } from '@/api/client'
import { useSubmitMeterCount, type MeterCountInput } from '@/api/queries'
import type { Contract } from '@/api/types'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { ContractScreen } from '@/components/ContractScreen'
import { Field } from '@/components/Field'
import { Txt } from '@/components/Txt'
import { isSingleTariffMeter, latestMeterCount, primaryMeter, primaryMeterPoint } from '@/lib/contracts'
import { formatDate, formatDateValue, formatKwh, parseGermanDate } from '@/lib/format'
import { useUser } from '@/providers/AuthProvider'

export default function ZaehlerstandMeldenScreen() {
  return <ContractScreen>{(contract) => <MeterCountForm contract={contract} />}</ContractScreen>
}

function MeterCountForm({ contract }: { contract: Contract }) {
  const user = useUser()
  const router = useRouter()
  const submit = useSubmitMeterCount(user.id, contract.contract_number)
  const singleTariff = isSingleTariffMeter(contract)
  const meterPoint = primaryMeterPoint(contract)
  const meter = primaryMeter(meterPoint)
  const latest = latestMeterCount(meterPoint)

  const [count, setCount] = useState('')
  const [countHt, setCountHt] = useState('')
  const [countNt, setCountNt] = useState('')
  const [readOn, setReadOn] = useState(formatDateValue(new Date()))
  const [errors, setErrors] = useState<Record<string, string>>({})

  function parseCount(value: string): number | null {
    const digits = value.replace(/[.\s]/g, '').replace(',', '.')
    const number = Number(digits)
    return digits === '' || !Number.isFinite(number) || number < 0 ? null : Math.floor(number)
  }

  async function send() {
    const nextErrors: Record<string, string> = {}
    const input: MeterCountInput = { read_on: '' }

    const isoDate = parseGermanDate(readOn)
    if (isoDate === null) nextErrors.read_on = 'Bitte gib das Ablesedatum als TT.MM.JJJJ an.'
    else input.read_on = isoDate

    if (singleTariff) {
      const value = parseCount(count)
      if (value === null) nextErrors.meter_count = 'Bitte gib den Zählerstand in kWh an.'
      else input.meter_count = value
    } else {
      const ht = parseCount(countHt)
      const nt = parseCount(countNt)
      if (ht === null) nextErrors.meter_count_ht = 'Bitte gib den HT-Zählerstand an.'
      else input.meter_count_ht = ht
      if (nt === null) nextErrors.meter_count_nt = 'Bitte gib den NT-Zählerstand an.'
      else input.meter_count_nt = nt
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    try {
      await submit.mutateAsync(input)
      Alert.alert('Zählerstand übermittelt', 'Vielen Dank! Wir haben deinen Zählerstand erhalten.', [
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

  return (
    <>
      <Card gap={4}>
        <Txt variant="small">{meter?.meter_number ? `Zähler ${meter.meter_number}` : 'Zähler'}</Txt>
        <Txt variant="muted">
          {latest?.meter_count_1 != null && latest.reading_date
            ? `Letzter Stand ${formatKwh(latest.meter_count_1)} vom ${formatDate(latest.reading_date)}`
            : 'Noch kein früherer Zählerstand bekannt.'}
        </Txt>
      </Card>
      <View style={styles.form}>
        {singleTariff ? (
          <Field
            label="Zählerstand (kWh)"
            value={count}
            onChangeText={setCount}
            keyboardType="number-pad"
            placeholder="z. B. 12480"
            error={errors.meter_count}
          />
        ) : (
          <>
            <Field
              label="Zählerstand HT (kWh)"
              value={countHt}
              onChangeText={setCountHt}
              keyboardType="number-pad"
              placeholder="Hochtarif"
              error={errors.meter_count_ht}
            />
            <Field
              label="Zählerstand NT (kWh)"
              value={countNt}
              onChangeText={setCountNt}
              keyboardType="number-pad"
              placeholder="Niedertarif"
              error={errors.meter_count_nt}
            />
          </>
        )}
        <Field
          label="Abgelesen am"
          value={readOn}
          onChangeText={setReadOn}
          keyboardType="numbers-and-punctuation"
          placeholder="TT.MM.JJJJ"
          error={errors.read_on}
        />
        <Button label="Zählerstand senden" onPress={() => void send()} loading={submit.isPending} />
        <Txt variant="small" style={styles.note}>
          Nur die Stellen vor dem Komma eingeben. Der Stand wird als Änderungswunsch an uns übermittelt.
        </Txt>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  note: { lineHeight: 18 },
})
