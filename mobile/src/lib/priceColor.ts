/**
 * Farbskala der Preise: Lage zwischen Tagestief (0, grün) und Tageshoch
 * (1, rot) als HSL-Farbe – Ring auf der Startseite und Balken des
 * Tagesverlaufs nutzen dieselbe Skala.
 */

const HUE_START = 143
const HUE_END = 0

export function priceHue(position: number): number {
  const clamped = Math.min(1, Math.max(0, position))
  return HUE_START + (HUE_END - HUE_START) * clamped
}

/** Kräftige Farbe für den hervorgehobenen Wert. */
export function priceColor(position: number): string {
  return `hsl(${priceHue(position)}, 70%, 55%)`
}

/** Gedämpfte Farbe für die übrigen Werte. */
export function priceColorDim(position: number): string {
  return `hsl(${priceHue(position)}, 45%, 36%)`
}

/** Sehr blasse Farbe für den nicht gefüllten Teil des Rings. */
export function priceColorFaint(position: number): string {
  return `hsl(${priceHue(position)}, 30%, 27%)`
}

/**
 * Lage eines Werts zwischen Minimum und Maximum; 0.5, wenn alle Werte
 * gleich sind.
 */
export function pricePosition(value: number, min: number, max: number): number {
  return max > min ? (value - min) / (max - min) : 0.5
}
