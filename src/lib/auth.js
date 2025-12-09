/**
 * Client-side authentication utilities using localStorage
 */

const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'

/**
 * Store authentication token and user info
 * @param {string} token - Session token from backend
 * @param {object} user - User info from /info endpoint
 */
export function setAuth(token, user) {
  if (typeof window === 'undefined') {
    return
  }

  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))

  // Sync token to cookie for middleware (server-side) access
  syncTokenToCookie(token)
}

/**
 * Get stored authentication token
 * @returns {string|null}
 */
export function getToken() {
  if (typeof window === 'undefined') {
    return null
  }

  return localStorage.getItem(TOKEN_KEY)
}

/**
 * Get stored user info
 * @returns {object|null}
 */
export function getUser() {
  if (typeof window === 'undefined') {
    return null
  }

  const userStr = localStorage.getItem(USER_KEY)
  if (!userStr) {
    return null
  }

  try {
    return JSON.parse(userStr)
  } catch {
    return null
  }
}

/**
 * Clear authentication data
 */
export function clearAuth() {
  if (typeof window === 'undefined') {
    return
  }

  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)

  // Clear cookie as well
  syncTokenToCookie(null)
}

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export function isAuthenticated() {
  return Boolean(getToken())
}

/**
 * Sync token to cookie for middleware (server-side) access
 * @param {string|null} token - Token to store, or null to clear
 */
export function syncTokenToCookie(token) {
  if (typeof window === 'undefined') {
    return
  }

  if (token) {
    // Set cookie with 30 days expiry, SameSite=Lax for security
    // eslint-disable-next-line unicorn/no-document-cookie
    document.cookie = `auth_token=${token}; path=/; max-age=2592000; SameSite=Lax`
  } else {
    // Clear cookie
    // eslint-disable-next-line unicorn/no-document-cookie
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
  }
}
