import { friesenWerk } from './tenants/friesen-werk'
import type { ThemeTokens } from './tokens'

export type { ThemeTokens } from './tokens'

const tenants: Record<string, ThemeTokens> = {
  'friesen-werk': friesenWerk,
}

/**
 * Farbsatz des Mandanten aus `EXPO_PUBLIC_CLIENT` (Slug wie `CLIENT` der
 * API). Ein unbekannter Slug fällt auf Friesen-Werk zurück.
 */
export function resolveTheme(slug: string | undefined): ThemeTokens {
  return (slug !== undefined ? tenants[slug] : undefined) ?? friesenWerk
}

export const theme: ThemeTokens = resolveTheme(process.env.EXPO_PUBLIC_CLIENT)

export function useTheme(): ThemeTokens {
  return theme
}
