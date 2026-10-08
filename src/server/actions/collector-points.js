'use server'

import {revalidatePath} from 'next/cache'

import {fetchJSON, withErrorHandling} from '@/server/api-wrapper.js'
import {cachePerRequest} from '@/server/request-cache.js'

const getCachedManagement = cachePerRequest(async () => withErrorHandling(
  () => fetchJSON('api/collecteurs/me/point-management'),
  {forbiddenOnAccessDenied: false}
))

export async function getMyCollectorPointManagementAction() {
  return getCachedManagement()
}

export async function getCollectorPointCreationPreleveursAction() {
  return withErrorHandling(() => fetchJSON('api/collecteurs/me/point-management/preleveurs'), {
    forbiddenOnAccessDenied: false
  })
}

export async function createCollectorPointAction(payload) {
  return withErrorHandling(async () => {
    const result = await fetchJSON('api/collecteurs/me/points-prelevement', {method: 'POST', body: payload})
    revalidatePath('/points-prelevement')
    revalidatePath('/preleveurs')
    revalidatePath('/declarants')
    revalidatePath(`/preleveurs/${result.preleveurId}`)
    revalidatePath(`/declarants/${result.preleveurId}`)
    revalidatePath('/')
    return result
  }, {forbiddenOnAccessDenied: false})
}
