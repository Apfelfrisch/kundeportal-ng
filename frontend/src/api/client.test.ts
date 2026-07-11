import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError, del, get, post } from './client'

function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function clearXsrfCookie(): void {
  document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
}

interface RecordedCall {
  url: string
  init: RequestInit
}

let fetchMock: ReturnType<typeof vi.fn>

function recordedCalls(): Array<RecordedCall> {
  return fetchMock.mock.calls.map((call) => ({
    url: String(call[0]),
    init: (call[1] ?? {}) as RequestInit,
  }))
}

beforeEach(() => {
  clearXsrfCookie()
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  clearXsrfCookie()
})

describe('get', () => {
  it('parses JSON and sends credentials without CSRF header', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { data: { id: 1 } }))

    const result = await get<{ data: { id: number } }>('/api/tenant')

    expect(result).toEqual({ data: { id: 1 } })
    const [call] = recordedCalls()
    expect(call?.url).toBe('/api/tenant')
    expect(call?.init.credentials).toBe('include')
    const headers = call?.init.headers as Record<string, string>
    expect(headers['Accept']).toBe('application/json')
    expect(headers['X-XSRF-TOKEN']).toBeUndefined()
  })

  it('throws ApiError with the German default message for unexpected errors', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }))

    await expect(get('/api/tenant')).rejects.toMatchObject({
      status: 500,
      message:
        'Es ist ein unerwarteter Fehler aufgetreten. Bitte versuche es später erneut.',
    })
  })
})

describe('post', () => {
  it('bootstraps the CSRF cookie before the first non-GET request', async () => {
    fetchMock.mockImplementation((url: RequestInfo | URL) => {
      if (String(url) === '/sanctum/csrf-cookie') {
        document.cookie = 'XSRF-TOKEN=token%3D%3D'
        return Promise.resolve(new Response(null, { status: 204 }))
      }
      return Promise.resolve(jsonResponse(200, { data: { ok: true } }))
    })

    const result = await post<{ data: { ok: boolean } }>('/api/auth/login', {
      email: 'a@b.de',
      password: 'geheim',
    })

    expect(result).toEqual({ data: { ok: true } })
    const calls = recordedCalls()
    expect(calls.map((call) => call.url)).toEqual([
      '/sanctum/csrf-cookie',
      '/api/auth/login',
    ])
    const headers = calls[1]?.init.headers as Record<string, string>
    // Cookie-Wert URL-dekodiert im Header
    expect(headers['X-XSRF-TOKEN']).toBe('token==')
    expect(headers['Content-Type']).toBe('application/json')
    expect(calls[1]?.init.body).toBe(
      JSON.stringify({ email: 'a@b.de', password: 'geheim' }),
    )
  })

  it('skips the CSRF bootstrap when the cookie is already present', async () => {
    document.cookie = 'XSRF-TOKEN=vorhanden'
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { data: null }))

    await post('/api/auth/logout')

    const calls = recordedCalls()
    expect(calls).toHaveLength(1)
    expect(calls[0]?.url).toBe('/api/auth/logout')
    const headers = calls[0]?.init.headers as Record<string, string>
    expect(headers['X-XSRF-TOKEN']).toBe('vorhanden')
  })

  it('refreshes the CSRF cookie and retries exactly once on 419', async () => {
    document.cookie = 'XSRF-TOKEN=abgelaufen'
    fetchMock.mockImplementation((url: RequestInfo | URL) => {
      if (String(url) === '/sanctum/csrf-cookie') {
        document.cookie = 'XSRF-TOKEN=frisch'
        return Promise.resolve(new Response(null, { status: 204 }))
      }
      const isRetry = document.cookie.includes('frisch')
      return Promise.resolve(
        isRetry ? jsonResponse(200, { data: 'ok' }) : jsonResponse(419, {}),
      )
    })

    const result = await post<{ data: string }>('/api/auth/login', {})

    expect(result).toEqual({ data: 'ok' })
    const calls = recordedCalls()
    expect(calls.map((call) => call.url)).toEqual([
      '/api/auth/login',
      '/sanctum/csrf-cookie',
      '/api/auth/login',
    ])
    const retryHeaders = calls[2]?.init.headers as Record<string, string>
    expect(retryHeaders['X-XSRF-TOKEN']).toBe('frisch')
  })

  it('throws after the second 419 instead of retrying forever', async () => {
    document.cookie = 'XSRF-TOKEN=kaputt'
    fetchMock.mockImplementation((url: RequestInfo | URL) => {
      if (String(url) === '/sanctum/csrf-cookie') {
        document.cookie = 'XSRF-TOKEN=kaputt2'
        return Promise.resolve(new Response(null, { status: 204 }))
      }
      return Promise.resolve(jsonResponse(419, {}))
    })

    await expect(post('/api/auth/login', {})).rejects.toMatchObject({
      status: 419,
    })
    expect(recordedCalls().map((call) => call.url)).toEqual([
      '/api/auth/login',
      '/sanctum/csrf-cookie',
      '/api/auth/login',
    ])
  })

  it('maps 422 responses to ApiError with message and field errors', async () => {
    document.cookie = 'XSRF-TOKEN=vorhanden'
    fetchMock.mockResolvedValueOnce(
      jsonResponse(422, {
        message: 'Diese Zugangsdaten stimmen nicht mit unseren Daten überein.',
        errors: {
          email: [
            'Diese Zugangsdaten stimmen nicht mit unseren Daten überein.',
          ],
        },
      }),
    )

    const error = await post('/api/auth/login', {}).catch(
      (caught: unknown) => caught,
    )

    expect(error).toBeInstanceOf(ApiError)
    const apiError = error as ApiError
    expect(apiError.status).toBe(422)
    expect(apiError.isValidationError).toBe(true)
    expect(apiError.message).toBe(
      'Diese Zugangsdaten stimmen nicht mit unseren Daten überein.',
    )
    expect(apiError.errors).toEqual({
      email: ['Diese Zugangsdaten stimmen nicht mit unseren Daten überein.'],
    })
  })

  it('exposes structured error codes (409 password_not_set)', async () => {
    document.cookie = 'XSRF-TOKEN=vorhanden'
    fetchMock.mockResolvedValueOnce(
      jsonResponse(409, { code: 'password_not_set' }),
    )

    await expect(post('/api/irgendwas', {})).rejects.toMatchObject({
      status: 409,
      code: 'password_not_set',
    })
  })

  it('returns undefined for 204 responses', async () => {
    document.cookie = 'XSRF-TOKEN=vorhanden'
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

    await expect(post('/api/auth/logout')).resolves.toBeUndefined()
  })
})

describe('del', () => {
  it('sends the CSRF header on DELETE requests', async () => {
    document.cookie = 'XSRF-TOKEN=vorhanden'
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

    await del('/api/irgendwas/1')

    const [call] = recordedCalls()
    expect(call?.init.method).toBe('DELETE')
    const headers = call?.init.headers as Record<string, string>
    expect(headers['X-XSRF-TOKEN']).toBe('vorhanden')
  })
})
