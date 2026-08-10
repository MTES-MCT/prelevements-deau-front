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
