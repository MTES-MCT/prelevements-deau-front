import {withAuth} from 'next-auth/middleware'

const PUBLIC_PATHS = new Set(['/', '/login'])

function isPublicPath(pathname) {
  return PUBLIC_PATHS.has(pathname)
    || pathname.startsWith('/auth/')
}

export default withAuth({
  callbacks: {
    authorized({req, token}) {
      return isPublicPath(req.nextUrl.pathname) || Boolean(token)
    }
  },
  pages: {
    signIn: '/login'
  }
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|healthz|.*\\..*).*)']
}
