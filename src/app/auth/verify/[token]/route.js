import {NextResponse} from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL
const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'

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
 * Route handler for magic link verification.
 *
 * In dev mode, the backend sends magic link emails pointing to:
 *   http://localhost:3000/auth/verify/{token}?territoire={territoire}
 *
 * This route calls the POST /auth/verify endpoint to get a session token,
 * then redirects to /auth/callback to complete the NextAuth login.
 */
export async function GET(request, {params}) {
  const {token} = await params
  const {searchParams} = new URL(request.url)
  const territoire = searchParams.get('territoire')

  if (!token || !territoire) {
    const errorUrl = new URL('/auth/error', FRONTEND_URL)
    errorUrl.searchParams.set('reason', 'missing_params')
    return NextResponse.redirect(errorUrl.toString())
  }

  try {
    // Call the POST /auth/verify endpoint (no redirects)
    const response = await fetch(`${API_URL}/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({token, territoire}),
      cache: 'no-store'
    })

    const data = await response.json()

    if (response.ok && data.success && data.token) {
      // Redirect to callback page with session token
      const callbackUrl = new URL('/auth/callback', FRONTEND_URL)
      callbackUrl.searchParams.set('token', encodeURIComponent(data.token))
      return NextResponse.redirect(callbackUrl.toString())
    }

    // Handle errors based on status code
    const errorUrl = new URL('/auth/error', FRONTEND_URL)
    const errorReason = getErrorReason(response.status, data)
    errorUrl.searchParams.set('reason', errorReason)
    return NextResponse.redirect(errorUrl.toString())
  } catch (error) {
    console.error('[Magic Link] Verification error:', error)
    const errorUrl = new URL('/auth/error', FRONTEND_URL)
    errorUrl.searchParams.set('reason', 'server_error')
    return NextResponse.redirect(errorUrl.toString())
  }
}
