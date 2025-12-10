'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback
} from 'react'

import {
  getToken,
  getUser,
  setAuth,
  clearAuth
} from '@/lib/auth.js'

const API_URL = process.env.NEXT_PUBLIC_API_URL

const AuthContext = createContext({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  async login() {},
  async logout() {},
  async refreshUser() {}
})

/**
 * Fetch user info from backend using token
 * @param {string} authToken - Session token
 * @returns {Promise<object>} User info with role and territoire
 */
async function fetchUserInfo(authToken) {
  const response = await fetch(`${API_URL}/info`, {
    headers: {
      Authorization: `Bearer ${authToken}`
    }
  })

  if (!response.ok) {
    throw new Error('Failed to fetch user info')
  }

  const data = await response.json()

  return {
    id: data.user?._id || 'anonymous',
    nom: data.user?.nom || null,
    prenom: data.user?.prenom || null,
    email: data.user?.email || null,
    structure: data.user?.structure || null,
    role: data.role, // 'reader' or 'editor'
    territoire: data.territoire
  }
}

export const AuthProvider = ({children}) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  /**
   * Initialize auth state from localStorage on mount
   */
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = getToken()
      const storedUser = getUser()

      if (storedToken && storedUser) {
        // Validate token by calling /info
        try {
          const freshUser = await fetchUserInfo(storedToken)
          setToken(storedToken)
          setUser(freshUser)
          setAuth(storedToken, freshUser) // Update localStorage with fresh data
        } catch {
          // Token invalid, clear auth
          clearAuth()
        }
      }

      setIsLoading(false)
    }

    initAuth()
  }, [])

  /**
   * Login with session token from magic link
   */
  const login = useCallback(async sessionToken => {
    try {
      const userInfo = await fetchUserInfo(sessionToken)
      setAuth(sessionToken, userInfo)
      setToken(sessionToken)
      setUser(userInfo)
      return {success: true}
    } catch (error) {
      clearAuth()
      return {success: false, error: error.message}
    }
  }, [])

  /**
   * Logout and clear auth data
   */
  const logout = useCallback(async () => {
    const currentToken = getToken()

    // Call backend logout endpoint if token exists
    if (currentToken) {
      try {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${currentToken}`
          }
        })
      } catch (error) {
        console.error('Error during logout:', error)
      }
    }

    clearAuth()
    setToken(null)
    setUser(null)
  }, [])

  /**
   * Refresh user info from backend
   */
  const refreshUser = useCallback(async () => {
    const currentToken = getToken()
    if (!currentToken) {
      return
    }

    try {
      const freshUser = await fetchUserInfo(currentToken)
      setUser(freshUser)
      setAuth(currentToken, freshUser)
    } catch {
      // Token invalid, clear auth
      clearAuth()
      setToken(null)
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      isLoading,
      login,
      logout,
      refreshUser
    }),
    [user, token, isLoading, login, logout, refreshUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
