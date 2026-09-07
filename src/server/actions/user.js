'use server'

import {revalidatePath} from 'next/cache'

import {
  fetchJSON,
  withErrorHandling
} from '@/server/api-wrapper.js'
import {getServerAuthSession} from '@/server/auth.js'
import {buildCurrentSessionInfo} from '@/server/current-session-info.js'
import {cachePerRequest} from '@/server/request-cache.js'

const getCachedCurrentUser = cachePerRequest(async () => withErrorHandling(
  async () => fetchJSON('api/info'),
  {redirectOnUnauthorized: false}
))

const getCachedCurrentSessionInfo = cachePerRequest(async () => withErrorHandling(async () => {
  const session = await getServerAuthSession()
  const sessionInfo = buildCurrentSessionInfo(session)

  if (!sessionInfo) {
    const error = new Error('UNAUTHORIZED')
    error.code = 401
    throw error
  }

  return sessionInfo
}, {redirectOnUnauthorized: false}))

export async function getCurrentUser() {
  return getCachedCurrentUser()
}

/**
 * Return the identity and global permissions already embedded in the NextAuth
 * session. Use this for authorization decisions that do not need fresh API
 * relations such as zones or email aliases.
 */
export async function getCurrentSessionInfo() {
  return getCachedCurrentSessionInfo()
}

export async function updateCurrentUserProfileAction(payload) {
  return withErrorHandling(async () => {
    const profile = await fetchJSON('api/users/me/profile', {
      method: 'PATCH',
      body: payload
    })

    revalidatePath('/mon-compte')
    return profile
  }, {forbiddenOnAccessDenied: false})
}

export async function requestPrimaryEmailChangeAction(email) {
  return withErrorHandling(async () => {
    const verification = await fetchJSON('api/users/me/email-change', {
      method: 'POST',
      body: {email}
    })

    revalidatePath('/mon-compte')
    return verification
  }, {forbiddenOnAccessDenied: false})
}

export async function createCurrentUserEmailAliasAction(email) {
  return withErrorHandling(async () => {
    const verification = await fetchJSON('api/users/me/email-aliases', {
      method: 'POST',
      body: {email}
    })

    revalidatePath('/mon-compte')
    return verification
  }, {forbiddenOnAccessDenied: false})
}

export async function resendEmailVerificationAction(verificationId) {
  return withErrorHandling(async () => {
    const verification = await fetchJSON(
      `api/users/me/email-verifications/${encodeURIComponent(verificationId)}/resend`,
      {method: 'POST'}
    )

    revalidatePath('/mon-compte')
    return verification
  }, {forbiddenOnAccessDenied: false})
}

export async function cancelEmailVerificationAction(verificationId) {
  return withErrorHandling(async () => {
    const verification = await fetchJSON(
      `api/users/me/email-verifications/${encodeURIComponent(verificationId)}`,
      {method: 'DELETE'}
    )

    revalidatePath('/mon-compte')
    return verification
  }, {forbiddenOnAccessDenied: false})
}

export async function deleteCurrentUserEmailAliasAction(aliasId) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(
      `api/users/me/email-aliases/${encodeURIComponent(aliasId)}`,
      {method: 'DELETE'}
    )

    revalidatePath('/mon-compte')
    return result
  }, {forbiddenOnAccessDenied: false})
}

export async function confirmEmailVerificationAction(token) {
  return withErrorHandling(async () => fetchJSON('auth/email-verifications/confirm', {
    method: 'POST',
    body: {token},
    requireAuth: false
  }), {
    forbiddenOnAccessDenied: false,
    redirectOnUnauthorized: false
  })
}
