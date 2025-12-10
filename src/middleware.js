import {NextResponse} from 'next/server'
import {withAuth} from 'next-auth/middleware'

// Routes that require editor role (create/edit/delete operations)
const editorOnlyPatterns = [
  /^\/points-prelevement\/new$/,
  /^\/points-prelevement\/[^/]+\/edit$/,
  /^\/preleveurs\/new$/,
  /^\/preleveurs\/[^/]+\/edit$/,
  /^\/preleveurs\/[^/]+\/documents\/new$/,
  /^\/preleveurs\/[^/]+\/regles\/new$/,
  /^\/exploitations\/new$/,
  /^\/exploitations\/[^/]+\/edit$/
]

/**
 * Check if path matches any pattern in the list
 */
function matchesPattern(pathname, patterns) {
  return patterns.some(pattern => pattern.test(pathname))
}

export default withAuth(
  request => {
    const {pathname} = request.nextUrl
    const {token} = request.nextauth

    // Check if this route requires editor role
    const requiresEditor = matchesPattern(pathname, editorOnlyPatterns)

    if (requiresEditor && token?.role !== 'editor') {
      // User is authenticated but doesn't have editor permission
      const url = new URL('/auth/error', request.url)
      url.searchParams.set('reason', 'insufficient_permissions')
      return NextResponse.redirect(url)
    }

    // Check if user has at least reader role
    if (!token?.role || (token.role !== 'reader' && token.role !== 'editor')) {
      const url = new URL('/login', request.url)
      url.searchParams.set('error', 'invalid_session')
      return NextResponse.redirect(url)
    }

    return NextResponse.next()
  },
  {
    secret: process.env.NEXTAUTH_SECRET,
    callbacks: {
      authorized: ({token}) => Boolean(token)
    },
    pages: {
      signIn: '/login',
      error: '/auth/error'
    }
  }
)

export const config = {
  matcher: [
    '/dossiers/:path*',
    '/points-prelevement/:path*',
    '/preleveurs/:path*',
    '/exploitations/:path*',
    '/statistiques'
  ]
}
