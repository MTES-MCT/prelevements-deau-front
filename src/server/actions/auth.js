'use server'

import {
  fetchJSON,
  withErrorHandling
} from '@/server/api-wrapper.js'
import {requestMagicLink} from '@/server/auth.js'

/**
 * Server action to request a magic link
 * This wraps requestMagicLink to be callable from client components
 * @param {string} email - User's email address
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export async function requestMagicLinkAction(email) {
  try {
    const result = await requestMagicLink(email)
    return result
  } catch (error) {
    console.error('[Auth] Magic link request error:', error)
    return {
      success: false,
      message: 'Impossible de contacter le serveur'
    }
  }
}

export async function startImpersonationAction(userId) {
  return withErrorHandling(async () => fetchJSON('api/admin/impersonations', {
    method: 'POST',
    body: {userId}
  }))
}

export async function stopImpersonationAction() {
  return withErrorHandling(async () => fetchJSON('api/auth/impersonation', {
    method: 'DELETE'
  }))
}
