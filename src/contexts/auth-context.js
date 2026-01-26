'use client'

import {
  createContext,
  useContext,
  useMemo,
  useCallback
} from 'react'

import {useSession, signIn, signOut} from 'next-auth/react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL

const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  async login() {},
  async logout() {},
  async refreshUser() {}
})

export const AuthProvider = ({children}) => {
  const {data: session, status, update} = useSession()

  /**
   * Build user object from NextAuth session
   */
  const user = useMemo(() => {
    if (!session?.user) {
      return null
    }

    return {
      id: session.user.id || 'anonymous',
      nom: session.user.firstName || null,
      prenom: session.user.lastName || null,
      email: session.user.email || null,
      structure: session.user.structure || null,
      role: session.user.role
    }
  }, [session])

  /**
   * Login with magic link token
   * Uses NextAuth signIn with credentials provider
   * @param {string} magicLinkToken - Token from magic link URL
   */
  const login = useCallback(async magicLinkToken => {
    try {
      const result = await signIn('credentials', {
        token: magicLinkToken,
        redirect: false,
        callbackUrl: '/'
      })

      if (result?.error) {
        return {success: false, error: result.error}
      }

      return {success: true}
    } catch (error) {
      console.error('[Auth] signIn error:', error)
      return {success: false, error: error.message}
    }
  }, [])

  /**
   * Logout and clear session
   */
  const logout = useCallback(async () => {
    // Optionally call backend logout endpoint
    if (session?.user?.token) {
      try {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.user.token}`
          }
        })
      } catch (error) {
        console.error('Backend logout failed:', error)
      }
    }

    await signOut({callbackUrl: '/login'})
  }, [session])

  /**
   * Refresh session data
   */
  const refreshUser = useCallback(async () => {
    await update()
  }, [update])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(session?.user),
      isLoading: status === 'loading',
      login,
      logout,
      refreshUser
    }),
    [user, session, status, login, logout, refreshUser]
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
