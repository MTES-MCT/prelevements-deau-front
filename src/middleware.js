import {withAuth} from 'next-auth/middleware'

import {isMiddlewarePublicPath} from './lib/public-paths.js'

export default withAuth({
  callbacks: {
    authorized({req, token}) {
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
