import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { api, setAuthToken } from '@/lib/api'

const AuthContext = createContext(null)

const STORAGE_KEY = 'eventhub_token'

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => localStorage.getItem(STORAGE_KEY))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(STORAGE_KEY)))

  const setToken = useCallback((value) => {
    setTokenState(value)
    if (value) {
      localStorage.setItem(STORAGE_KEY, value)
      setAuthToken(value)
      setUser(null)
    } else {
      localStorage.removeItem(STORAGE_KEY)
      setAuthToken(null)
      setUser(null)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setAuthToken(token)
  }, [token])

  // Automatically clear session on any 401 response (expired/revoked token)
  useEffect(() => {
    const id = api.interceptors.response.use(
      (r) => r,
      (err) => {
        if (err.response?.status === 401) {
          setToken(null)
        }
        return Promise.reject(err)
      },
    )
    return () => api.interceptors.response.eject(id)
  }, [setToken])

  useEffect(() => {
    if (!token) {
      return undefined
    }

    let cancelled = false
    setLoading(true)

    api
      .get('/auth/me')
      .then((res) => {
        if (!cancelled) {
          setUser(res.data)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setToken(null)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [token, setToken])

  const login = useCallback(
    async (email, password) => {
      const { data } = await api.post('/auth/login', { email, password })
      setToken(data.token)
      return data.user
    },
    [setToken],
  )

  const register = useCallback(
    async (payload) => {
      const { data } = await api.post('/auth/register', payload)
      setToken(data.token)
      return data.user
    },
    [setToken],
  )

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // ignore
    }
    setToken(null)
  }, [setToken])

  const value = useMemo(
    () => ({
      token,
      user,
      setUser,
      loading,
      login,
      register,
      logout,
      isAuthenticated: !!user,
    }),
    [token, user, setUser, loading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
