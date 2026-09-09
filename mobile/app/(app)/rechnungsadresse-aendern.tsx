import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, StyleSheet, View } from 'react-native'

import { firstApiErrorMessage } from '@/api/client'
import { useSubmitChangeRequest } from '@/api/queries'
import type { Contract } from '@/api/types'
import { AddressFields, trimAddress, validateAddress, type AddressForm } from '@/components/AddressFields'
import { Button } from '@/components/Button'
import { ContractScreen } from '@/components/ContractScreen'
import { ToggleRow } from '@/components/ToggleRow'
import { Txt } from '@/components/Txt'
import { fieldErrorsFrom } from '@/lib/forms'
import { useUser } from '@/providers/AuthProvider'
import { useContractContext } from '@/providers/ContractProvider'

export default function RechnungsadresseAendernScreen() {
  return <ContractScreen>{(contract) => <BillingAddressForm contract={contract} />}</ContractScreen>
}

function BillingAddressForm({ contract }: { contract: Contract }) {
  const user = useUser()
  const router = useRouter()
  const { contracts } = useContractContext()
  const submit = useSubmitChangeRequest(user.id, contract.contract_number, 'billing-address')
  const severalContracts = (contracts.data?.length ?? 0) > 1

  const [address, setAddress] = useState<AddressForm>({
    street: contract.billing_address.street ?? '',
    street_number: contract.billing_address.street_number ?? '',
    address_additive: contract.billing_address.address_additive ?? '',
    zip: contract.billing_address.zip ?? '',
    city: contract.billing_address.city ?? '',
  })
  const [allContracts, setAllContracts] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const complete = address.street !== '' && address.street_number !== '' && address.zip !== '' && address.city !== ''

  async function send() {
    const nextErrors = validateAddress(address)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    try {
      await submit.mutateAsync({ ...trimAddress(address), change_all_contracts: severalContracts && allContracts })
      Alert.alert('Rechnungsadresse übermittelt', 'Vielen Dank! Wir übernehmen die neue Rechnungsadresse nach Prüfung.', [
        { text: 'OK', onPress: () => router.back() },
      ])
    } catch (caught) {
      const fieldErrors = fieldErrorsFrom(caught)
      if (fieldErrors !== null) setErrors(fieldErrors)
      else Alert.alert('Übermittlung fehlgeschlagen', firstApiErrorMessage(caught))
    }
  }

  return (
    <View style={styles.form}>
      <AddressFields value={address} onChange={setAddress} errors={errors} />
      {severalContracts ? <ToggleRow label="Für alle Verträge übernehmen" value={allContracts} onChange={setAllContracts} /> : null}
      <Button label="Rechnungsadresse ändern" onPress={() => void send()} loading={submit.isPending} disabled={!complete} />
      <Txt variant="small" style={styles.note}>
        Die neue Rechnungsadresse wird als Änderungswunsch an uns übermittelt und nach Prüfung übernommen.
      </Txt>
    </View>
  )
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  note: { lineHeight: 18 },
})
