import type { CostShare } from '@/lib/usage'
import { theme } from '@/theme'

/** Farbe je Kostenanteil – für Balken, Legende und Erklärung dieselbe. */
export const SHARE_COLORS: Record<CostShare, string> = {
  exchange: theme.chartExchange,
  supplier: theme.chartSupplier,
  legal: theme.chartLegal,
}
