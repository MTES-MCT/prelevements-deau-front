'use server'

import {revalidatePath} from 'next/cache'

import {fetchJSON, withErrorHandling} from '@/server/api-wrapper.js'

function queryString(options = {}) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  }
  return search.toString() ? `?${search}` : ''
}

function read(path) {
  return withErrorHandling(async () => fetchJSON(`api/campaigns${path}`), {forbiddenOnAccessDenied: false})
}

async function mutate(path, method, body) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/campaigns${path}`, {method, body})
    revalidatePath('/campagnes', 'layout')
    revalidatePath('/administration/campagnes', 'layout')
    revalidatePath('/tableau-de-bord')
    revalidatePath('/mes-declarations')
    return result
  }, {forbiddenOnAccessDenied: false})
}

export async function getCampaignSummaryAction() { return read('/summary') }
export async function getCampaignsAction(options) { return read(queryString(options)) }
export async function getCampaignAction(id) { return read(`/${encodeURIComponent(id)}`) }
export async function getCampaignCandidatesAction(options) { return read(`/candidates${queryString(options)}`) }
export async function createCampaignAction(data) { return mutate('', 'POST', data) }
export async function updateCampaignAction(id, data) { return mutate(`/${encodeURIComponent(id)}`, 'PATCH', data) }
export async function deleteCampaignAction(id) { return mutate(`/${encodeURIComponent(id)}`, 'DELETE') }
export async function changeCampaignStateAction(id, operation) {
  if (!['open', 'close', 'archive'].includes(operation)) return {success: false, error: 'Action inconnue.'}
  return mutate(`/${encodeURIComponent(id)}/${operation}`, 'POST', {})
}
export async function getCampaignResponsesAction(id, options) { return read(`/${encodeURIComponent(id)}/responses${queryString(options)}`) }
export async function getCampaignResultsAction(id, options) { return read(`/${encodeURIComponent(id)}/results${queryString(options)}`) }
export async function getCampaignResponseAction(id, responseId) { return read(`/${encodeURIComponent(id)}/responses/${encodeURIComponent(responseId)}`) }
export async function saveCampaignResponseAction(id, responseId, payload, submit = false) {
  return mutate(`/${encodeURIComponent(id)}/responses/${encodeURIComponent(responseId)}${submit ? '/submit' : ''}`, submit ? 'POST' : 'PUT', payload)
}
export async function getCampaignMeterReviewAction(id, compteurId) { return read(`/${encodeURIComponent(id)}/meters/${encodeURIComponent(compteurId)}/review`) }
export async function approveCampaignMeterAction(id, compteurId, payload) { return mutate(`/${encodeURIComponent(id)}/meters/${encodeURIComponent(compteurId)}/approve`, 'POST', payload) }
