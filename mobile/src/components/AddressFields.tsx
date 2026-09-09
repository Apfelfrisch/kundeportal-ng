import { StyleSheet, View } from 'react-native'

import { Field } from '@/components/Field'

export interface AddressForm {
  street: string
  street_number: string
  address_additive: string
  zip: string
  city: string
}

export const emptyAddress: AddressForm = { street: '', street_number: '', address_additive: '', zip: '', city: '' }

/** Clientseitige Pflichtfelder wie die API-Regeln (PLZ fünfstellig). */
export function validateAddress(address: AddressForm): Record<string, string> {
  const errors: Record<string, string> = {}
  if (address.street.trim() === '') errors.street = 'Bitte gib die Straße an.'
  if (address.street_number.trim() === '') errors.street_number = 'Bitte gib die Hausnummer an.'
  if (!/^\d{5}$/.test(address.zip.trim())) errors.zip = 'Bitte gib eine fünfstellige Postleitzahl an.'
  if (address.city.trim() === '') errors.city = 'Bitte gib den Ort an.'
  return errors
}

export function trimAddress(address: AddressForm): AddressForm {
  return {
    street: address.street.trim(),
    street_number: address.street_number.trim(),
    address_additive: address.address_additive.trim(),
    zip: address.zip.trim(),
    city: address.city.trim(),
  }
}

interface AddressFieldsProps {
  value: AddressForm
  onChange: (value: AddressForm) => void
  errors: Record<string, string>
}

/** Straße/Hausnummer, Adresszusatz, PLZ/Ort – die Felder beider Adressformulare. */
export function AddressFields({ value, onChange, errors }: AddressFieldsProps) {
  const set = (key: keyof AddressForm) => (text: string) => onChange({ ...value, [key]: text })

  return (
    <>
      <View style={styles.row}>
        <View style={styles.wide}>
          <Field label="Straße" value={value.street} onChangeText={set('street')} autoCapitalize="words" textContentType="streetAddressLine1" error={errors.street} />
        </View>
        <View style={styles.narrow}>
          <Field label="Nr." value={value.street_number} onChangeText={set('street_number')} error={errors.street_number} />
        </View>
      </View>
      <Field label="Adresszusatz" value={value.address_additive} onChangeText={set('address_additive')} autoCapitalize="sentences" error={errors.address_additive} />
      <View style={styles.row}>
        <View style={styles.narrow}>
          <Field label="PLZ" value={value.zip} onChangeText={set('zip')} keyboardType="number-pad" maxLength={5} textContentType="postalCode" error={errors.zip} />
        </View>
        <View style={styles.wide}>
          <Field label="Ort" value={value.city} onChangeText={set('city')} autoCapitalize="words" textContentType="addressCity" error={errors.city} />
        </View>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  wide: { flex: 2 },
  narrow: { flex: 1 },
})
