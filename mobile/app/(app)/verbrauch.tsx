import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { queryKeys, usageQueryOptions, useUsage } from '@/api/queries'
import type { Contract, UsagePeriod } from '@/api/types'
import { Card } from '@/components/Card'
import { ContractScreen } from '@/components/ContractScreen'
import { LoadingBars } from '@/components/LoadingBars'
import { PeriodTabs } from '@/components/PeriodTabs'
import { Segmented } from '@/components/Segmented'
import { ErrorState } from '@/components/States'
import { Txt } from '@/components/Txt'
import { UsageOverview } from '@/components/UsageOverview'
import { periodOptions, USAGE_UNITS, type UsageUnit } from '@/lib/usage'
import { useUser } from '@/providers/AuthProvider'

const PERIODS: ReadonlyArray<{ value: UsagePeriod; label: string }> = [
  { value: 'day', label: 'Tag' },
  { value: 'month', label: 'Monat' },
  { value: 'year', label: 'Jahr' },
]

/**
 * Verbrauch je Tag, Monat oder Jahr – abgerechnet plus vorläufig aus dem
 * Lastgang – mit Summe und Kosten des Zeitraums, Balkendiagramm mit
 * Preislinie und Kostenaufteilung.
 */
export default function VerbrauchScreen() {
  return <ContractScreen>{(contract) => <Usage contract={contract} />}</ContractScreen>
}

function Usage({ contract }: { contract: Contract }) {
  const user = useUser()
  const queryClient = useQueryClient()
  const [period, setPeriod] = useState<UsagePeriod>('month')
  const [unit, setUnit] = useState<UsageUnit>('kwh')
  const [date, setDate] = useState<string | null>(null)
  const usage = useUsage(user.id, contract.contract_number, { period, date }, contract.is_dynamic)
  const settled = usage.isFetching || usage.isPlaceholderData ? null : (usage.data ?? null)
  const contractNumber = contract.contract_number
  const options = useMemo(() => periodOptions(period, usage.data?.available ?? null), [period, usage.data?.available])

  useEffect(() => {
    if (settled === null) return
    // Die „neueste“ Antwort (date null) gilt auch unter ihrem eigenen Datum –
    // der Tab dazu braucht dann keinen zweiten Abruf.
    if (date === null) queryClient.setQueryData(queryKeys.usage(user.id, contractNumber, { period, date: settled.from }), settled)
    // KVS summiert jeden Zeitraum erst auf Anfrage – die Nachbar-Tabs werden
    // nach dem Laden vorgeholt, damit der nächste sofort da ist.
    const index = options.findIndex((option) => option.date === settled.from)
    for (const neighbour of [options[index - 1], options[index + 1]]) {
      if (neighbour === undefined) continue
      void queryClient.prefetchQuery(usageQueryOptions(user.id, contractNumber, { period, date: neighbour.date }))
    }
  }, [settled, date, options, queryClient, user.id, contractNumber, period])

  if (!contract.is_dynamic) {
    return (
      <Card>
        <Txt variant="muted">Verbrauchswerte gibt es nur für Verträge mit dynamischem Tarif.</Txt>
      </Card>
    )
  }

  return (
    <>
      <View style={styles.controls}>
        <Segmented options={PERIODS} value={period} onChange={setPeriod} style={styles.periods} />
        <Segmented options={USAGE_UNITS} value={unit} onChange={setUnit} style={styles.units} />
      </View>
      {usage.isPending ? (
        <LoadingBars label="Verbrauch wird geladen" minHeight={240} />
      ) : usage.isError ? (
        <ErrorState error={usage.error} onRetry={() => void usage.refetch()} />
      ) : (
        <>
          {options.length > 0 ? <PeriodTabs options={options} value={usage.data.from} onChange={setDate} /> : null}
          <UsageOverview
            data={usage.data}
            unit={unit}
            busy={usage.isFetching}
            busyLabel={usage.isPlaceholderData ? 'Zeitraum wird berechnet' : 'Wird aktualisiert'}
          />
        </>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  controls: { flexDirection: 'row', gap: 10 },
  periods: { flex: 1 },
  units: { width: 132 },
})
