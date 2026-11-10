import {randomUUID} from 'node:crypto'

import {getServerSession} from 'next-auth'

import {AUTH_METHODS} from '@/lib/auth-methods.js'
import {compactPreleveurProfiles} from '@/lib/preleveur-profiles.js'
import {getSignedAuditContextHeaders} from '@/server/audit-context.js'
import {getAuthConfig} from '@/server/auth-config.js'
import {cachePerRequest} from '@/server/request-cache.js'

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL
const IS_DEV = process.env.NODE_ENV === 'development'
const INFO_REFRESH_INTERVAL_MS = 5 * 60 * 1000
const INFO_RETRY_INTERVAL_MS = 30 * 1000
const INFO_REQUEST_TIMEOUT_MS = 10 * 1000

class SessionInfoUnavailableError extends Error {}

function getSessionDeadline(token) {
  const deadlines = []

  if (token.apiExpiresAt) {
    deadlines.push(Date.parse(token.apiExpiresAt))
  }

  if (token.exp !== undefined) {
    deadlines.push(Number(token.exp) * 1000)
  }

  if (deadlines.some(deadline => !Number.isFinite(deadline))) {
    return 0
  }

  return deadlines.length > 0 ? Math.min(...deadlines) : null
}

function compactSessionUserInfo(userInfo) {
  if (!userInfo) {
    return null
  }

  return {
    id: userInfo.id,
    email: userInfo.email,
    firstName: userInfo.firstName,
    lastName: userInfo.lastName,
    structure: userInfo.structure,
    declarantType: userInfo.declarantType,
    declarantRole: userInfo.declarantRole,
    socialReason: userInfo.socialReason,
    siret: userInfo.siret
  }
}

// Session configuration shared between async and static exports
const SESSION_CONFIG = {
  strategy: 'jwt',
  maxAge: 30 * 24 * 60 * 60 // 30 days in seconds
}

// Session callbacks shared between async and static exports
const SESSION_CALLBACKS = {
  async jwt({
    token, user, trigger, session
  }) {
    // Detailed assignments can make the encrypted NextAuth cookie exceed browser
    // header limits. Zone-scoped rights are returned by the relevant API routes.
    delete token.zoneAssignments
    token.userInfo = compactSessionUserInfo(token.userInfo)
    token.preleveurProfiles = compactPreleveurProfiles(token.preleveurProfiles)

    if (user) {
      token.token = user.token
      token.apiExpiresAt = user.expiresAt || null
      token.role = user.role
      token.userInfo = compactSessionUserInfo(user.userInfo)
      token.permissions = user.permissions || []
      token.impersonation = user.impersonation || null
      token.preleveurProfiles = compactPreleveurProfiles(user.preleveurProfiles)
      token.infoRefreshedAt = Date.now()
      delete token.infoRetryAt
    }

    const authToken = (trigger === 'update' && session?.token) || token.token
    const isExistingCredential = authToken === token.token
    const deadline = getSessionDeadline(token)

    if (!user && isExistingCredential && deadline !== null && deadline <= Date.now()) {
      throw new Error('CredentialsSignin')
    }

    const shouldRefreshInfo = !user && authToken && (
      trigger === 'update'
      || ((!token.infoRetryAt || Date.now() >= token.infoRetryAt) && (
        !token.infoRefreshedAt
        || Date.now() - token.infoRefreshedAt >= INFO_REFRESH_INTERVAL_MS
      ))
    )

    if (shouldRefreshInfo) {
      let info

      try {
        info = await getInfo(authToken)
      } catch (error) {
        // A failed availability check must not erase a valid session. Never
        // install an unverified replacement credential or extend its lifetime.
        if (!(error instanceof SessionInfoUnavailableError)
          || !isExistingCredential
          || !token.userInfo?.id
          || !token.role
          || deadline === null
          || deadline <= Date.now()) {
          throw error
        }

        // NextAuth renews JWT exp when writing the cookie. Freeze a legacy
        // cookie's original deadline before that renewal can extend fallback.
        if (!token.apiExpiresAt) {
          token.apiExpiresAt = new Date(deadline).toISOString()
        }

        token.infoRetryAt = Date.now() + INFO_RETRY_INTERVAL_MS
        return token
      }

      token.token = authToken
      token.apiExpiresAt = info.expiresAt || token.apiExpiresAt || null
      token.role = info.role
      token.userInfo = compactSessionUserInfo(info.user)
      token.permissions = info.permissions || []
      token.impersonation = info.impersonation || null
      token.preleveurProfiles = compactPreleveurProfiles(info.preleveurProfiles)
      token.infoRefreshedAt = Date.now()
      delete token.infoRetryAt
    }

    return token
  },
  async session({session, token}) {
    session.user.token = token.token
    // getServerSession removes session.expires for App Router callers.
    session.user.apiExpiresAt = token.apiExpiresAt || null
    session.user.role = token.role
    session.user.permissions = token.permissions || []
    session.user.impersonation = token.impersonation || null
    session.user.preleveurProfiles = compactPreleveurProfiles(token.preleveurProfiles)
    if (token.apiExpiresAt) {
      session.expires = token.apiExpiresAt
    }

    if (token.userInfo) {
      session.user.id = token.userInfo.id || token.sub || 'anonymous'
      session.user.lastName = token.userInfo.lastName
      session.user.firstName = token.userInfo.firstName
      session.user.email = token.userInfo.email
      session.user.structure = token.userInfo.structure
      session.user.declarantType = token.userInfo.declarantType
      session.user.declarantRole = token.userInfo.declarantRole
      session.user.socialReason = token.userInfo.socialReason
      session.user.siret = token.userInfo.siret
    }

    return session
  }
}

