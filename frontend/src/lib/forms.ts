import { z } from 'zod'

import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import type { ApiError } from '#/api/client'

/** Mindestlänge neuer Passwörter (entspricht der Backend-Passwort-Policy). */
export const PASSWORD_MIN_LENGTH = 12

/** Schema-Baustein „neues Passwort“ mit deutscher Mindestlängen-Meldung. */
export const newPasswordSchema = z
  .string()
  .min(
    PASSWORD_MIN_LENGTH,
    `Das Passwort muss aus mindestens ${PASSWORD_MIN_LENGTH} Zeichen bestehen.`,
  )

/** Refine-Prüfung: Passwort und Bestätigung müssen übereinstimmen. */
export function passwordsMatch(values: {
  password: string
  password_confirmation: string
}): boolean {
  return values.password === values.password_confirmation
}

/** Meldung/Pfad zu `passwordsMatch` – der Fehler landet an der Bestätigung. */
export const passwordsMatchParams = {
  message: 'Die Passwörter stimmen nicht überein.',
  path: ['password_confirmation'],
}

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
