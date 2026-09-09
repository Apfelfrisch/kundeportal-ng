import { ChevronRight } from 'lucide-react-native'
import { Pressable, StyleSheet, View } from 'react-native'

import { Txt } from '@/components/Txt'
import { useTheme } from '@/theme'

interface KeyValueProps {
  label: string
  value: string | Array<string>
  /** Erste/letzte Zeile der Karte: die Hervorhebung reicht dann bis an den Kartenrand. */
  first?: boolean
  last?: boolean
  /** Kompakte Zeile der Preisaufschlüsselung. */
  compact?: boolean
  /** Macht die Zeile zum Menüeintrag mit Chevron. */
  onPress?: () => void
}

/** Vertikaler Innenabstand der Karten, in denen KeyValue-Zeilen liegen. */
const CARD_PADDING_Y = 4

/** Beschriftung links, Wert rechtsbündig – Zeile einer Detailkarte. */
export function KeyValue({ label, value, first = false, last = false, compact = false, onPress }: KeyValueProps) {
  const theme = useTheme()
  const lines = Array.isArray(value) ? value : [value]

  const content = (
    <>
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
      {onPress !== undefined ? <ChevronRight size={20} color={theme.faint} style={styles.chevron} /> : null}
    </>
  )

  const rowStyle = [
    styles.row,
    { paddingVertical: compact ? 9 : 12 },
    { borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, borderBottomColor: theme.divider },
  ]

  if (onPress === undefined) return <View style={rowStyle}>{content}</View>

  const padding = compact ? 9 : 12
  const edges = {
    marginTop: first ? -CARD_PADDING_Y : 0,
    paddingTop: padding + (first ? CARD_PADDING_Y : 0),
    marginBottom: last ? -CARD_PADDING_Y : 0,
    paddingBottom: padding + (last ? CARD_PADDING_Y : 0),
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${lines.join(', ')}`}
      style={({ pressed }) => [rowStyle, styles.pressable, edges, pressed && { backgroundColor: theme.iconBg }]}
    >
      {content}
    </Pressable>
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 },
  pressable: { marginHorizontal: -16, paddingHorizontal: 16 },
  chevron: { marginLeft: -8 },
  label: { flexShrink: 0 },
  value: { flex: 1, alignItems: 'flex-end' },
  valueText: { textAlign: 'right', fontVariant: ['tabular-nums'] },
  header: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingTop: 12, paddingBottom: 8 },
})
