import { StyleSheet, View } from 'react-native'

import { Txt } from '@/components/Txt'
import { useTheme } from '@/theme'

interface KeyValueProps {
  label: string
  value: string | Array<string>
  last?: boolean
  /** Kompakte Zeile der Preisaufschlüsselung. */
  compact?: boolean
}

/** Beschriftung links, Wert rechtsbündig – Zeile einer Detailkarte. */
export function KeyValue({ label, value, last = false, compact = false }: KeyValueProps) {
  const theme = useTheme()
  const lines = Array.isArray(value) ? value : [value]

  return (
    <View
      style={[
        styles.row,
        { paddingVertical: compact ? 9 : 12 },
        { borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, borderBottomColor: theme.border },
      ]}
    >
      <Txt variant={compact ? 'muted' : 'muted'} style={[styles.label, compact && { fontSize: 13 }]}>
        {label}
      </Txt>
      <View style={styles.value}>
        {lines.map((line, index) => (
          <Txt
            key={`${index}-${line}`}
            variant={compact ? 'muted' : 'strong'}
            color="fg"
            style={[styles.valueText, compact && { fontSize: 13, fontWeight: '400' }]}
          >
            {line}
          </Txt>
        ))}
      </View>
    </View>
  )
}

/** Kartenkopf einer Preisgruppe: Titel links, Summe rechts. */
export function GroupHeader({ title, total }: { title: string; total: string }) {
  return (
    <View style={styles.header}>
      <Txt variant="label">{title}</Txt>
      <Txt variant="strong" style={styles.valueText}>
        {total}
      </Txt>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  label: { flexShrink: 0 },
  value: { flex: 1, alignItems: 'flex-end' },
  valueText: { textAlign: 'right', fontVariant: ['tabular-nums'] },
  header: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingTop: 12, paddingBottom: 8 },
})
