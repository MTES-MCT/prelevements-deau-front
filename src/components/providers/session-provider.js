'use client'

import {SessionProvider} from 'next-auth/react'

// NextAuth basePath - must match the route location
const NEXTAUTH_BASEPATH = '/auth/nextauth'

/**
 * SessionProvider wrapper for Next.js App Router
 * This needs to be a separate client component
 * basePath is set to avoid conflict with backend /api/auth routes
 */
const NextAuthSessionProvider = ({children}) => (
  <SessionProvider basePath={NEXTAUTH_BASEPATH}>{children}</SessionProvider>
)

export default NextAuthSessionProvider
