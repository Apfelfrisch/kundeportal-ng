import { useState } from 'react'
import { StyleSheet, View, type NativeSyntheticEvent, type TextLayoutEventData } from 'react-native'

import { useMarketPrices } from '@/api/queries'
import type { Contract } from '@/api/types'
import { Card } from '@/components/Card'
import { PriceGauge } from '@/components/PriceGauge'
import { PriceStrip } from '@/components/PriceStrip'
import { Txt } from '@/components/Txt'
import { latestMeterCount, primaryMeterPoint } from '@/lib/contracts'
import { formatCents, formatCtValue, formatDate, formatKwh } from '@/lib/format'
import { hourRange, priceOverview } from '@/lib/prices'
import { useUser } from '@/providers/AuthProvider'

/** Startseite ohne dynamischen Tarif: Abschlag und letzter Zählerstand. */
export function GlanceCard({ contract }: { contract: Contract }) {
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

/**
 * Startseite mit dynamischem Tarif: Preis der laufenden Viertelstunde und
 * Tagesverlauf, immer inklusive der zusätzlichen Preisbestandteile (der
 * Schalter dafür gehört auf die Börsenpreis-Seite).
 */
export function CurrentPriceCard({ contract }: { contract: Contract }) {
  const user = useUser()
  const prices = useMarketPrices(user.id, contract.is_dynamic)
  // Passt „Heutiger Strompreis“ nicht neben Ring und Preis in eine Zeile,
  // bleibt nur „Strompreis“ stehen.
  const [shortLabel, setShortLabel] = useState(false)
  // Stunde unter dem Finger auf dem Tagesverlauf: solange gesetzt, zeigt die
  // Kopfzeile deren Preis statt des Preises der laufenden Viertelstunde.
  const [selectedHour, setSelectedHour] = useState<number | null>(null)

  function checkLabelWidth(event: NativeSyntheticEvent<TextLayoutEventData>) {
    if (!shortLabel && event.nativeEvent.lines.length > 1) setShortLabel(true)
  }

  if (prices.isPending) {
    return (
      <Card>
        <Txt variant="label">Heutiger Strompreis</Txt>
        <Txt variant="muted">Preise werden geladen …</Txt>
      </Card>
    )
  }

  if (prices.isError) {
    return (
      <Card>
        <Txt variant="label">Heutiger Strompreis</Txt>
        <Txt variant="muted">Die Börsenpreise sind gerade nicht verfügbar.</Txt>
      </Card>
    )
  }

  const components = prices.data.tariff_costs?.total_ct ?? contract.prices.calculated_dynamic_working_price_ct ?? 0
  const overview = priceOverview(prices.data.prices, components)
  const selectedValue = selectedHour === null ? null : (overview.hourly[selectedHour] ?? null)
  const shown = selectedHour === null ? overview.current : selectedValue
  const fraction = selectedHour === null ? overview.fraction : dayFraction(selectedValue, overview.min, overview.max)

  return (
    <Card gap={4}>
      <View style={styles.headerRow}>
        <Txt variant="label" style={styles.flex} onTextLayout={checkLabelWidth}>
          {selectedHour !== null ? hourRange(selectedHour) : shortLabel ? 'Strompreis' : 'Heutiger Strompreis'}
        </Txt>
        <View style={styles.priceRow}>
          <PriceGauge fraction={fraction} size={28} />
          <View style={styles.priceValue}>
            <Txt variant="heading" style={styles.priceNumber}>
              {shown === null ? '–' : formatCtValue(shown, 3)}
            </Txt>
            <Txt variant="small">ct/kWh</Txt>
          </View>
        </View>
      </View>
      {overview.current === null && selectedHour === null ? <Txt variant="muted">Für diese Viertelstunde liegt kein Preis vor.</Txt> : null}
      <PriceStrip hourly={overview.hourly} currentHour={overview.currentHour} height={72} onSelect={setSelectedHour} />
    </Card>
  )
}

/** Lage eines Stundenpreises zwischen Tagestief (0) und Tageshoch (1). */
function dayFraction(value: number | null, min: number | null, max: number | null): number | null {
  if (value === null || min === null || max === null) return null
  return max > min ? Math.min(1, Math.max(0, (value - min) / (max - min))) : 0.5
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, gap: 2 },
  statValue: { fontVariant: ['tabular-nums'] },
  flex: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  priceValue: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  priceNumber: { fontVariant: ['tabular-nums'] },
})
