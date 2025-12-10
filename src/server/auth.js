import {getServerSession} from 'next-auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL

/**
 * Request a magic link to be sent to the user's email
 * @param {string} email - User's email address
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function requestMagicLink(email) {
  const res = await fetch(`${API_URL}/auth/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({email})
  })

  return res.json()
}

/**
 * Fetch user info using session token
 * @param {string} token - Session token from magic link verification
 * @returns {Promise<{user: object, role: string, territoire: object}>}
 */
async function getInfo(token) {
  const res = await fetch(`${API_URL}/info`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
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

// Cache for authOptions to avoid re-importing on every call
let cachedAuthOptions = null

/**
 * Get auth options with dynamically imported CredentialsProvider
 * This handles ESM/CJS interop with next-auth v4
 */
export async function getAuthOptions() {
  if (cachedAuthOptions) {
    return cachedAuthOptions
  }

  const credentialsModule = await import('next-auth/providers/credentials')
  // Handle both ESM default export and CJS module.exports patterns
  const createCredentialsProvider = credentialsModule.default?.default
    || credentialsModule.default
    || credentialsModule

  cachedAuthOptions = {
    secret: process.env.NEXTAUTH_SECRET,
    session: {
      strategy: 'jwt'
    },
    callbacks: {
      async jwt({token, user}) {
        if (user) {
          token.token = user.token
          token.territoire = user.territoire
          token.role = user.role
          token.userInfo = user.userInfo
        }

        return token
      },
      async session({session, token}) {
        session.user.token = token.token
        session.user.territoire = token.territoire
        session.user.role = token.role
        if (token.userInfo) {
          session.user.nom = token.userInfo.nom
          session.user.prenom = token.userInfo.prenom
          session.user.email = token.userInfo.email
          session.user.structure = token.userInfo.structure
        }

        return session
      }
    },
    pages: {
      signIn: '/login'
    },
    providers: [
      createCredentialsProvider({
        name: 'Credentials',
        credentials: {
          // Token is passed from /auth/verify page after magic link verification
          token: {label: 'Token', type: 'text'}
        },
        async authorize(credentials) {
          try {
            const info = await getInfo(credentials.token)

            if (info) {
              return {
                id: info.user?._id || 'anonymous',
                token: credentials.token,
                territoire: info.territoire,
                role: info.role, // 'reader' or 'editor'
                userInfo: info.user || null
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

// Keep backward compatibility with static authOptions export
// This will be replaced at runtime with the async version
export const authOptions = {
  session: {strategy: 'jwt'},
  callbacks: {
    async jwt({token, user}) {
      if (user) {
        token.token = user.token
        token.territoire = user.territoire
        token.role = user.role
        token.userInfo = user.userInfo
      }

      return token
    },
    async session({session, token}) {
      session.user.token = token.token
      session.user.territoire = token.territoire
      session.user.role = token.role
      if (token.userInfo) {
        session.user.nom = token.userInfo.nom
        session.user.prenom = token.userInfo.prenom
        session.user.email = token.userInfo.email
        session.user.structure = token.userInfo.structure
      }

      return session
    }
  },
  pages: {signIn: '/login'},
  providers: [] // Will be populated dynamically
}

export async function getServerAuthSession() {
  const options = await getAuthOptions()
  return getServerSession(options)
}
