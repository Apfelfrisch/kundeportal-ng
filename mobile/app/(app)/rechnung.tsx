import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { useUsage } from '@/api/queries'
import type { Contract, Invoice } from '@/api/types'
import { Badge } from '@/components/Badge'
import { Card } from '@/components/Card'
import { ContractScreen } from '@/components/ContractScreen'
import { KeyValue } from '@/components/KeyValue'
import { LoadingBars } from '@/components/LoadingBars'
import { Segmented } from '@/components/Segmented'
import { Empty, ErrorState } from '@/components/States'
import { Txt } from '@/components/Txt'
import { UsageOverview } from '@/components/UsageOverview'
import { formatCents, formatDate, formatDateRange, formatKwh } from '@/lib/format'
import { USAGE_UNITS, type UsageUnit } from '@/lib/usage'
import { useUser } from '@/providers/AuthProvider'

/** Eine Rechnung im Detail, darunter der Verbrauch ihres Zeitraums. */
export default function RechnungScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()

  return (
    <ContractScreen>
      {(contract) => {
        const invoice = contract.invoices.find((entry) => String(entry.id) === id)
        return invoice === undefined ? <Empty message="Diese Rechnung wurde nicht gefunden." /> : <InvoiceDetail contract={contract} invoice={invoice} />
      }}
    </ContractScreen>
  )
}

function InvoiceDetail({ contract, invoice }: { contract: Contract; invoice: Invoice }) {
  const gross = invoice.amount_cents === null ? null : invoice.amount_cents + (invoice.tax_amount_cents ?? 0)

  return (
    <>
      <Card gap={0} style={styles.details}>
        <View style={styles.title}>
          <Txt variant="heading">Rechnung {invoice.invoice_number ?? '–'}</Txt>
          {invoice.canceled_at ? <Badge label="Storniert" tone="open" /> : null}
        </View>
        <KeyValue label="Rechnungsdatum" value={formatDate(invoice.invoice_date)} />
        <KeyValue label="Zeitraum" value={formatDateRange(invoice.invoice_from, invoice.invoice_until)} />
        <KeyValue label="Verbrauch" value={invoice.consumption === null ? '–' : formatKwh(invoice.consumption)} />
        <KeyValue label="Netto" value={invoice.amount_cents === null ? '–' : formatCents(invoice.amount_cents)} />
        <KeyValue label="Umsatzsteuer" value={invoice.tax_amount_cents === null ? '–' : formatCents(invoice.tax_amount_cents)} />
        <KeyValue label="Brutto" value={gross === null ? '–' : formatCents(gross)} last={invoice.canceled_at === null} />
        {invoice.canceled_at ? <KeyValue label="Storniert am" value={formatDate(invoice.canceled_at)} last /> : null}
      </Card>
      {invoice.invoice_from && invoice.invoice_until ? (
        <InvoiceUsage contract={contract} from={invoice.invoice_from} until={invoice.invoice_until} />
      ) : null}
    </>
  )
}

function InvoiceUsage({ contract, from, until }: { contract: Contract; from: string; until: string }) {
  const user = useUser()
  const [unit, setUnit] = useState<UsageUnit>('kwh')
  const usage = useUsage(user.id, contract.contract_number, { from, until }, contract.is_dynamic)

  if (!contract.is_dynamic) return null

  if (usage.isPending) return <LoadingBars label="Verbrauch wird geladen" minHeight={200} />

  if (usage.isError) return <ErrorState error={usage.error} onRetry={() => void usage.refetch()} />

  return (
    <>
      <View style={styles.controls}>
        <Txt variant="label" style={styles.controlsLabel}>
          Verbrauch im Zeitraum
        </Txt>
        <Segmented options={USAGE_UNITS} value={unit} onChange={setUnit} style={styles.units} />
      </View>
      <UsageOverview
        data={usage.data}
        unit={unit}
        busy={usage.isFetching}
        busyLabel="Wird aktualisiert"
        title={formatDateRange(from, until)}
        legend={false}
      />
    </>
  )
}

const styles = StyleSheet.create({
  details: { paddingVertical: 4 },
  title: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 12 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  controlsLabel: { flex: 1, paddingHorizontal: 4 },
  units: { width: 132 },
})
