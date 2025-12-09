import {NextResponse} from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL

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

// Routes that require at least reader role (all protected routes)
const protectedPatterns = [
  /^\/dossiers/,
  /^\/points-prelevement/,
  /^\/preleveurs/,
  /^\/exploitations/,
  /^\/statistiques/
]

/**
 * Check if path matches any pattern in the list
 */
function matchesPattern(pathname, patterns) {
  return patterns.some(pattern => pattern.test(pathname))
}

/**
 * Validate token with backend and get user info
 * @param {string} token - Session token
 * @returns {Promise<{role: string, territoire: object}|null>}
 */
async function validateToken(token) {
  try {
    const response = await fetch(`${API_URL}/info`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return {
      role: data.role,
      territoire: data.territoire,
      user: data.user
    }
  } catch {
    return null
  }
}

export async function middleware(request) {
  const {pathname} = request.nextUrl

  // Check if this is a protected route
  const isProtected = matchesPattern(pathname, protectedPatterns)

  if (!isProtected) {
    return NextResponse.next()
  }

  // Get token from cookie (synced from localStorage by client)
  const token = request.cookies.get('auth_token')?.value

  // If no token, redirect to login
  if (!token) {
    const url = new URL('/login', request.url)
    url.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(url)
  }

  // Validate token with backend
  const authInfo = await validateToken(token)

  if (!authInfo) {
    // Token invalid, clear cookie and redirect to login
    const url = new URL('/login', request.url)
    url.searchParams.set('error', 'session_expired')
    const response = NextResponse.redirect(url)
    response.cookies.delete('auth_token')
    return response
  }

  // Check if this route requires editor role
  const requiresEditor = matchesPattern(pathname, editorOnlyPatterns)

  if (requiresEditor && authInfo.role !== 'editor') {
    // User is authenticated but doesn't have editor permission
    const url = new URL('/auth/error', request.url)
    url.searchParams.set('reason', 'insufficient_permissions')
    return NextResponse.redirect(url)
  }

  // Check if user has at least reader role
  if (!authInfo.role || (authInfo.role !== 'reader' && authInfo.role !== 'editor')) {
    const url = new URL('/login', request.url)
    url.searchParams.set('error', 'invalid_session')
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dossiers/:path*',
    '/points-prelevement/:path*',
    '/preleveurs/:path*',
    '/exploitations/:path*',
    '/statistiques'
  ]
}
