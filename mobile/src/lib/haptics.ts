import * as Haptics from 'expo-haptics'

/** Kurzer, leichter Impuls für Auswahlwechsel (Preisstreifen, Kalender). */
export function tick(): void {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined)
}
