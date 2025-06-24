import {getServerSession} from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

const API_URL = process.env.NEXT_PUBLIC_API_URL

async function getInfo(token) {
  const res = await fetch(`${API_URL}/info`, {
    headers: {
      Authorization: `Token ${token}`
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

export const authOptions = {
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({token, user}) {
      if (user) {
        token.token = user.token
      }

      return token
    },
    async session({session, token}) {
      session.user.token = token.token
      return session
    }
  },
  pages: {
    signIn: '/login'
  },
  providers: [
    CredentialsProvider.default({
      name: 'Credentials',
      credentials: {
        password: {label: 'Password', type: 'password'}
      },
      async authorize(credentials) {
        const info = await getInfo(credentials.password)

        if (info) {
          return {
            ...info,
            token: credentials.password
          }
        }

        return null
      }
    })
  ]
}

export const getServerAuthSession = () => getServerSession(authOptions)
