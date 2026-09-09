import type { ValidationErrors } from './types'

/**
 * Fetch-Wrapper für die Laravel-API im Bearer-Token-Modus (Sanctum
 * Personal Access Token, `POST /api/auth/token`). Fehler kommen als
 * `ApiError` mit `{ status, message, errors? }`.
 */

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/$/, '')

let authToken: string | null = null
let onUnauthenticated: (() => void) | null = null

export function setAuthToken(token: string | null): void {
  authToken = token
}

/** Wird bei einer 401-Antwort aufgerufen – der AuthProvider meldet dann ab. */
export function setUnauthenticatedHandler(handler: (() => void) | null): void {
  onUnauthenticated = handler
}

export class ApiError extends Error {
  readonly status: number
  readonly errors?: ValidationErrors

  constructor(status: number, message: string, errors?: ValidationErrors) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }

  get isValidationError(): boolean {
    return this.status === 422
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export const GENERIC_ERROR_MESSAGE =
  'Es ist ein unerwarteter Fehler aufgetreten. Bitte versuche es später erneut.'

export function apiErrorMessage(error: unknown): string {
  return isApiError(error) ? error.message : GENERIC_ERROR_MESSAGE
}

/** Erste Feldmeldung eines 422-Fehlers, sonst die allgemeine Meldung. */
export function firstApiErrorMessage(error: unknown): string {
  if (!isApiError(error)) return GENERIC_ERROR_MESSAGE
  return Object.values(error.errors ?? {})[0]?.[0] ?? error.message
}

function defaultMessage(status: number): string {
  switch (status) {
    case 401:
      return 'Bitte melde dich an, um fortzufahren.'
    case 403:
      return 'Du bist nicht berechtigt, diese Aktion auszuführen.'
    case 404:
      return 'Die angeforderten Daten wurden nicht gefunden.'
    case 422:
      return 'Die übermittelten Daten sind ungültig.'
    case 429:
      return 'Zu viele Anfragen. Bitte warte einen Moment und versuche es erneut.'
    default:
      return GENERIC_ERROR_MESSAGE
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  query?: Record<string, string | undefined>
  /** Kein 401-Handler: für die Session-Prüfung beim Start. */
  silent401?: boolean
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = new URL(`${API_URL}/api/${path.replace(/^\//, '')}`)
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, value)
  }

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (authToken !== null) headers.Authorization = `Bearer ${authToken}`
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'

  const response = await fetch(url.toString(), {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  if (response.status === 204) return undefined as T

  const text = await response.text()
  let payload: unknown = null
  if (text !== '') {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = null
    }
  }

  if (!response.ok) {
    if (response.status === 401 && !options.silent401) onUnauthenticated?.()

    const body = (payload ?? {}) as { message?: unknown; errors?: unknown }
    const message =
      typeof body.message === 'string' && body.message !== ''
        ? body.message
        : defaultMessage(response.status)
    const errors =
      typeof body.errors === 'object' && body.errors !== null
        ? (body.errors as ValidationErrors)
        : undefined

    throw new ApiError(response.status, message, errors)
  }

  return payload as T
}
