'use client'

import {
  createContext,
  useContext,
  useMemo,
  useCallback,
  useState
} from 'react'

import {useSession, signIn, signOut} from 'next-auth/react'

import {
  logoutAction,
  selectPreleveurProfileAction,
  startImpersonationAction,
  stopImpersonationAction
} from '@/server/actions/auth.js'

const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isLoggingOut: false,
  async login() {},
  async loginWithPassword() {},
  async logout() {},
  async refreshUser() {},
  async selectPreleveurProfile() {},
  async startImpersonation() {},
  async stopImpersonation() {}
})

export const AuthProvider = ({children}) => {
  const {data: session, status, update} = useSession()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

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
      impersonation: session.user.impersonation || null,
      preleveurProfiles: session.user.preleveurProfiles || null
    }
  }, [session])

  const login = useCallback(async sessionToken => {
    try {
      const result = await signIn('credentials', {
        token: sessionToken,
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

  const loginWithPassword = useCallback(async (email, password) => {
    try {
      const result = await signIn('password', {
        email,
        password,
        redirect: false,
        callbackUrl: '/'
      })

      if (!result?.ok || result.error) {
        return {success: false, error: 'INVALID_CREDENTIALS'}
      }

      return {success: true}
    } catch {
      return {success: false, error: 'INVALID_CREDENTIALS'}
    }
  }, [])

  const logout = useCallback(async () => {
    setIsLoggingOut(true)
    if (session?.user?.token) {
      try {
        await logoutAction()
      } catch (error) {
        console.error('Backend logout failed:', error)
      }
    }

    try {
      await signOut({redirect: false, callbackUrl: '/login'})
      window.location.assign('/login')
    } catch (error) {
      setIsLoggingOut(false)
      throw error
    }
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

  const selectPreleveurProfile = useCallback(async preleveurId => {
    const result = await selectPreleveurProfileAction(preleveurId)
    if (!result.success) return result
    if (!result.data?.token) {
      return {success: false, reconnect: true, error: 'La nouvelle session n’a pas pu être récupérée. Veuillez vous reconnecter.'}
    }

    // The API revoked the previous session. Install and verify the replacement
    // before leaving the chooser; never navigate with the former identity.
    try {
      const nextSession = await update({token: result.data.token})
      if (nextSession?.user?.token === result.data.token
        && !nextSession.user.preleveurProfiles?.selectionRequired) {
        return {success: true}
      }
    } catch {
      // A failed cookie refresh requires a new login, not a second selection.
    }

    return {success: false, reconnect: true, error: 'Le préleveur a été sélectionné, mais votre session n’a pas pu être actualisée. Veuillez vous reconnecter.'}
  }, [update])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(session?.user),
      isLoading: status === 'loading',
      isLoggingOut,
      login,
      loginWithPassword,
      logout,
      refreshUser,
      selectPreleveurProfile,
      startImpersonation,
      stopImpersonation
    }),
    [user, session, status, isLoggingOut, login, loginWithPassword, logout, refreshUser, selectPreleveurProfile, startImpersonation, stopImpersonation]
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
