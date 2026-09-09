import { useRouter } from 'expo-router'
import { Banknote, Landmark } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'

import type { Contract } from '@/api/types'
import { Card } from '@/components/Card'
import { ContractScreen } from '@/components/ContractScreen'
import { KeyValue } from '@/components/KeyValue'
import { ListRow } from '@/components/ListRow'
import { Txt } from '@/components/Txt'
import { formatCents, formatDate, maskIban } from '@/lib/format'
import { useTheme } from '@/theme'

export default function ZahlungenScreen() {
  return <ContractScreen>{(contract) => <Payment contract={contract} />}</ContractScreen>
}

function Payment({ contract }: { contract: Contract }) {
  const theme = useTheme()
  const router = useRouter()
  const bank = contract.bank
  const installment = contract.installment

  return (
    <>
      <Card gap={0} style={styles.kvCard}>
        <View style={[styles.bankHead, { borderBottomColor: theme.divider }]}>
          <View style={styles.icon}>
            <Landmark size={22} color={theme.muted} strokeWidth={1.75} />
          </View>
          <View style={styles.bankText}>
            <Txt variant="strong">{bank.sepa ? 'SEPA-Lastschrift' : 'Überweisung'}</Txt>
            <Txt variant="muted">{bank.sepa ? 'Wird zum Fälligkeitstermin eingezogen' : 'Du überweist den Abschlag selbst'}</Txt>
          </View>
        </View>
        <KeyValue label="Kontoinhaber" value={bank.account_owner ?? '–'} />
        <KeyValue label="IBAN" value={bank.iban ? maskIban(bank.iban) : '–'} />
        <KeyValue label="Bank" value={bank.bank ?? '–'} last />
      </Card>
      <Card gap={0} style={styles.kvCard}>
        <KeyValue label="Monatlicher Abschlag" value={installment?.amount_cents == null ? '–' : formatCents(installment.amount_cents)} />
        <KeyValue label="Nächste Fälligkeit" value={installment?.next_payment ? formatDate(installment.next_payment) : '–'} last />
      </Card>
      <Card padding={0} gap={0}>
        {installment?.amount_cents != null && installment.amount_cents > 0 ? (
          <ListRow icon={Banknote} label="Abschlag ändern" onPress={() => router.push('/(app)/abschlag-aendern')} />
        ) : null}
        <ListRow icon={Landmark} label="Bankverbindung ändern" onPress={() => router.push('/(app)/bankverbindung-aendern')} last />
      </Card>
    </>
  )
}

const styles = StyleSheet.create({
  kvCard: { paddingVertical: 4 },
  bankHead: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  icon: { width: 28, alignItems: 'center', justifyContent: 'center' },
  bankText: { flex: 1, gap: 2 },
})
