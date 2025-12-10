'use client'

import {SessionProvider} from 'next-auth/react'

/**
 * SessionProvider wrapper for Next.js App Router
 * This needs to be a separate client component
 */
const NextAuthSessionProvider = ({children}) => (
  <SessionProvider>{children}</SessionProvider>
)

export default NextAuthSessionProvider
