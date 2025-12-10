import {NextResponse} from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL

/**
 * Route handler to proxy magic link verification requests to the backend.
 *
 * The backend sends magic link emails with URLs like:
 *   /api/auth/verify/{token}?territoire={territoire}
 *
 * This route proxies the request to the backend, which will:
 * - On success: redirect to /auth/callback?token={sessionToken}
 * - On error: redirect to /auth/error?reason={errorCode}
 *
 * Since the backend does redirect-based auth (302 redirects), we follow
 * the redirect to get the final destination URL, then redirect the client there.
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
    // This lets us capture the redirect URL and forward it to the client
    const response = await fetch(verifyUrl.toString(), {
      method: 'GET',
      redirect: 'manual', // Don't follow redirects automatically
      headers: {
        Accept: 'application/json, text/html'
      }
    })

    // Backend should return a redirect (302)
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')

      if (location) {
        // The backend redirects to absolute URLs on the frontend domain
        // We can just forward this redirect to the client
        return NextResponse.redirect(location)
      }
    }

    // If backend returns JSON directly (unlikely but handle it)
    if (response.headers.get('content-type')?.includes('application/json')) {
      const data = await response.json()

      const callbackUrl = new URL('/auth/callback', request.url)
      if (response.ok && data.token) {
        callbackUrl.searchParams.set('token', data.token)
      } else {
        const errorCode = data.code || data.error || 'invalid_token'
        callbackUrl.searchParams.set('error', errorCode)
      }

      return NextResponse.redirect(callbackUrl)
    }

    // Fallback: redirect to error page
    const errorUrl = new URL('/auth/error', request.url)
    errorUrl.searchParams.set('reason', 'server_error')
    return NextResponse.redirect(errorUrl)
  } catch (error) {
    console.error('[Magic Link] Verification error:', error)
    const errorUrl = new URL('/auth/error', request.url)
    errorUrl.searchParams.set('reason', 'server_error')
    return NextResponse.redirect(errorUrl)
  }
}
