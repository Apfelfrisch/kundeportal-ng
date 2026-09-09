import { useRouter } from 'expo-router'
import { Plus } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'

import type { Contract, MeterCount } from '@/api/types'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { ContractScreen } from '@/components/ContractScreen'
import { Txt } from '@/components/Txt'
import { isSingleTariffMeter, latestMeterCount, primaryMeter, primaryMeterPoint } from '@/lib/contracts'
import { formatDate, formatKwh } from '@/lib/format'
import { useTheme } from '@/theme'

export default function ZaehlerstaendeScreen() {
  return <ContractScreen>{(contract) => <MeterReadings contract={contract} />}</ContractScreen>
}

function MeterReadings({ contract }: { contract: Contract }) {
  const router = useRouter()
  const meterPoint = primaryMeterPoint(contract)
  const meter = primaryMeter(meterPoint)
  const latest = latestMeterCount(meterPoint)
  const singleTariff = isSingleTariffMeter(contract)
  const history = meterPoint?.meter_counts ?? []

  return (
    <>
      <Card gap={10}>
        <View style={styles.between}>
          <Txt variant="small">{meter?.meter_number ? `Zähler ${meter.meter_number}` : 'Zähler'}</Txt>
          <Txt variant="small">{singleTariff ? 'Eintarif' : 'HT / NT'}</Txt>
        </View>
        <View style={styles.reading}>
          <Txt variant="number">{latest?.meter_count_1 == null ? '–' : formatKwh(latest.meter_count_1).replace(' kWh', '')}</Txt>
          <Txt variant="strong" color="muted">
            kWh
          </Txt>
        </View>
        <Txt variant="muted">
          {latest?.reading_date
            ? `Letzter Stand vom ${formatDate(latest.reading_date)}${latest.reading_kind ? ` · ${latest.reading_kind.label}` : ''}`
            : 'Noch kein Zählerstand vorhanden.'}
        </Txt>
      </Card>
      <Button label="Zählerstand melden" icon={Plus} onPress={() => router.push('/(app)/zaehlerstand-melden')} />
      {history.length > 0 ? (
        <View style={styles.history}>
          <Txt variant="label" style={styles.historyLabel}>
            Verlauf
          </Txt>
          <Card padding={0} gap={0}>
            {history.map((entry, index) => (
              <HistoryRow key={String(entry.id)} entry={entry} singleTariff={singleTariff} last={index === history.length - 1} />
            ))}
          </Card>
        </View>
      ) : null}
    </>
  )
}

function HistoryRow({ entry, singleTariff, last }: { entry: MeterCount; singleTariff: boolean; last: boolean }) {
  const theme = useTheme()
  const source = [entry.reading_kind?.label, entry.reading_type?.label].filter(Boolean).join(' · ')

  return (
    <View style={[styles.row, { borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, borderBottomColor: theme.border }]}>
      <View style={styles.rowText}>
        <Txt variant="strong">{formatDate(entry.reading_date)}</Txt>
        {source !== '' ? <Txt variant="muted">{source}</Txt> : null}
      </View>
      <View style={styles.values}>
        <Txt variant="strong" style={styles.value}>
          {entry.meter_count_1 == null ? '–' : formatKwh(entry.meter_count_1)}
        </Txt>
        {!singleTariff && entry.meter_count_2 != null ? (
          <Txt variant="muted" style={styles.value}>
            NT {formatKwh(entry.meter_count_2)}
          </Txt>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', justifyContent: 'space-between' },
  reading: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  history: { gap: 6 },
  historyLabel: { paddingHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 8, paddingHorizontal: 16 },
  rowText: { flex: 1, gap: 2 },
  values: { alignItems: 'flex-end', gap: 2 },
  value: { fontVariant: ['tabular-nums'] },
})
