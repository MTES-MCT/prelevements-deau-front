import {randomUUID} from 'node:crypto'

import {getServerSession} from 'next-auth'

import {AUTH_METHODS} from '@/lib/auth-methods.js'
import {getSignedAuditContextHeaders} from '@/server/audit-context.js'
import {getAuthConfig} from '@/server/auth-config.js'
import {cachePerRequest} from '@/server/request-cache.js'

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL
const IS_DEV = process.env.NODE_ENV === 'development'
const INFO_REFRESH_INTERVAL_MS = 5 * 60 * 1000

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
    socialReason: userInfo.socialReason
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

    if (user) {
      token.token = user.token
      token.apiExpiresAt = user.expiresAt || null
      token.role = user.role
      token.userInfo = compactSessionUserInfo(user.userInfo)
      token.permissions = user.permissions || []
      token.impersonation = user.impersonation || null
      token.infoRefreshedAt = Date.now()
    }

    const authToken = session?.token || token.token
    const shouldRefreshInfo = !user && authToken && (
      trigger === 'update'
      || !token.infoRefreshedAt
      || Date.now() - token.infoRefreshedAt >= INFO_REFRESH_INTERVAL_MS
    )

    if (shouldRefreshInfo) {
      const info = await getInfo(authToken)
      token.token = authToken
      token.apiExpiresAt = info.expiresAt || token.apiExpiresAt || null
      token.role = info.role
      token.userInfo = compactSessionUserInfo(info.user)
      token.permissions = info.permissions || []
      token.impersonation = info.impersonation || null
      token.infoRefreshedAt = Date.now()
    }

    return token
  },
  async session({session, token}) {
    session.user.token = token.token
    session.user.role = token.role
    session.user.permissions = token.permissions || []
    session.user.impersonation = token.impersonation || null
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
  const res = await fetch(`${API_URL}/info`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    cache: 'no-store',
    mode: 'cors'
  })

  if (res.status === 401 || res.status === 403) {
    throw new Error('CredentialsSignin')
  }

  if (!res.ok) {
    throw new Error('Default')
  }

  return res.json()
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
    impersonation: info.impersonation || null
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
