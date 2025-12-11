import {NextResponse} from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL
const NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

/**
 * Map HTTP status codes to error reasons for user-friendly messages
 * @param {number} status - HTTP status code
 * @param {object} data - Response data from backend
 * @returns {string} Error reason code
 */
function getErrorReason(status, data) {
  switch (status) {
    case 400: {
      return 'missing_params'
    }

    case 401: {
      return data?.message?.includes('expiré') ? 'expired' : 'invalid_token'
    }

    case 403: {
      return 'invalid_territoire'
    }

    case 404: {
      return 'territoire_not_found'
    }

    default: {
      return 'server_error'
    }
  }
}

/**
 * Route handler for magic link verification in dev mode.
 *
 * In dev, the backend sends magic link emails pointing to localhost:
 *   http://localhost:3000/api/auth/verify/{token}?territoire={territoire}
 *
 * This route calls the new POST /auth/verify endpoint (no redirects)
 * and redirects to /auth/callback with the session token.
 *
 * In production, this route is never called because the magic link
 * points directly to the backend at /api/auth/verify/{token}.
 */
export async function GET(request, {params}) {
  const {token} = await params
  const {searchParams} = new URL(request.url)
  const territoire = searchParams.get('territoire')

  if (!token || !territoire) {
    const errorUrl = new URL('/auth/error', NEXTAUTH_URL)
    errorUrl.searchParams.set('reason', 'missing_params')
    return NextResponse.redirect(errorUrl.toString())
  }

  try {
    // Call the new POST /auth/verify endpoint (no redirects)
    const response = await fetch(`${API_URL}/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({token, territoire})
    })

    const data = await response.json()

    if (response.ok && data.success && data.token) {
      // Redirect to callback page with session token
      const callbackUrl = new URL('/auth/callback', NEXTAUTH_URL)
      callbackUrl.searchParams.set('token', data.token)
      return NextResponse.redirect(callbackUrl.toString())
    }

    // Handle errors based on status code
    const errorUrl = new URL('/auth/error', NEXTAUTH_URL)
    const errorReason = getErrorReason(response.status, data)
    errorUrl.searchParams.set('reason', errorReason)
    return NextResponse.redirect(errorUrl.toString())
  } catch (error) {
    console.error('[Magic Link] Verification error:', error)
    const errorUrl = new URL('/auth/error', NEXTAUTH_URL)
    errorUrl.searchParams.set('reason', 'server_error')
    return NextResponse.redirect(errorUrl.toString())
  }
}
