import { useRouter } from 'expo-router'
import { ChevronRight, Landmark } from 'lucide-react-native'
import { Pressable, StyleSheet, View } from 'react-native'

import type { Contract } from '@/api/types'
import { Card } from '@/components/Card'
import { ContractScreen } from '@/components/ContractScreen'
import { KeyValue } from '@/components/KeyValue'
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
  const payments = [...contract.payments]
    .sort((a, b) => (b.booking_date ?? '').localeCompare(a.booking_date ?? ''))
    .slice(0, 5)

  return (
    <>
      <Card gap={0} style={styles.kvCard}>
        <Pressable
          onPress={() => router.push('/(app)/bankverbindung-aendern')}
          accessibilityRole="button"
          accessibilityLabel="Bankverbindung ändern"
          style={({ pressed }) => [styles.bankHead, { borderBottomColor: theme.divider }, pressed && { backgroundColor: theme.iconBg }]}
        >
          <View style={styles.icon}>
            <Landmark size={22} color={theme.muted} strokeWidth={1.75} />
          </View>
          <View style={styles.bankText}>
            <Txt variant="strong">{bank.sepa ? 'SEPA-Lastschrift' : 'Überweisung'}</Txt>
            <Txt variant="muted">{bank.sepa ? 'Wird zum Fälligkeitstermin eingezogen' : 'Du überweist den Abschlag selbst'}</Txt>
          </View>
          <ChevronRight size={20} color={theme.faint} />
        </Pressable>
        <KeyValue label="Kontoinhaber" value={bank.account_owner ?? '–'} />
        <KeyValue label="IBAN" value={bank.iban ? maskIban(bank.iban) : '–'} />
        <KeyValue label="Bank" value={bank.bank ?? '–'} last />
      </Card>
      <Card gap={0} style={styles.kvCard}>
        <KeyValue
          label="Monatlicher Abschlag"
          value={installment?.amount_cents == null ? '–' : formatCents(installment.amount_cents)}
          onPress={installment?.amount_cents != null && installment.amount_cents > 0 ? () => router.push('/(app)/abschlag-aendern') : undefined}
          first
        />
        <KeyValue label="Nächste Fälligkeit" value={installment?.next_payment ? formatDate(installment.next_payment) : '–'} last />
      </Card>
      {payments.length > 0 ? (
        <View style={styles.history}>
          <Txt variant="label" style={styles.historyLabel}>
            Letzte Buchungen
          </Txt>
          <Card gap={0} style={styles.kvCard}>
            {payments.map((payment, index) => (
              <KeyValue
                key={String(payment.id)}
                label={formatDate(payment.booking_date)}
                value={
                  payment.incoming_payment != null && payment.incoming_payment !== 0
                    ? `+ ${formatCents(payment.incoming_payment)}`
                    : payment.outgoing_payment != null
                      ? `− ${formatCents(payment.outgoing_payment)}`
                      : '–'
                }
                last={index === payments.length - 1}
              />
            ))}
          </Card>
        </View>
      ) : null}
    </>
  )
}

const styles = StyleSheet.create({
  kvCard: { paddingVertical: 4 },
  bankHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: -4,
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  icon: { width: 28, alignItems: 'center', justifyContent: 'center' },
  bankText: { flex: 1, gap: 2 },
  history: { gap: 6 },
  historyLabel: { paddingHorizontal: 4 },
})
