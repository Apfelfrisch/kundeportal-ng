import { StyleSheet } from 'react-native'

import type { Contract } from '@/api/types'
import { Card } from '@/components/Card'
import { ContractScreen } from '@/components/ContractScreen'
import { GroupHeader, KeyValue } from '@/components/KeyValue'
import { Txt } from '@/components/Txt'
import { formatCt, formatDate, formatEuro } from '@/lib/format'

export default function TarifdetailsScreen() {
  return (
    <ContractScreen>
      {(contract) => (contract.is_dynamic ? <DynamicTariff contract={contract} /> : <FixedTariff contract={contract} />)}
    </ContractScreen>
  )
}

/** Klassischer Tarif: Bruttopreise wie die Portal-Tarifkarte. */
function FixedTariff({ contract }: { contract: Contract }) {
  const prices = contract.prices

  return (
    <>
      <TariffHead contract={contract} sub="Feste Preise" />
      <Card gap={0} style={styles.kvCard}>
        <KeyValue label="Arbeitspreis" value={prices.working_price_ct_gross === null ? '–' : `${formatCt(prices.working_price_ct_gross)}/kWh`} />
        <KeyValue label="Grundpreis" value={prices.base_price_eur_gross === null ? '–' : `${formatEuro(prices.base_price_eur_gross)}/Monat`} />
        <KeyValue label="Preisgarantie bis" value={formatDate(contract.price_guarantee)} />
        <KeyValue label="Preise gültig seit" value={formatDate(prices.tariff_effective_from)} last />
      </Card>
      <Txt variant="small" style={styles.note}>
        Bruttopreise inkl. Mehrwertsteuer.
      </Txt>
    </>
  )
}

/** Dynamischer Tarif: Nettopreise mit Aufschlüsselung der festen Komponenten. */
function DynamicTariff({ contract }: { contract: Contract }) {
  const prices = contract.prices
  const working = Object.entries(prices.working_price_components)
  const base = Object.entries(prices.base_price_components)
  const baseTotal = base.reduce((sum, [, value]) => sum + value, 0)

  return (
    <>
      <TariffHead contract={contract} sub="Börsenpreis (EPEX Spot) + feste Komponenten · viertelstündlich abgerechnet" />
      <Card gap={0} style={styles.groupCard}>
        <GroupHeader
          title="Arbeitspreis"
          total={prices.calculated_dynamic_working_price_ct === null ? '–' : `${formatCt(prices.calculated_dynamic_working_price_ct)}/kWh`}
        />
        <KeyValue label="Börsenpreis" value="stündlich variabel" compact />
        {working.map(([label, value], index) => (
          <KeyValue key={label} label={label} value={formatCt(value)} compact last={index === working.length - 1} />
        ))}
      </Card>
      <Card gap={0} style={styles.groupCard}>
        <GroupHeader title="Grundpreis" total={prices.base_price_eur === null ? `${formatEuro(baseTotal / 12)}/Monat` : `${formatEuro(prices.base_price_eur)}/Monat`} />
        {base.map(([label, value], index) => (
          <KeyValue key={label} label={label} value={`${formatEuro(value)}/Jahr`} compact last={index === base.length - 1} />
        ))}
      </Card>
      <Txt variant="small" style={styles.note}>
        Nettopreise zzgl. Mehrwertsteuer. Der Börsenanteil wird je Viertelstunde mit dem tatsächlichen Verbrauch abgerechnet; alle Steuern und Abgaben geben wir direkt an dich weiter.
      </Txt>
    </>
  )
}

function TariffHead({ contract, sub }: { contract: Contract; sub: string }) {
  return (
    <Card soft gap={4}>
      <Txt variant="small">Tarif</Txt>
      <Txt variant="heading">{contract.tariff ?? 'Stromvertrag'}</Txt>
      <Txt variant="muted">{sub}</Txt>
    </Card>
  )
}

const styles = StyleSheet.create({
  kvCard: { paddingVertical: 4 },
  groupCard: { paddingTop: 0, paddingBottom: 4 },
  note: { lineHeight: 18, paddingHorizontal: 4 },
})
