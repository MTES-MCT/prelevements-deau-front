import {withAuth} from 'next-auth/middleware'

const PUBLIC_PATHS = new Set(['/', '/activation-mot-de-passe', '/login'])

function isPublicPath(pathname) {
  return PUBLIC_PATHS.has(pathname)
    || pathname.startsWith('/auth/')
}

export default withAuth({
  callbacks: {
    authorized({req, token}) {
      if (isPublicPath(req.nextUrl.pathname)) {
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
