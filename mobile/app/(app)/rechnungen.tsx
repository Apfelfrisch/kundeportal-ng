import { StyleSheet, View } from 'react-native'

import type { Contract, Invoice } from '@/api/types'
import { Badge } from '@/components/Badge'
import { Card } from '@/components/Card'
import { ContractScreen } from '@/components/ContractScreen'
import { Txt } from '@/components/Txt'
import { formatCents, formatDate, formatKwh } from '@/lib/format'
import { useTheme } from '@/theme'

export default function RechnungenScreen() {
  return <ContractScreen>{(contract) => <Invoices contract={contract} />}</ContractScreen>
}

function Invoices({ contract }: { contract: Contract }) {
  const installment = contract.installment
  const invoices = [...contract.invoices].sort((a, b) => (b.invoice_date ?? '').localeCompare(a.invoice_date ?? ''))
  const years = groupByYear(invoices)

  return (
    <>
      {installment?.amount_cents != null ? (
        <Card soft style={styles.installment}>
          <View>
            <Txt variant="small">Nächster Abschlag</Txt>
            <Txt variant="strong">{installment.next_payment ? formatDate(installment.next_payment) : 'Termin offen'}</Txt>
          </View>
          <Txt variant="heading" color="accent" style={styles.amount}>
            {formatCents(installment.amount_cents)}
          </Txt>
        </Card>
      ) : null}
      {invoices.length === 0 ? (
        <Txt variant="muted" style={styles.empty}>
          Für diesen Vertrag liegen noch keine Rechnungen vor.
        </Txt>
      ) : (
        years.map(([year, entries]) => (
          <View key={year} style={styles.year}>
            <Txt variant="label" style={styles.yearLabel}>
              {year}
            </Txt>
            <Card padding={0} gap={0}>
              {entries.map((invoice, index) => (
                <InvoiceRow key={String(invoice.id)} invoice={invoice} last={index === entries.length - 1} />
              ))}
            </Card>
          </View>
        ))
      )}
    </>
  )
}

function InvoiceRow({ invoice, last }: { invoice: Invoice; last: boolean }) {
  const theme = useTheme()
  const period =
    invoice.invoice_from && invoice.invoice_date
      ? `${formatDate(invoice.invoice_from)} – ${formatDate(invoice.invoice_date)}`
      : formatDate(invoice.invoice_date)

  return (
    <View style={[styles.row, { borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, borderBottomColor: theme.divider }]}>
      <View style={styles.rowText}>
        <Txt variant="strong">Rechnung {invoice.invoice_number ?? '–'}</Txt>
        <View style={styles.meta}>
          <Txt variant="muted">{period}</Txt>
          {invoice.canceled_at ? <Badge label="Storniert" tone="open" /> : null}
        </View>
      </View>
      {invoice.consumption != null ? (
        <Txt variant="strong" style={styles.consumption}>
          {formatKwh(invoice.consumption)}
        </Txt>
      ) : null}
    </View>
  )
}

function groupByYear(invoices: ReadonlyArray<Invoice>): Array<[string, Array<Invoice>]> {
  const groups = new Map<string, Array<Invoice>>()
  for (const invoice of invoices) {
    const year = invoice.invoice_date?.slice(0, 4) ?? 'Ohne Datum'
    const list = groups.get(year) ?? []
    list.push(invoice)
    groups.set(year, list)
  }
  return [...groups.entries()]
}

const styles = StyleSheet.create({
  installment: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  amount: { fontVariant: ['tabular-nums'] },
  empty: { textAlign: 'center', paddingVertical: 24 },
  year: { gap: 6 },
  yearLabel: { paddingHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 10, paddingHorizontal: 16 },
  rowText: { flex: 1, gap: 3 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  consumption: { fontVariant: ['tabular-nums'] },
})
