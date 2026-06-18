import {getServerSession} from 'next-auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL
const IS_DEV = process.env.NODE_ENV === 'development'

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
    if (user) {
      token.token = user.token
      token.role = user.role
      token.userInfo = user.userInfo
      token.impersonation = user.impersonation || null
    }

    if (trigger === 'update' && session?.token) {
      const info = await getInfo(session.token)
      token.token = session.token
      token.role = info.role
      token.userInfo = info.user || null
      token.impersonation = info.impersonation || null
    }

    return token
  },
  async session({session, token}) {
    session.user.token = token.token
    session.user.role = token.role
    session.user.impersonation = token.impersonation || null
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

  // In dev mode, send prefixUrl so the magic link points to localhost
  // This allows using prod backend with local frontend
  if (IS_DEV && process.env.NEXT_PUBLIC_FRONTEND_URL) {
    body.prefixUrl = process.env.NEXT_PUBLIC_FRONTEND_URL
  }

  const res = await fetch(`${API_URL}/auth/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
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

let cachedAuthOptions = null

export async function getAuthOptions() {
  if (cachedAuthOptions) {
    return cachedAuthOptions
  }

  const credentialsModule = await import('next-auth/providers/credentials')
  const createCredentialsProvider = credentialsModule.default?.default
    || credentialsModule.default
    || credentialsModule

  cachedAuthOptions = {
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
    providers: [
      createCredentialsProvider({
        name: 'Credentials',
        credentials: {
          token: {label: 'Token', type: 'text'}
        },
        async authorize(credentials) {
          try {
            const info = await getInfo(credentials.token)

            if (info) {
              return {
                id: info.user?.id || 'anonymous',
                token: credentials.token,
                role: info.role,
                userInfo: info.user || null,
                impersonation: info.impersonation || null
              }
            }
          } catch {
            return null
          }

          return null
        }
      })
    ]
  }

  return cachedAuthOptions
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

export async function getServerAuthSession() {
  const options = await getAuthOptions()
  return getServerSession(options)
}
