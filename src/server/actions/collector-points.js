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

export async function getCollectorPointFormAction(pointId) {
  return withErrorHandling(() => fetchJSON(`api/collecteurs/me/points-prelevement/${pointId}/form`), {
    forbiddenOnAccessDenied: false
  })
}

export async function updateCollectorPointFormAction(pointId, payload) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/collecteurs/me/points-prelevement/${pointId}/form`, {method: 'PATCH', body: payload})
    revalidatePath(`/points-prelevement/${pointId}`)
    revalidatePath('/points-prelevement')
    revalidatePath('/exploitations')
    for (const exploitation of result.exploitations) revalidatePath(`/exploitations/${exploitation.id}`)
    return result
  }, {forbiddenOnAccessDenied: false})
}

export async function getCollectorCampaignParticipationOptionsAction(exploitationId) {
  return withErrorHandling(async () => {
    const query = new URLSearchParams({pageSize: '100'})
    if (exploitationId) query.set('exploitationId', exploitationId)
    const path = `api/collecteurs/me/campaign-participation-options?${query}`
    const first = await fetchJSON(path)
    const count = Math.ceil((first.total || 0) / (first.pageSize || 100))
    const remaining = await Promise.all(Array.from({length: Math.max(0, count - 1)}, (_value, index) => fetchJSON(`${path}&page=${index + 2}`)))
    return {...first, campaigns: [...first.campaigns, ...remaining.flatMap(result => result.campaigns)]}
  }, {forbiddenOnAccessDenied: false})
}

export async function createCollectorExploitationAction(pointId, payload) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/collecteurs/me/points-prelevement/${pointId}/exploitations`, {method: 'POST', body: payload})
    revalidatePath(`/points-prelevement/${pointId}`)
    revalidatePath('/preleveurs')
    revalidatePath(`/preleveurs/${result.preleveurId}`)
    revalidatePath(`/declarants/${result.preleveurId}`)
    return result
  }, {forbiddenOnAccessDenied: false})
}

export async function getCollectorExploitationFormAction(exploitationId) {
  return withErrorHandling(() => fetchJSON(`api/collecteurs/me/exploitations/${exploitationId}/form`), {forbiddenOnAccessDenied: false})
}

export async function updateCollectorExploitationFormAction(exploitationId, payload) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/collecteurs/me/exploitations/${exploitationId}/form`, {method: 'PATCH', body: payload})
    revalidatePath(`/exploitations/${exploitationId}`)
    revalidatePath(`/points-prelevement/${result.exploitation.pointPrelevement.id}`)
    revalidatePath('/preleveurs')
    return result
  }, {forbiddenOnAccessDenied: false})
}

export async function getCollectorContactDetailsAction(preleveurId) {
  return withErrorHandling(() => fetchJSON(`api/collecteurs/me/preleveurs/${preleveurId}/contact-details`), {forbiddenOnAccessDenied: false})
}

export async function updateCollectorContactDetailsAction(preleveurId, payload) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/collecteurs/me/preleveurs/${preleveurId}/contact-details`, {method: 'PATCH', body: payload})
    revalidatePath(`/preleveurs/${preleveurId}`)
    revalidatePath(`/declarants/${preleveurId}`)
    return result
  }, {forbiddenOnAccessDenied: false})
}
