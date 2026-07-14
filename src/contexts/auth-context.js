'use client'

import {
  createContext,
  useContext,
  useMemo,
  useCallback
} from 'react'

import {useSession, signIn, signOut} from 'next-auth/react'

import {
  startImpersonationAction,
  stopImpersonationAction
} from '@/server/actions/auth.js'

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL

const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  async login() {},
  async logout() {},
  async refreshUser() {},
  async startImpersonation() {},
  async stopImpersonation() {}
})

export const AuthProvider = ({children}) => {
  const {data: session, status, update} = useSession()

  const user = useMemo(() => {
    if (!session?.user) {
      return null
    }

    return {
      id: session.user.id || 'anonymous',
      firstName: session.user.firstName || null,
      lastName: session.user.lastName || null,
      email: session.user.email || null,
      structure: session.user.structure || null,
      role: session.user.role,
      declarantType: session.user.declarantType || null,
      declarantRole: session.user.declarantRole || null,
      socialReason: session.user.socialReason || null,
      permissions: session.user.permissions || [],
      impersonation: session.user.impersonation || null
    }
  }, [session])

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

  const logout = useCallback(async () => {
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

    await signOut({redirect: false, callbackUrl: '/login'})
    window.location.assign('/login')
  }, [session])

  const refreshUser = useCallback(async () => {
    await update()
  }, [update])

  const startImpersonation = useCallback(async userId => {
    const result = await startImpersonationAction(userId)

    if (!result.success || !result.data?.token) {
      return result
    }

    await update({token: result.data.token})

    return result
  }, [update])

  const stopImpersonation = useCallback(async () => {
    const result = await stopImpersonationAction()

    if (!result.success || !result.data?.token) {
      return result
    }

    await update({token: result.data.token})

    return result
  }, [update])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(session?.user),
      isLoading: status === 'loading',
      login,
      logout,
      refreshUser,
      startImpersonation,
      stopImpersonation
    }),
    [user, session, status, login, logout, refreshUser, startImpersonation, stopImpersonation]
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
