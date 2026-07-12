import type { ValidationErrors } from '#/types/api'

/**
 * Typisierter Fetch-Wrapper für die Laravel-Sanctum-Cookie-API.
 *
 * - `credentials: 'include'` bei allen Requests
 * - CSRF-Bootstrap über `GET /sanctum/csrf-cookie`, `X-XSRF-TOKEN`-Header
 *   (URL-dekodierter Cookie-Wert) bei allen nicht-GET-Requests
 * - 419 (CSRF abgelaufen): Cookie neu holen und genau einmal wiederholen
 * - Fehler werden als `ApiError` mit `{ status, message, errors?, code? }` geworfen
 */

export class ApiError extends Error {
  readonly status: number
  readonly errors?: ValidationErrors
  readonly code?: string

  constructor(
    status: number,
    message: string,
    options: { errors?: ValidationErrors; code?: string } = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = options.errors
    this.code = options.code
  }

  get isUnauthenticated(): boolean {
    return this.status === 401
  }

  get isValidationError(): boolean {
    return this.status === 422
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

/** Generische Fallback-Meldung für unerwartete (Nicht-API-)Fehler. */
export const GENERIC_ERROR_MESSAGE =
  'Es ist ein unerwarteter Fehler aufgetreten. Bitte versuche es später erneut.'

/** Deutsche Fehlermeldung: `ApiError.message`, sonst die generische Meldung. */
export function apiErrorMessage(error: unknown): string {
  return isApiError(error) ? error.message : GENERIC_ERROR_MESSAGE
}

/**
 * Wie `apiErrorMessage`, bevorzugt aber die erste Feldmeldung eines
 * 422-Fehlers – für Formulare ohne feldgenaue Fehleranzeige.
 */
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
      return 'Die angeforderte Ressource wurde nicht gefunden.'
    case 419:
      return 'Deine Sitzung ist abgelaufen. Bitte versuche es erneut.'
    case 422:
      return 'Die übermittelten Daten sind ungültig.'
    case 429:
      return 'Zu viele Anfragen. Bitte warte einen Moment und versuche es erneut.'
    default:
      return GENERIC_ERROR_MESSAGE
  }
}

function readCookie(name: string): string | null {
  const cookies = document.cookie ? document.cookie.split('; ') : []
  for (const cookie of cookies) {
    const separatorIndex = cookie.indexOf('=')
    if (separatorIndex === -1) continue
    if (cookie.slice(0, separatorIndex) === name) {
      return cookie.slice(separatorIndex + 1)
    }
  }
  return null
}

async function fetchCsrfCookie(): Promise<void> {
  await fetch('/sanctum/csrf-cookie', {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
}

async function csrfToken(forceRefresh: boolean): Promise<string> {
  let raw = forceRefresh ? null : readCookie('XSRF-TOKEN')
  if (raw === null) {
    await fetchCsrfCookie()
    raw = readCookie('XSRF-TOKEN')
  }
  if (raw === null) {
    throw new ApiError(419, defaultMessage(419))
  }
  return decodeURIComponent(raw)
}

async function toApiError(response: Response): Promise<ApiError> {
  let payload: unknown = null
  try {
    payload = await response.json()
  } catch {
    // Kein JSON-Body – Standardmeldung verwenden.
  }

  let message: string | undefined
  let errors: ValidationErrors | undefined
  let code: string | undefined

  if (typeof payload === 'object' && payload !== null) {
    const record = payload as Record<string, unknown>
    if (typeof record['message'] === 'string' && record['message'] !== '') {
      message = record['message']
    }
    if (typeof record['code'] === 'string') {
      code = record['code']
    }
    if (typeof record['errors'] === 'object' && record['errors'] !== null) {
      errors = record['errors'] as ValidationErrors
    }
  }

  return new ApiError(
    response.status,
    message ?? defaultMessage(response.status),
    {
      errors,
      code,
    },
  )
}

interface RequestOptions {
  body?: unknown
  formData?: FormData
  signal?: AbortSignal
}

async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  options: RequestOptions = {},
  isRetry = false,
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }

  let body: BodyInit | undefined
  if (options.formData !== undefined) {
    body = options.formData
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(options.body)
  }

  if (method !== 'GET') {
    headers['X-XSRF-TOKEN'] = await csrfToken(isRetry)
  }

  const response = await fetch(path, {
    method,
    headers,
    body,
    credentials: 'include',
    signal: options.signal,
  })

  if (response.status === 419 && !isRetry) {
    return request<T>(method, path, options, true)
  }

  if (!response.ok) {
    throw await toApiError(response)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const text = await response.text()
  return (text === '' ? undefined : JSON.parse(text)) as T
}

export function get<T>(
  path: string,
  options: { signal?: AbortSignal } = {},
): Promise<T> {
  return request<T>('GET', path, options)
}

export function post<T>(
  path: string,
  body?: unknown,
  options: { signal?: AbortSignal } = {},
): Promise<T> {
  return request<T>('POST', path, { body, signal: options.signal })
}

export function put<T>(
  path: string,
  body?: unknown,
  options: { signal?: AbortSignal } = {},
): Promise<T> {
  return request<T>('PUT', path, { body, signal: options.signal })
}

export function del<T>(
  path: string,
  options: { signal?: AbortSignal } = {},
): Promise<T> {
  return request<T>('DELETE', path, options)
}

export function postMultipart<T>(
  path: string,
  formData: FormData,
  options: { signal?: AbortSignal } = {},
): Promise<T> {
  return request<T>('POST', path, { formData, signal: options.signal })
}
