import { useRouter } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'
import { Pressable, StyleSheet, View } from 'react-native'

import type { Contract, Invoice } from '@/api/types'
import { Badge } from '@/components/Badge'
import { Card } from '@/components/Card'
import { ContractScreen } from '@/components/ContractScreen'
import { Txt } from '@/components/Txt'
import { formatCents, formatDate, formatDateRange, formatKwh } from '@/lib/format'
import { useTheme } from '@/theme'

export default function RechnungenScreen() {
  return <ContractScreen>{(contract) => <Invoices contract={contract} />}</ContractScreen>
}

function Invoices({ contract }: { contract: Contract }) {
  const installment = contract.installment
  const invoices = [...contract.invoices].sort((a, b) => startOf(b).localeCompare(startOf(a)))
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
  const router = useRouter()
  const period = invoice.invoice_from ? formatDateRange(invoice.invoice_from, invoice.invoice_until ?? invoice.invoice_date) : formatDate(invoice.invoice_date)

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/(app)/rechnung', params: { id: String(invoice.id) } })}
      android_ripple={{ color: theme.iconBg }}
      accessibilityRole="button"
      accessibilityLabel={`Rechnung ${invoice.invoice_number ?? ''} öffnen`}
      style={({ pressed }) => [
        styles.row,
        { borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, borderBottomColor: theme.divider },
        pressed && { backgroundColor: theme.iconBg },
      ]}
    >
      <View style={styles.rowText}>
        <Txt variant="strong">Rechnung {invoice.invoice_number ?? '–'}</Txt>
        <View style={styles.meta}>
          <Txt variant="muted">{period}</Txt>
          {invoice.canceled_at ? <Badge label="Storniert" tone="open" /> : null}
        </View>
      </View>
      <View style={styles.amounts}>
        {invoice.amount_cents != null ? (
          <Txt variant="strong" style={styles.consumption}>
            {formatCents(invoice.amount_cents)}
          </Txt>
        ) : null}
        {invoice.consumption != null ? (
          <Txt variant="muted" style={styles.consumption}>
            {formatKwh(invoice.consumption)}
          </Txt>
        ) : null}
      </View>
      <ChevronRight size={20} color={theme.faint} />
    </Pressable>
  )
}

function startOf(invoice: Invoice): string {
  return invoice.invoice_from ?? invoice.invoice_date ?? ''
}

function groupByYear(invoices: ReadonlyArray<Invoice>): Array<[string, Array<Invoice>]> {
  const groups = new Map<string, Array<Invoice>>()
  for (const invoice of invoices) {
    const year = startOf(invoice).slice(0, 4) || 'Ohne Datum'
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
  amounts: { alignItems: 'flex-end', gap: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  consumption: { fontVariant: ['tabular-nums'] },
})
