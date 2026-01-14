import {getServerAuthSession} from '@/server/auth.js'

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL

/**
 * Get authenticated session or throw if not authenticated
 * @returns {Promise<Object>} - Session object with user and token
 * @throws {Error} - UNAUTHORIZED if no session
 */
async function getAuthenticatedSession() {
  const session = await getServerAuthSession()

  if (!session?.user?.token) {
    const error = new Error('UNAUTHORIZED')
    error.code = 401
    throw error
  }

  return session
}

/**
 * Wrapper for authenticated API requests
 * Automatically handles auth token from NextAuth session
 *
 * @param {string} url - API endpoint (without base URL)
 * @param {Object} options - Fetch options
 * @param {string} [options.method='GET'] - HTTP method
 * @param {Object|FormData} [options.body] - Request body
 * @param {Object} [options.headers={}] - Additional headers
 * @param {AbortSignal} [options.signal] - Abort signal
 * @param {boolean} [options.requireAuth=true] - Whether auth is required
 * @returns {Promise<Response>} - Fetch response
 */
export async function authenticatedFetch(url, options = {}) {
  const {
    method = 'GET',
    body,
    headers = {},
    signal,
    requireAuth = true
  } = options

  const fetchHeaders = {...headers}

  // Add authorization header if auth is required
  if (requireAuth) {
    const session = await getAuthenticatedSession()
    fetchHeaders.Authorization = `Bearer ${session.user.token}`
  }

  const fetchOptions = {
    method,
    headers: fetchHeaders
  }

  if (signal) {
    fetchOptions.signal = signal
  }

  // Handle body based on type
  if (body instanceof FormData) {
    // Don't set Content-Type for FormData - browser will set it with boundary
    fetchOptions.body = body
  } else if (body instanceof Blob) {
    fetchHeaders['Content-Type'] = body.type || 'application/octet-stream'
    fetchOptions.body = body
  } else if (body) {
    fetchHeaders['Content-Type'] = 'application/json'
    fetchOptions.body = JSON.stringify(body)
  }

  fetchOptions.headers = fetchHeaders

  const response = await fetch(`${API_URL}/${url}`, fetchOptions)

  return response
}

/**
 * Make authenticated request and parse JSON response
 * Handles common error patterns
 *
 * @param {string} url - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} - Parsed JSON response
 * @throws {Error} - With code, message, and validationErrors if request fails
 */
export async function fetchJSON(url, options = {}) {
  const response = await authenticatedFetch(url, options)

  // Handle empty responses (204 No Content, etc.)
  const text = await response.text()
  let data = null

  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = {message: text}
    }
  }

  if (!response.ok) {
    const error = new Error(data?.message || `Request failed with status ${response.status}`)
    error.code = response.status
    error.validationErrors = data?.validationErrors
    error.data = data
    throw error
  }

  return data
}

/**
 * Make authenticated request and return blob
 *
 * @param {string} url - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<Blob>} - Response blob
 * @throws {Error} - If request fails
 */
export async function fetchBlob(url, options = {}) {
  const response = await authenticatedFetch(url, options)

  if (!response.ok) {
    const error = new Error(`Request failed with status ${response.status}`)
    error.code = response.status
    throw error
  }

  return response.blob()
}

/**
 * Helper to create a successful action result
 * @param {*} data - Response data
 * @returns {Object} - Success result object
 */
export function successResult(data) {
  return {
    success: true,
    data
  }
}

/**
 * Helper to create a failed action result from an error
 * @param {Error} error - Error object
 * @returns {Object} - Error result object
 */
export function errorResult(error) {
  return {
    success: false,
    error: error.message,
    code: error.code,
    validationErrors: error.validationErrors,
    data: error.data
  }
}

/**
 * Wrapper for server actions that handles common error patterns
 * @param {Function} fn - Async function to execute
 * @returns {Promise<Object>} - Result object with success/error pattern
 */
export async function withErrorHandling(fn) {
  try {
    const result = await fn()
    return successResult(result)
  } catch (error) {
    // Log server errors for debugging
    if (error.code >= 500) {
      console.error('[API] Server error:', {
        message: error.message,
        code: error.code,
        data: error.data
      })
    }

    // Re-throw auth errors so they can be handled at the page level
    if (error.message === 'UNAUTHORIZED' || error.code === 401) {
      return {
        success: false,
        error: 'SESSION_EXPIRED',
        code: 401
      }
    }

    if (error.code === 403) {
      return {
        success: false,
        error: 'INSUFFICIENT_PERMISSIONS',
        code: 403
      }
    }

    return errorResult(error)
  }
}
