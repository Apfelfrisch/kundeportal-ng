import { useQueryClient } from '@tanstack/react-query'
import Constants from 'expo-constants'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'

import { api, setAuthToken, setUnauthenticatedHandler } from '@/api/client'
import { contractStorage, tokenStorage } from '@/api/storage'
import type { ApiResponse, TokenResponse, User } from '@/api/types'

/**
 * Anmeldezustand der App: Bearer-Token im sicheren Gerätespeicher, beim
 * Start über `GET /api/auth/session` geprüft. Eine 401-Antwort irgendeines
 * Requests meldet ab.
 */

type AuthState =
  | { status: 'loading'; user: null }
  | { status: 'guest'; user: null }
  | { status: 'authenticated'; user: User }

interface AuthContextValue {
  state: AuthState
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null })

  const clearSession = useCallback(async () => {
    setAuthToken(null)
    await tokenStorage.save(null)
    await contractStorage.save(null)
    queryClient.clear()
    setState({ status: 'guest', user: null })
  }, [queryClient])

  useEffect(() => {
    let cancelled = false

    async function restore() {
      const token = await tokenStorage.load()
      if (token === null) {
        if (!cancelled) setState({ status: 'guest', user: null })
        return
      }
      setAuthToken(token)
      try {
        const session = await api<ApiResponse<User>>('auth/session', { silent401: true })
        if (!cancelled) setState({ status: 'authenticated', user: session.data })
      } catch {
        // Token abgelaufen/widerrufen oder offline: ohne Sitzung starten.
        if (!cancelled) await clearSession()
      }
    }

    void restore()
    return () => {
      cancelled = true
    }
  }, [clearSession])

  useEffect(() => {
    setUnauthenticatedHandler(() => {
      void clearSession()
    })
    return () => setUnauthenticatedHandler(null)
  }, [clearSession])

  const login = useCallback(async (email: string, password: string) => {
    const response = await api<TokenResponse>('auth/token', {
      method: 'POST',
      body: { email, password, device_name: Constants.deviceName ?? 'Mobile' },
      silent401: true,
    })
    setAuthToken(response.token)
    await tokenStorage.save(response.token)
    setState({ status: 'authenticated', user: response.data })
  }, [])

  const logout = useCallback(async () => {
    try {
      await api('auth/token', { method: 'DELETE', silent401: true })
    } catch {
      // Token serverseitig nicht mehr gültig – lokal trotzdem abmelden.
    }
    await clearSession()
  }, [clearSession])

  const refreshUser = useCallback(async () => {
    const session = await api<ApiResponse<User>>('auth/session')
    setState({ status: 'authenticated', user: session.data })
  }, [])

  const value = useMemo(() => ({ state, login, logout, refreshUser }), [state, login, logout, refreshUser])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === null) throw new Error('useAuth außerhalb des AuthProviders')
  return context
}

/** Nur innerhalb des angemeldeten Bereichs: der Benutzer ist garantiert da. */
export function useUser(): User {
  const { state } = useAuth()
  if (state.status !== 'authenticated') throw new Error('useUser ohne angemeldeten Benutzer')
  return state.user
}
