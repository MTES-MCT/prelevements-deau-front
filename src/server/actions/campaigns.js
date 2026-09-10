'use server'

import {fetchJSON, withErrorHandling} from '@/server/api-wrapper.js'

const segment = value => encodeURIComponent(String(value))
const campaignPath = id => `api/campaigns/${segment(id)}`
const result = operation => withErrorHandling(operation, {forbiddenOnAccessDenied: false, redirectOnUnauthorized: false})

export async function listCampaignsAction() {
  return result(() => fetchJSON('api/campaigns'))
}

export async function listCampaignRequestsAction({limit = 20, cursor, actionableOnly = false} = {}) {
  const query = new URLSearchParams({limit: String(limit), ...(cursor ? {cursor} : {}), ...(actionableOnly ? {actionableOnly: 'true'} : {})})
  return result(() => fetchJSON(`api/campaigns/requests?${query}`))
}

export async function getCampaignOptionsAction(options = {}) {
  const query = new URLSearchParams(Object.entries(options).filter(([, value]) => Boolean(value)))
  return result(() => fetchJSON(`api/campaigns/options${query.size > 0 ? `?${query}` : ''}`))
}

export async function getCampaignAction(id) {
  return result(() => fetchJSON(campaignPath(id)))
}

export async function saveCampaignAction(id, body) {
  return result(() => fetchJSON(id ? campaignPath(id) : 'api/campaigns', {method: id ? 'PATCH' : 'POST', body}))
}

export async function saveCampaignManagersAction(id, body) {
  return result(() => fetchJSON(`${campaignPath(id)}/managers`, {method: 'PATCH', body}))
}

export async function setCampaignOpenAction(id, open, expectedVersion) {
  return result(() => fetchJSON(`${campaignPath(id)}/${open ? 'open' : 'close'}`, {method: 'POST', body: {expectedVersion}}))
}

export async function getCampaignContextAction(id, preleveurUserId) {
  const query = preleveurUserId ? `?${new URLSearchParams({preleveurUserId})}` : ''
  return result(() => fetchJSON(`${campaignPath(id)}/context${query}`))
}

export async function saveCampaignResponseAction(id, kind, body) {
  if (!['INDEX', 'NEEDS'].includes(kind)) {
    return {success: false, error: 'Type de réponse invalide.'}
  }

  return result(() => fetchJSON(`${campaignPath(id)}/responses/${kind}`, {method: 'PATCH', body}))
}

export async function submitCampaignResponseAction(id, kind, body) {
  if (!['INDEX', 'NEEDS'].includes(kind)) {
    return {success: false, error: 'Type de réponse invalide.'}
  }

  return result(() => fetchJSON(`${campaignPath(id)}/responses/${kind}/submit`, {method: 'POST', body}))
}

export async function saveCampaignMeterAction(id, targetId, associationId, body) {
  const path = `${campaignPath(id)}/targets/${segment(targetId)}/meters${associationId ? `/${segment(associationId)}` : ''}`
  return result(() => fetchJSON(path, {method: associationId ? 'PATCH' : 'POST', body}))
}

export async function getCampaignFollowupAction(id) {
  return result(() => fetchJSON(`${campaignPath(id)}/responses`))
}

export async function getCampaignResponseSummaryAction(id) {
  return result(() => fetchJSON(`${campaignPath(id)}/responses/summary`))
}

export async function getCampaignResponseOverviewAction(id, {limit = 20, cursor, q, status = 'all'} = {}) {
  const query = new URLSearchParams({
    limit: String(limit), status, ...(cursor ? {cursor} : {}), ...(q ? {q} : {})
  })
  return result(() => fetchJSON(`${campaignPath(id)}/responses/overview?${query}`))
}

export async function getCampaignResponseResultsAction(id, preleveurUserId) {
  const query = new URLSearchParams({preleveurUserId})
  return result(() => fetchJSON(`${campaignPath(id)}/responses/results?${query}`))
}

export async function getCampaignHistoryAction(id, kind, preleveurUserId, cursor) {
  if (!['INDEX', 'NEEDS'].includes(kind)) {
    return {success: false, error: 'Type de réponse invalide.'}
  }

  const query = new URLSearchParams({preleveurUserId, ...(cursor ? {cursor} : {})})
  return result(() => fetchJSON(`${campaignPath(id)}/responses/${kind}/history?${query}`))
}

export async function listCampaignExportsAction(id) {
  return result(() => fetchJSON(`${campaignPath(id)}/exports`))
}

export async function createCampaignExportAction(id) {
  return result(() => fetchJSON(`${campaignPath(id)}/exports`, {method: 'POST', body: {}}))
}

export async function getCampaignExportAction(id, exportId) {
  return result(() => fetchJSON(`${campaignPath(id)}/exports/${segment(exportId)}`))
}

export async function listCampaignNotificationsAction(id) {
  return result(() => fetchJSON(`${campaignPath(id)}/notifications`))
}

export async function remindCampaignAction(id) {
  return result(() => fetchJSON(`${campaignPath(id)}/notifications/remind`, {method: 'POST', body: {}}))
}
