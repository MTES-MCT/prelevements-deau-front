'use server'

import {buildAuditSearchParameters} from '@/lib/audit-events.js'
import {fetchJSON, withErrorHandling} from '@/server/api-wrapper.js'

export async function getAuditEventsAction(filters) {
  const query = buildAuditSearchParameters(filters).toString()

  return withErrorHandling(async () =>
    fetchJSON(`api/admin/audit-events${query ? `?${query}` : ''}`))
}

export async function getAuditEventOptionsAction() {
  return withErrorHandling(async () =>
    fetchJSON('api/admin/audit-events/options'))
}

export async function getAuditEventDetailAction(eventId) {
  return withErrorHandling(async () =>
    fetchJSON(`api/admin/audit-events/${encodeURIComponent(eventId)}`))
}

export async function getResourceAuditHistoryAction(resourceType, resourceId, {
  page = 1,
  pageSize = 10
} = {}) {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize)
  })

  return withErrorHandling(async () => fetchJSON(
    `api/audit-history/${encodeURIComponent(resourceType)}/${encodeURIComponent(resourceId)}?${query}`
  ), {forbiddenOnAccessDenied: false})
}
