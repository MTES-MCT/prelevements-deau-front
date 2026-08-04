'use server'

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
