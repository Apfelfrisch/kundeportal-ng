import { useRouter } from 'expo-router'
import { Check } from 'lucide-react-native'
import { Pressable, StyleSheet, View } from 'react-native'

import { Card } from '@/components/Card'
import { Screen } from '@/components/Screen'
import { ErrorState, Loading } from '@/components/States'
import { Txt } from '@/components/Txt'
import { addressLine } from '@/lib/contracts'
import { useContractContext } from '@/providers/ContractProvider'
import { useTheme } from '@/theme'

export default function VertragWechselnScreen() {
  const router = useRouter()
  const theme = useTheme()
  const { contracts, contractNumber, select } = useContractContext()

  if (contracts.isPending) return <Loading />
  if (contracts.isError) return <ErrorState error={contracts.error} onRetry={() => void contracts.refetch()} />

  return (
    <Screen>
      <Card padding={0} gap={0}>
        {contracts.data.map((entry, index) => {
          const active = entry.contract_number === contractNumber
          return (
            <Pressable
              key={entry.contract_number}
              onPress={() => {
                select(entry.contract_number)
                router.back()
              }}
              android_ripple={{ color: theme.iconBg }}
              style={[
                styles.row,
                { borderBottomWidth: index === contracts.data.length - 1 ? 0 : StyleSheet.hairlineWidth, borderBottomColor: theme.border },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <View style={styles.text}>
                <Txt>Vertrag {entry.contract_number}</Txt>
                <Txt variant="muted" numberOfLines={1}>
                  {[entry.tariff, addressLine(entry.delivery_address), entry.status.label].filter((part) => part).join(' · ')}
                </Txt>
              </View>
              {active ? <Check size={20} color={theme.accent} /> : null}
            </Pressable>
          )
        })}
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 10, paddingHorizontal: 16 },
  text: { flex: 1, gap: 2 },
})
