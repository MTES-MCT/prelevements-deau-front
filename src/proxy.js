import {withAuth} from 'next-auth/middleware'
import {NextResponse} from 'next/server'

import {getPreleveurSelectionRedirect} from './lib/preleveur-profiles.js'
import {isMiddlewarePublicPath} from './lib/public-paths.js'

export default withAuth(function proxy(req) {
  const destination = getPreleveurSelectionRedirect(req.nextUrl.pathname, req.nextauth.token?.preleveurProfiles)
  if (destination) return NextResponse.redirect(new URL(destination, req.url))
}, {
  // Match auth.js explicitly; NEXTAUTH_URL can use HTTP behind the TLS proxy.
  cookies: {
    sessionToken: {name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`}
  },
  callbacks: {
    authorized({req, token}) {
      // These read routes authenticate the server session and return JSON 401.
      if (req.nextUrl.pathname === '/api/aggregated-series'
        || req.nextUrl.pathname.startsWith('/api/dashboard/')) return true

      if (isMiddlewarePublicPath(req.nextUrl.pathname)) {
        return true
      }

      if (!token) {
        return false
      }

      return !token.apiExpiresAt || new Date(token.apiExpiresAt).getTime() > Date.now()
    }
  },
  pages: {
    signIn: '/login'
  }
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|healthz|.*\\..*).*)']
}
