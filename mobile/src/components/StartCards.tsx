import { Plus } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { StyleSheet, View } from 'react-native'

import { useMarketPrices } from '@/api/queries'
import type { Contract } from '@/api/types'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { PriceGauge } from '@/components/PriceGauge'
import { PriceStrip } from '@/components/PriceStrip'
import { Txt } from '@/components/Txt'
import { latestMeterCount, primaryMeterPoint } from '@/lib/contracts'
import { formatCents, formatCt, formatDate, formatKwh } from '@/lib/format'
import { hourRange, priceOverview } from '@/lib/prices'
import { useUser } from '@/providers/AuthProvider'

/** Startseite ohne dynamischen Tarif: Abschlag, letzter Zählerstand, Melden. */
export function GlanceCard({ contract }: { contract: Contract }) {
  const router = useRouter()
  const installment = contract.installment
  const reading = latestMeterCount(primaryMeterPoint(contract))

  return (
    <Card gap={14}>
      <Txt variant="label">Auf einen Blick</Txt>
      <View style={styles.grid}>
        <Stat
          label="Nächster Abschlag"
          value={installment?.amount_cents == null ? '–' : formatCents(installment.amount_cents)}
          sub={installment?.next_payment ? `am ${formatDate(installment.next_payment)}` : 'kein Termin bekannt'}
        />
        <Stat
          label="Letzter Zählerstand"
          value={reading?.meter_count_1 == null ? '–' : formatKwh(reading.meter_count_1)}
          sub={reading?.reading_date ? `am ${formatDate(reading.reading_date)}` : 'noch kein Stand'}
        />
      </View>
      <Button label="Zählerstand melden" icon={Plus} onPress={() => router.push('/(app)/zaehlerstand-melden')} />
    </Card>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <View style={styles.stat}>
      <Txt variant="small">{label}</Txt>
      <Txt variant="heading" style={styles.statValue}>
        {value}
      </Txt>
      <Txt variant="small">{sub}</Txt>
    </View>
  )
}

/** Startseite mit dynamischem Tarif: Preis der laufenden Stunde und Tagesverlauf. */
export function CurrentPriceCard({ contract }: { contract: Contract }) {
  const user = useUser()
  const prices = useMarketPrices(user.id, contract.is_dynamic)

  if (prices.isPending) {
    return (
      <Card>
        <Txt variant="label">Aktueller Strompreis</Txt>
        <Txt variant="muted">Preise werden geladen …</Txt>
      </Card>
    )
  }

  if (prices.isError) {
    return (
      <Card>
        <Txt variant="label">Aktueller Strompreis</Txt>
        <Txt variant="muted">Die Börsenpreise sind gerade nicht verfügbar.</Txt>
      </Card>
    )
  }

  const surcharge = prices.data.tariff_costs?.total_ct ?? contract.prices.calculated_dynamic_working_price_ct ?? 0
  const overview = priceOverview(prices.data.prices, surcharge)
  const cheapest = overview.cheapestHour === null ? null : overview.hourly[overview.cheapestHour]

  return (
    <Card>
      <View style={styles.rowBetween}>
        <Txt variant="label" style={styles.flex}>
          Aktueller Viertelstundenpreis{overview.slotLabel === null ? '' : ` · ${overview.slotLabel}`}
        </Txt>
        {overview.rating === 'cheap' ? <Badge label="günstig" tone="ok" /> : null}
        {overview.rating === 'expensive' ? <Badge label="teuer" tone="open" /> : null}
      </View>
      <View style={styles.priceRow}>
        <PriceGauge fraction={overview.fraction} size={52} />
        <View style={styles.priceValue}>
          <Txt variant="number">{overview.current === null ? '–' : formatCt(overview.current, 3).replace(' ct', '')}</Txt>
          <Txt variant="strong" color="muted">
            ct/kWh
          </Txt>
        </View>
      </View>
      <PriceStrip hourly={overview.hourly} currentHour={overview.currentHour} />
      <Txt variant="muted">
        {overview.cheapestHour !== null && cheapest != null
          ? `Günstigste Stunde ${hourRange(overview.cheapestHour)} · ${formatCt(cheapest, 2)}`
          : 'Für heute liegen noch keine Preise vor.'}
      </Txt>
      <Txt variant="small">Börsenpreis plus fester Tarifaufschlag, netto.</Txt>
    </Card>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, gap: 2 },
  statValue: { fontVariant: ['tabular-nums'] },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  priceValue: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
})
