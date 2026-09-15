import { ChevronDown, ChevronUp, Info } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { Card } from '@/components/Card'
import { Txt } from '@/components/Txt'
import { SHARE_COLORS } from '@/lib/chartColors'
import { tick } from '@/lib/haptics'
import type { UsageUnit } from '@/lib/usage'
import { theme, useTheme } from '@/theme'

/** Farbfeld je Eintrag: Verbrauchsbalken, ein Kostenanteil, die Preislinie oder der blasse (vorläufige) Balken. */
const SWATCHES = {
  usage: { color: theme.chartUsage, opacity: 1 },
  exchange: { color: SHARE_COLORS.exchange, opacity: 1 },
  supplier: { color: SHARE_COLORS.supplier, opacity: 1 },
  legal: { color: SHARE_COLORS.legal, opacity: 1 },
  line: { color: theme.chartLine, opacity: 1 },
  provisional: { color: theme.chartUsage, opacity: 0.45 },
} as const

interface Entry {
  swatch: keyof typeof SWATCHES
  title: string
  text: string
  /** Nur bei diesen Einheiten sichtbar; fehlt die Angabe, immer. */
  units?: ReadonlyArray<UsageUnit>
}

const INTRO: Record<UsageUnit, string> = {
  kwh: 'Jeder Balken zeigt deinen Verbrauch im Zeitraum in Kilowattstunden, abzulesen an der linken Achse.',
  eur: 'Jeder Balken zeigt die Kosten des Zeitraums, gestapelt nach den drei Preisbestandteilen. Alle Preise netto.',
}

const ENTRIES: ReadonlyArray<Entry> = [
    {
      swatch: 'usage',
      title: 'Verbrauch',
      text: 'Gemessener und abgerechneter Verbrauch aus den 15-minütlichen Zählerwerten.',
      units: ['kwh'],
    },
    {
      swatch: 'exchange',
      title: 'Börsenpreis',
      text: 'Der Preis an der Strombörse (EPEX) für die jeweilige Viertelstunde, angewendet auf deinen Verbrauch. Er schwankt von Stunde zu Stunde.',
      units: ['eur'],
    },
    {
      swatch: 'legal',
      title: 'Abgaben/Umlagen',
      text: 'Netzentgelte, Steuern, Umlagen und Konzessionsabgabe je Kilowattstunde sowie Netz-Grundpreis und Messstellenbetrieb, anteilig auf den Zeitraum verteilt.',
      units: ['eur'],
    },
    {
      swatch: 'supplier',
      title: 'Unser Aufschlag',
      text: 'Unser fester Arbeitspreis je Kilowattstunde plus unser Grundpreis, anteilig auf den Zeitraum verteilt.',
      units: ['eur'],
    },
    {
      swatch: 'line',
      title: 'Preislinie',
      text: 'Durchschnittlicher Arbeitspreis in ct/kWh je Balken (Börsenpreis plus Aufschläge, ohne Grundpreise), abzulesen an der rechten Achse – unabhängig davon, wie viel du verbraucht hast.',
    },
    {
      swatch: 'provisional',
      title: 'Blasse Balken',
      text: 'Gemessen, aber noch nicht abgerechnet. Vorläufig aus Lastgang, Börsenpreisen und aktuellem Tarif berechnet.',
    },
]

/** Aufklappbare Erklärung der Farben, der Preislinie und der blassen Balken – passend zur gewählten Einheit. */
export function ChartLegendCard({ unit }: { unit: UsageUnit }) {
  const theme = useTheme()
  const [open, setOpen] = useState(false)
  const Chevron = open ? ChevronUp : ChevronDown
  const entries = ENTRIES.filter((entry) => entry.units === undefined || entry.units.includes(unit))

  return (
    <Card padding={0} gap={0}>
      <Pressable
        onPress={() => {
          tick()
          setOpen((value) => !value)
        }}
        android_ripple={{ color: theme.iconBg }}
        style={({ pressed }) => [styles.header, pressed && { backgroundColor: theme.iconBg }]}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel="Erklärung des Diagramms"
      >
        <Info size={20} color={theme.muted} strokeWidth={1.75} />
        <Txt style={styles.headerText}>So liest du das Diagramm</Txt>
        <Chevron size={20} color={theme.faint} />
      </Pressable>
      {open ? (
        <View style={[styles.body, { borderTopColor: theme.divider }]}>
          <Txt variant="muted" style={styles.paragraph}>
            {INTRO[unit]}
          </Txt>
          {entries.map((entry) => (
            <View key={entry.swatch} style={styles.row}>
              <View style={styles.swatchBox}>
                <View
                  style={[
                    entry.swatch === 'line' ? styles.line : styles.swatch,
                    { backgroundColor: SWATCHES[entry.swatch].color, opacity: SWATCHES[entry.swatch].opacity },
                  ]}
                />
              </View>
              <View style={styles.text}>
                <Txt variant="strong">{entry.title}</Txt>
                <Txt variant="muted" style={styles.paragraph}>
                  {entry.text}
                </Txt>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56, paddingHorizontal: 16, paddingVertical: 10 },
  headerText: { flex: 1 },
  body: { borderTopWidth: 1, padding: 16, gap: 14 },
  row: { flexDirection: 'row', gap: 12 },
  swatchBox: { width: 20, paddingTop: 3, alignItems: 'center' },
  swatch: { width: 14, height: 14, borderRadius: 3 },
  line: { width: 16, height: 2, marginTop: 6, borderRadius: 1 },
  text: { flex: 1, gap: 2 },
  paragraph: { lineHeight: 18 },
})
