import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, StyleSheet, Switch, View } from 'react-native'

import { firstApiErrorMessage, isApiError } from '@/api/client'
import { useSubmitBank } from '@/api/queries'
import type { Contract } from '@/api/types'
import { Button } from '@/components/Button'
import { ContractScreen } from '@/components/ContractScreen'
import { Field } from '@/components/Field'
import { Txt } from '@/components/Txt'
import { groupIban, isValidIban } from '@/lib/iban'
import { useUser } from '@/providers/AuthProvider'
import { useContractContext } from '@/providers/ContractProvider'
import { useTheme } from '@/theme'

export default function BankverbindungAendernScreen() {
  return <ContractScreen>{(contract) => <BankForm contract={contract} />}</ContractScreen>
}

function BankForm({ contract }: { contract: Contract }) {
  const user = useUser()
  const router = useRouter()
  const theme = useTheme()
  const { contracts } = useContractContext()
  const submit = useSubmitBank(user.id, contract.contract_number)
  const severalContracts = (contracts.data?.length ?? 0) > 1

  const [iban, setIban] = useState('')
  const [bank, setBank] = useState('')
  const [owner, setOwner] = useState(contract.bank.account_owner ?? '')
  const [sepa, setSepa] = useState(contract.bank.sepa ?? true)
  const [allContracts, setAllContracts] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const complete = iban.trim() !== '' && bank.trim() !== '' && owner.trim() !== ''

  async function send() {
    const nextErrors: Record<string, string> = {}
    if (!isValidIban(iban)) nextErrors.iban = 'Bitte gib eine gültige IBAN an.'
    if (bank.trim() === '') nextErrors.bank = 'Bitte gib das Bankinstitut an.'
    if (owner.trim() === '') nextErrors.bank_account_owner = 'Bitte gib den Kontoinhaber an.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    try {
      await submit.mutateAsync({
        iban: iban.replace(/\s+/g, '').toUpperCase(),
        bank: bank.trim(),
        bank_account_owner: owner.trim(),
        sepa,
        change_all_contracts: severalContracts && allContracts,
      })
      Alert.alert('Bankverbindung übermittelt', 'Vielen Dank! Wir übernehmen die neue Bankverbindung nach Prüfung.', [
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
    <View style={styles.form}>
      <Field
        label="IBAN"
        value={iban}
        onChangeText={(text) => setIban(groupIban(text))}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder="DE00 0000 0000 0000 0000 00"
        error={errors.iban}
      />
      <Field label="Bankinstitut" value={bank} onChangeText={setBank} autoCapitalize="words" error={errors.bank} />
      <Field label="Kontoinhaber" value={owner} onChangeText={setOwner} autoCapitalize="words" textContentType="name" error={errors.bank_account_owner} />
      <ToggleRow
        label="SEPA-Mandat erteilen"
        hint="Wir dürfen die Abschläge direkt von diesem Konto einziehen."
        value={sepa}
        onChange={setSepa}
        theme={theme}
      />
      {severalContracts ? (
        <ToggleRow label="Für alle Verträge übernehmen" value={allContracts} onChange={setAllContracts} theme={theme} />
      ) : null}
      <Button label="Bankverbindung ändern" onPress={() => void send()} loading={submit.isPending} disabled={!complete} />
      <Txt variant="small" style={styles.note}>
        Die neue Bankverbindung wird als Änderungswunsch an uns übermittelt und nach Prüfung übernommen.
      </Txt>
    </View>
  )
}

function ToggleRow({ label, hint, value, onChange, theme }: { label: string; hint?: string; value: boolean; onChange: (value: boolean) => void; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <Txt variant="strong">{label}</Txt>
        {hint !== undefined ? <Txt variant="small">{hint}</Txt> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: theme.bar, true: theme.accent }}
        thumbColor={value ? theme.accentFg : theme.muted}
        ios_backgroundColor={theme.bar}
        accessibilityLabel={label}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleText: { flex: 1, gap: 2 },
  note: { lineHeight: 18 },
})
