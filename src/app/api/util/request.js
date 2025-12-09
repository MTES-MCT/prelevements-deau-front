import {redirect} from 'next/navigation'

import {
  getToken,
  clearAuth,
  syncTokenToCookie
} from '@/lib/auth.js'

export const API_URL = process.env.NEXT_PUBLIC_API_URL

export function getAuthorization() {
  const authToken = getToken()

  if (authToken) {
    // Sync token to cookie for middleware access
    syncTokenToCookie(authToken)
    return `Bearer ${authToken}`
  }
}

export async function executeRequest(url, options = {}) {
  const {method, body, headers = {}, signal} = options

  const fetchOptions = {
    method: method || 'GET',
    headers
  }

  if (signal) {
    fetchOptions.signal = signal
  }

  if (body && body instanceof Blob) {
    fetchOptions.headers['Content-Type'] = body.type || 'application/octet-stream'
    fetchOptions.body = body
  } else if (body) {
    fetchOptions.headers['Content-Type'] = 'application/json'
    fetchOptions.body = JSON.stringify(body)
  }

  const response = await fetch(`${API_URL}/${url}`, fetchOptions)

  if (!response.ok && response.status === 401) {
    // Session expired - clear auth and redirect
    if (typeof window !== 'undefined') {
      clearAuth()
      window.location.href = '/login?error=session_expired'
      return response
    }

    redirect('/login?error=session_expired')
  }

  if (!response.ok && response.status === 403) {
    // Insufficient permissions - redirect to error page
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/error?reason=insufficient_permissions'
      return response
    }

    redirect('/auth/error?reason=insufficient_permissions')
  }

  return response
}