/**
 * Request a magic link to be sent to the user's email
 * @param {string} email - User's email address
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function requestMagicLink(email) {
  const body = {email}
  const requestId = randomUUID()

  // In dev mode, send prefixUrl so the magic link points to localhost
  // This allows using prod backend with local frontend
  if (IS_DEV && process.env.NEXT_PUBLIC_FRONTEND_URL) {
    body.prefixUrl = process.env.NEXT_PUBLIC_FRONTEND_URL
  }

  const res = await fetch(`${API_URL}/auth/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Request-Id': requestId,
      ...await getSignedAuditContextHeaders(requestId)
    },
    body: JSON.stringify(body)
  })

  return res.json()
}

async function getInfo(token) {
  let res

  try {
    res = await fetch(`${API_URL}/info`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      cache: 'no-store',
      mode: 'cors',
      signal: AbortSignal.timeout(INFO_REQUEST_TIMEOUT_MS)
    })
  } catch {
    throw new SessionInfoUnavailableError('Session verification unavailable')
  }

  if (res.status === 401 || res.status === 403) {
    throw new Error('CredentialsSignin')
  }

  if (res.status >= 500 || res.status === 429) {
    throw new SessionInfoUnavailableError('Session verification unavailable')
  }

  if (!res.ok) {
    throw new Error('Default')
  }

  let info

  try {
    info = await res.json()
  } catch {
    throw new SessionInfoUnavailableError('Session verification unavailable')
  }

  if (!info?.user?.id || !['ADMIN', 'INSTRUCTOR', 'DECLARANT'].includes(info.role)) {
    throw new SessionInfoUnavailableError('Invalid session verification response')
  }

  if (info.expiresAt && !(Date.parse(info.expiresAt) > Date.now())) {
    throw new Error('CredentialsSignin')
  }

  return info
}

// /login must check the API, not just a cached cookie, before redirecting to a
// protected page. An unavailable check must not be mistaken for a revoked login.
export async function getLoginSessionState(session) {
  if (!session?.user?.token) {
    return {status: 'unauthenticated'}
  }

  const expiresAt = session.user.apiExpiresAt || session.expires

  if (expiresAt && !(Date.parse(expiresAt) > Date.now())) {
    return {status: 'unauthenticated'}
  }

  try {
    const info = await getInfo(session.user.token)
    return {
      status: 'authenticated',
      preleveurProfiles: compactPreleveurProfiles(info.preleveurProfiles)
    }
  } catch (error) {
    return {status: error.message === 'CredentialsSignin' ? 'unauthenticated' : 'unavailable'}
  }
}

async function postPublicAuth(path, body) {
  const requestId = randomUUID()
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Request-Id': requestId,
      ...await getSignedAuditContextHeaders(requestId)
    },
    body: JSON.stringify(body),
    cache: 'no-store'
  })

  let data = null

  try {
    data = await response.json()
  } catch {
    // Authentication errors deliberately remain generic.
  }

  if (!response.ok || !data?.token) {
    throw new Error('CredentialsSignin')
  }

  return data
}

export function authenticateWithPassword(email, password) {
  return postPublicAuth('/auth/password', {email, password})
}

async function buildSessionUser(token) {
  const info = await getInfo(token)

  if (!info) {
    return null
  }

  return {
    id: info.user?.id || 'anonymous',
    token,
    expiresAt: info.expiresAt || null,
    role: info.role,
    userInfo: info.user || null,
    permissions: info.permissions || [],
    impersonation: info.impersonation || null,
    preleveurProfiles: compactPreleveurProfiles(info.preleveurProfiles)
  }
}

function createSessionTokenProvider(createCredentialsProvider) {
  return createCredentialsProvider({
    id: 'credentials',
    name: 'Token de session',
    credentials: {
      token: {label: 'Token', type: 'text'}
    },
    async authorize(credentials) {
      try {
        return await buildSessionUser(credentials?.token)
      } catch {
        return null
      }
    }
  })
}

function createPasswordProvider(createCredentialsProvider) {
  return createCredentialsProvider({
    id: AUTH_METHODS.PASSWORD,
    name: 'Mot de passe',
    credentials: {
      email: {label: 'Adresse email', type: 'email'},
      password: {label: 'Mot de passe', type: 'password'}
    },
    async authorize(credentials) {
      const email = credentials?.email
      const password = credentials?.password

      if (credentials) {
        delete credentials.password
      }

      if (!email || !password) {
        return null
      }

      try {
        const result = await authenticateWithPassword(email, password)
        return await buildSessionUser(result.token)
      } catch {
        return null
      }
    }
  })
}

function buildProviders(methods, createCredentialsProvider) {
  const methodProviders = methods.flatMap(method => {
    if (method === AUTH_METHODS.PASSWORD) {
      return [createPasswordProvider(createCredentialsProvider)]
    }

    return []
  })

  return [createSessionTokenProvider(createCredentialsProvider), ...methodProviders]
}

let cachedAuthOptions = null
let cachedUnavailableAuthOptions = null

export async function getAuthOptions({allowUnavailableConfig = false} = {}) {
  if (allowUnavailableConfig && cachedUnavailableAuthOptions) {
    return cachedUnavailableAuthOptions
  }

  if (!allowUnavailableConfig && cachedAuthOptions) {
    return cachedAuthOptions
  }

  const credentialsModule = await import('next-auth/providers/credentials')
  const createCredentialsProvider = credentialsModule.default?.default
    || credentialsModule.default
    || credentialsModule

  let authConfig

  try {
    authConfig = await getAuthConfig()
  } catch (error) {
    if (!allowUnavailableConfig) {
      throw error
    }

    authConfig = {methods: []}
  }

  const options = {
    secret: process.env.NEXTAUTH_SECRET,
    session: SESSION_CONFIG,
    cookies: {
      sessionToken: {
        name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`,
        options: {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          secure: process.env.NODE_ENV === 'production'
        }
      }
    },
    callbacks: SESSION_CALLBACKS,
    pages: {
      signIn: '/login'
    },
    providers: buildProviders(authConfig.methods, createCredentialsProvider)
  }

  if (allowUnavailableConfig) {
    cachedUnavailableAuthOptions = options
  } else {
    cachedAuthOptions = options
  }

  return options
}

export const authOptions = {
  session: SESSION_CONFIG,
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  },
  callbacks: SESSION_CALLBACKS,
  pages: {signIn: '/login'},
  providers: []
}

const getCachedServerAuthSession = cachePerRequest(async () => {
  const options = await getAuthOptions({allowUnavailableConfig: true})
  return getServerSession(options)
})

export async function getServerAuthSession() {
  return getCachedServerAuthSession()
}
