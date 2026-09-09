import Svg, { Circle, Path } from 'react-native-svg'

import { useTheme } from '@/theme'

interface PriceGaugeProps {
  /** Lage des Preises zwischen Tagestief (0) und Tageshoch (1); null = keine Daten. */
  fraction: number | null
  size?: number
}

const SEGMENTS = 36
const START_ANGLE = 135
const SWEEP = 270
const HUE_START = 143
const HUE_END = 0

function point(cx: number, cy: number, radius: number, angle: number): { x: number; y: number } {
  const rad = (angle * Math.PI) / 180
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) }
}

function arc(cx: number, cy: number, radius: number, from: number, to: number): string {
  const a = point(cx, cy, radius, from)
  const b = point(cx, cy, radius, to)
  return `M ${a.x} ${a.y} A ${radius} ${radius} 0 0 1 ${b.x} ${b.y}`
}

function hueAt(position: number): number {
  return HUE_START + (HUE_END - HUE_START) * position
}

/**
 * Ring wie auf der Börsenpreis-Seite: ein Dreiviertelkreis von Grün nach
 * Rot, bis zur Lage des aktuellen Preises hell gefüllt, mit Punkt am Ende.
 */
export function PriceGauge({ fraction, size = 48 }: PriceGaugeProps) {
  const theme = useTheme()
  const center = size / 2
  const stroke = size * (5 / 48)
  const radius = center - stroke / 2 - size * (2 / 48)
  const segmentAngle = SWEEP / SEGMENTS
  const marker = fraction === null ? null : point(center, center, radius, START_ANGLE + SWEEP * fraction)

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} accessibilityLabel="Lage des Preises zwischen Tagestief und Tageshoch">
      {Array.from({ length: SEGMENTS }, (_, index) => {
        const position = index / (SEGMENTS - 1)
        const from = START_ANGLE + index * segmentAngle
        const to = from + segmentAngle + 0.6
        const lit = fraction !== null && (index + 1) / SEGMENTS <= fraction + 1e-6
        return (
          <Path
            key={index}
            d={arc(center, center, radius, from, Math.min(to, START_ANGLE + SWEEP))}
            stroke={lit ? `hsl(${hueAt(position)}, 70%, 55%)` : `hsl(${hueAt(position)}, 30%, 27%)`}
            strokeWidth={stroke}
            fill="none"
          />
        )
      })}
      {marker !== null && fraction !== null ? (
        <Circle
          cx={marker.x}
          cy={marker.y}
          r={size * (4.5 / 48)}
          fill={`hsl(${hueAt(fraction)}, 70%, 55%)`}
          stroke={theme.card}
          strokeWidth={size * (2 / 48)}
        />
      ) : null}
    </Svg>
  )
}
