'use server'

import {revalidatePath} from 'next/cache'

import {buildAgentsSearchQuery} from '@/lib/agent-search.js'
import {fetchJSON, withErrorHandling} from '@/server/api-wrapper.js'
import {cachePerRequest} from '@/server/request-cache.js'

function getAgentPath(agentId) {
  return `/agents/${encodeURIComponent(agentId)}`
}

function revalidateAgentPaths(agentId, zoneIds = []) {
  revalidatePath('/agents')

  if (agentId) {
    const agentPath = getAgentPath(agentId)
    revalidatePath(agentPath)
    revalidatePath(`${agentPath}/modifier`)
    revalidatePath(`${agentPath}/zones/ajouter`)
  }

  for (const zoneId of new Set(zoneIds.filter(Boolean))) {
    revalidatePath(`/zones/${zoneId}`)
    revalidatePath(`/zones/${zoneId}/agents`)
    if (agentId) {
      revalidatePath(`/zones/${zoneId}/agents/${agentId}`)
      revalidatePath(`/zones/${zoneId}/agents/${agentId}/modifier`)
    }
  }
}

const getCachedAgents = cachePerRequest(async query => withErrorHandling(
  async () => fetchJSON(`api/admin/agents?${query}`)
))

export async function listAgentsAction(options) {
  return getCachedAgents(buildAgentsSearchQuery(options))
}

const getCachedAgent = cachePerRequest(async agentId => withErrorHandling(
  async () => fetchJSON(`api/admin/agents/${encodeURIComponent(agentId)}`)
))

export async function getAgentAction(agentId) {
  return getCachedAgent(agentId)
}

export async function createAgentAction(payload) {
  return withErrorHandling(async () => {
    const agent = await fetchJSON('api/admin/agents', {
      method: 'POST',
      body: payload
    })

    revalidateAgentPaths(agent?.id, [payload.zoneId])
    return agent
  }, {forbiddenOnAccessDenied: false})
}

export async function updateAgentProfileAction(agentId, payload) {
  return withErrorHandling(async () => {
    const agent = await fetchJSON(
      `api/admin/agents/${encodeURIComponent(agentId)}/profile`,
      {method: 'PATCH', body: payload}
    )

    revalidateAgentPaths(agentId)
    return agent
  }, {forbiddenOnAccessDenied: false})
}

export async function updateAgentEmailAction(agentId, payload) {
  return withErrorHandling(async () => {
    const agent = await fetchJSON(
      `api/admin/agents/${encodeURIComponent(agentId)}/email`,
      {method: 'PUT', body: payload}
    )

    revalidateAgentPaths(agentId)
    revalidatePath('/administration/acces-mot-de-passe')
    return agent
  }, {forbiddenOnAccessDenied: false})
}

export async function disableAgentAction(agentId, payload) {
  return withErrorHandling(async () => {
    const agent = await fetchJSON(`api/admin/agents/${encodeURIComponent(agentId)}`, {
      method: 'DELETE',
      body: payload
    })
    const zoneIds = (agent?.habilitations ?? [])
      .map(habilitation => habilitation.zone?.id ?? habilitation.zoneId)

    revalidateAgentPaths(agentId, zoneIds)
    revalidatePath('/administration/acces-mot-de-passe')
    return agent
  }, {forbiddenOnAccessDenied: false})
}

export async function restoreAgentAction(agentId, expectedUpdatedAt) {
  return withErrorHandling(async () => {
    const agent = await fetchJSON(
      `api/admin/agents/${encodeURIComponent(agentId)}/restore`,
      {method: 'POST', body: {expectedUpdatedAt}}
    )
    const zoneIds = (agent?.habilitations ?? [])
      .map(habilitation => habilitation.zone?.id ?? habilitation.zoneId)

    revalidateAgentPaths(agentId, zoneIds)
    revalidatePath('/administration/acces-mot-de-passe')
    return agent
  }, {forbiddenOnAccessDenied: false})
}

export async function sendAgentAccountCreationNotificationAction(agentId) {
  return withErrorHandling(async () => {
    const agent = await fetchJSON(
      `api/admin/agents/${encodeURIComponent(agentId)}/notifications/account-creation`,
      {method: 'POST'}
    )

    revalidateAgentPaths(agentId)
    return agent
  }, {forbiddenOnAccessDenied: false})
}
