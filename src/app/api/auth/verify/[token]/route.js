import {NextResponse} from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL
const FRONTEND_DOMAIN = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://prelevements-deau.beta.gouv.fr'

/**
 * Validate that a redirect URL is safe.
 * Only allows redirects to known domains (frontend or backend) with specific auth paths.
 */
function isValidRedirectUrl(url) {
  try {
    const parsed = new URL(url)
    const frontendUrl = new URL(FRONTEND_DOMAIN)
    const backendUrl = new URL(API_URL)

    // Allow redirects to frontend domain or backend domain (for local dev)
    const allowedHostnames = [frontendUrl.hostname, backendUrl.hostname]
    if (!allowedHostnames.includes(parsed.hostname)) {
      return false
    }

    // Allow root path with token param (backend redirects to /?token=...)
    if (parsed.pathname === '/' && parsed.searchParams.has('token')) {
      return true
    }

    // Allow specific auth paths
    const allowedPaths = ['/auth/callback', '/auth/error']
    return allowedPaths.some(path => parsed.pathname.startsWith(path))
  } catch {
    return false
  }
}

/**
 * Route handler to proxy magic link verification requests to the backend.
 *
 * The backend sends magic link emails with URLs like:
 *   /api/auth/verify/{token}?territoire={territoire}
 *
 * This route proxies the request to the backend, which will:
 * - On success: redirect to /?token={sessionToken}
 * - On error: redirect to /auth/error?reason={errorCode}
 */
export async function GET(request, {params}) {
  const {token} = await params
  const {searchParams} = new URL(request.url)
  const territoire = searchParams.get('territoire')

  // Build backend verification URL
  const verifyUrl = new URL(`${API_URL}/auth/verify/${token}`)
  if (territoire) {
    verifyUrl.searchParams.set('territoire', territoire)
  }

  try {
    // Make request to backend WITHOUT following redirects
    const response = await fetch(verifyUrl.toString(), {
      method: 'GET',
      redirect: 'manual',
      headers: {
        Accept: 'application/json, text/html'
      }
    })

    // Backend should return a redirect (302)
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')

      if (location && isValidRedirectUrl(location)) {
        return NextResponse.redirect(location)
      }
    }

    // Fallback: redirect to error page
    const errorUrl = new URL('/auth/error', FRONTEND_DOMAIN)
    errorUrl.searchParams.set('reason', 'server_error')
    return NextResponse.redirect(errorUrl)
  } catch (error) {
    console.error('[Magic Link] Verification error:', error)
    const errorUrl = new URL('/auth/error', FRONTEND_DOMAIN)
    errorUrl.searchParams.set('reason', 'server_error')
    return NextResponse.redirect(errorUrl)
  }
}
