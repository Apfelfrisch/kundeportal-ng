import { StyleSheet } from 'react-native'

import type { Contract } from '@/api/types'
import { Card } from '@/components/Card'
import { ContractScreen } from '@/components/ContractScreen'
import { KeyValue } from '@/components/KeyValue'
import { Txt } from '@/components/Txt'
import { addressLines, contactName, primaryMeterPoint } from '@/lib/contracts'
import { formatDate, formatKwh } from '@/lib/format'

export default function VertragsdetailsScreen() {
  return <ContractScreen>{(contract) => <Details contract={contract} />}</ContractScreen>
}

function Details({ contract }: { contract: Contract }) {
  const meterPoint = primaryMeterPoint(contract)
  const delivery = addressLines(meterPoint)
  const billing = addressLines(contract.billing_address)

  return (
    <>
      <Card soft gap={4}>
        <Txt variant="small">Tarif</Txt>
        <Txt variant="heading">{contract.tariff ?? 'Stromvertrag'}</Txt>
        <Txt variant="muted">
          Vertragsnummer {contract.contract_number} · {contract.status.label}
        </Txt>
      </Card>
      <Card gap={0} style={styles.kvCard}>
        <KeyValue label="Lieferbeginn" value={formatDate(contract.delivery_start)} />
        {contract.delivery_end ? <KeyValue label="Lieferende" value={formatDate(contract.delivery_end)} /> : null}
        <KeyValue label="Vertragslaufzeit bis" value={formatDate(contract.contract_term)} />
        <KeyValue label="Kündbar zum" value={formatDate(contract.earliest_termination_date)} />
        <KeyValue
          label="Jahresverbrauch"
          value={meterPoint?.yearly_consumption == null ? '–' : formatKwh(meterPoint.yearly_consumption)}
          last
        />
      </Card>
      <Card gap={0} style={styles.kvCard}>
        <KeyValue label="Lieferadresse" value={delivery.length === 0 ? '–' : delivery} />
        {meterPoint?.malo_id ? <KeyValue label="Marktlokation" value={meterPoint.malo_id} /> : null}
        <KeyValue label="Vertragspartner" value={contactName(contract.billing_contact) || '–'} />
        <KeyValue label="Rechnungsadresse" value={billing.length === 0 ? '–' : billing} last />
      </Card>
      <Txt variant="small" style={styles.note}>
        Umzug, Kündigung oder andere Änderungen am Vertrag beantragst du im Kundenportal im Browser.
      </Txt>
    </>
  )
}

const styles = StyleSheet.create({
  kvCard: { paddingVertical: 4 },
  note: { lineHeight: 18, paddingHorizontal: 4 },
})
