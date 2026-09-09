import { isApiError } from '@/api/client'

/** Feldfehler einer 422-Antwort als `{ feld: erste Meldung }`; null bei anderen Fehlern. */
export function fieldErrorsFrom(error: unknown): Record<string, string> | null {
  if (!isApiError(error) || error.errors === undefined) return null
  const errors: Record<string, string> = {}
  for (const [field, messages] of Object.entries(error.errors)) errors[field] = messages[0] ?? ''
  return errors
}
