import { useRouter } from 'expo-router'
import { ArrowLeftRight, Banknote, CreditCard, FileText, Gauge, Receipt, SquarePen, Tag, User } from 'lucide-react-native'
import { Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import type { Contract } from '@/api/types'
import { Card } from '@/components/Card'
import { ContractScreen } from '@/components/ContractScreen'
import { ListRow } from '@/components/ListRow'
import { CurrentPriceCard, GlanceCard } from '@/components/StartCards'
import { Txt } from '@/components/Txt'
import { addressLine, latestMeterCount, primaryMeterPoint } from '@/lib/contracts'
import { formatCents, formatCt, formatDate, formatEuro, maskIban } from '@/lib/format'
import { useUser } from '@/providers/AuthProvider'
import { useContractContext } from '@/providers/ContractProvider'
import { useTheme } from '@/theme'

/**
 * Startseite: Vertragsnummer als Titel, darunter je nach Tarif die Preis-
 * oder die Auf-einen-Blick-Karte, dann die Liste der Unterseiten.
 */
export default function StartScreen() {
  const user = useUser()
  const router = useRouter()
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const { contracts, contract } = useContractContext()
  const firstName = user.name.split(' ')[0] ?? user.name
  const summary = contract.data === undefined ? undefined : contracts.data?.find((entry) => entry.contract_number === contract.data.contract_number)
  const address = addressLine(summary?.delivery_address ?? (contract.data === undefined ? null : primaryMeterPoint(contract.data)))

  return (
    <View style={[styles.wrap, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Txt variant="muted">Hallo {firstName}</Txt>
        <Txt variant="title">{contract.data === undefined ? 'Dein Vertrag' : `Vertrag ${contract.data.contract_number}`}</Txt>
        {contract.data !== undefined ? (
          <View style={styles.contractLine}>
            <Txt variant="muted" numberOfLines={1} style={styles.contractText}>
              {[contract.data.tariff, address].filter((part) => part).join(' · ')}
            </Txt>
            {(contracts.data?.length ?? 0) > 1 ? (
              <Pressable onPress={() => router.push('/(app)/vertrag-wechseln')} style={styles.switch} hitSlop={8}>
                <ArrowLeftRight size={16} color={theme.accent} />
                <Txt variant="muted" color="accent" style={styles.switchText}>
                  Wechseln
                </Txt>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
      <ContractScreen>{(data) => <StartContent contract={data} />}</ContractScreen>
    </View>
  )
}

function StartContent({ contract }: { contract: Contract }) {
  const user = useUser()
  const router = useRouter()
  const reading = latestMeterCount(primaryMeterPoint(contract))
  const bank = contract.bank

  const tariffHint = contract.is_dynamic
    ? `Börsenpreis + ${
        contract.prices.calculated_dynamic_working_price_ct === null
          ? 'Tarifaufschlag'
          : `${formatCt(contract.prices.calculated_dynamic_working_price_ct)}/kWh`
      }`
    : [
        contract.prices.working_price_ct_gross === null ? null : `${formatCt(contract.prices.working_price_ct_gross)}/kWh`,
        contract.prices.base_price_eur_gross === null ? null : `${formatEuro(contract.prices.base_price_eur_gross)}/Monat`,
      ]
        .filter((part) => part !== null)
        .join(' · ')

  return (
    <>
      {contract.is_dynamic ? <CurrentPriceCard contract={contract} /> : <GlanceCard contract={contract} />}
      <Card padding={0} gap={0}>
        <ListRow
          icon={SquarePen}
          label="Zählerstand melden"
          onPress={() => router.push('/(app)/zaehlerstand-melden')}
          last={!(contract.installment?.amount_cents != null && contract.installment.amount_cents > 0)}
        />
        {contract.installment?.amount_cents != null && contract.installment.amount_cents > 0 ? (
          <ListRow icon={Banknote} label="Abschlag ändern" onPress={() => router.push('/(app)/abschlag-aendern')} last />
        ) : null}
      </Card>
      <Card padding={0} gap={0}>
        <ListRow icon={User} label="Profil" hint={user.email} onPress={() => router.push('/(app)/profil')} />
        <ListRow
          icon={Receipt}
          label="Rechnungen"
          hint={
            contract.invoices[0]?.invoice_date
              ? `Letzte Rechnung am ${formatDate(contract.invoices[0].invoice_date)}`
              : 'Noch keine Rechnungen'
          }
          onPress={() => router.push('/(app)/rechnungen')}
        />
        <ListRow
          icon={Gauge}
          label="Zählerstände"
          hint={reading?.reading_date ? `Zuletzt gemeldet am ${formatDate(reading.reading_date)}` : 'Noch kein Zählerstand'}
          onPress={() => router.push('/(app)/zaehlerstaende')}
        />
        <ListRow
          icon={CreditCard}
          label="Zahlungen"
          hint={[
            contract.installment?.amount_cents == null ? null : `Abschlag ${formatCents(contract.installment.amount_cents)}`,
            bank.iban ? `${bank.sepa ? 'SEPA' : 'Überweisung'} · ${maskIban(bank.iban)}` : null,
          ]
            .filter((part) => part !== null)
            .join(' · ') || 'Keine Zahlungsdaten hinterlegt'}
          onPress={() => router.push('/(app)/zahlungen')}
        />
        <ListRow
          icon={FileText}
          label="Vertragsdetails"
          hint={[contract.tariff, contract.delivery_start ? `seit ${formatDate(contract.delivery_start)}` : null]
            .filter((part) => part)
            .join(' · ')}
          onPress={() => router.push('/(app)/vertragsdetails')}
        />
        <ListRow icon={Tag} label="Tarifdetails" hint={tariffHint} onPress={() => router.push('/(app)/tarifdetails')} last />
      </Card>
    </>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 4, gap: 4 },
  contractLine: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 32 },
  contractText: { flex: 1 },
  switch: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  switchText: { fontWeight: '600' },
})
