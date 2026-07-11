import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import type { ApiError } from '#/api/client'

/**
 * Überträgt 422-Validierungsfehler des Backends in ein react-hook-form-Formular.
 * Fehler zu unbekannten Feldern (oder ohne Felder) landen als `root`-Fehler.
 */
export function applyApiErrorsToForm<T extends FieldValues>(
  error: ApiError,
  setError: UseFormSetError<T>,
  fields: ReadonlyArray<Path<T>>,
): void {
  let applied = false

  for (const [field, messages] of Object.entries(error.errors ?? {})) {
    const message = messages[0]
    if (message === undefined) continue
    if ((fields as ReadonlyArray<string>).includes(field)) {
      setError(field as Path<T>, { type: 'server', message })
      applied = true
    }
  }

  if (!applied) {
    setError('root', { type: 'server', message: error.message })
  }
}
