'use server'

import {
  fetchJSON,
  withErrorHandling
} from '@/server/api-wrapper.js'

function buildSearch(options = {}) {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value))
    }
  }

  const search = params.toString()
  return search ? `?${search}` : ''
}

export async function listUpcomingDeclarationNotificationsAction() {
  return withErrorHandling(async () => fetchJSON('api/admin/declaration-notifications/upcoming'))
}

export async function previewDeclarationNotificationAction(options) {
  return withErrorHandling(async () => fetchJSON(`api/admin/declaration-notifications/preview${buildSearch(options)}`))
}

export async function listDeclarationNotificationRunsAction(options = {}) {
  return withErrorHandling(async () => fetchJSON(`api/admin/declaration-notifications/runs${buildSearch(options)}`))
}

export async function getDeclarationNotificationRunAction(runId) {
  return withErrorHandling(async () => fetchJSON(`api/admin/declaration-notifications/runs/${runId}`))
}

export async function sendDeclarationNotificationNowAction(options) {
  return withErrorHandling(async () => fetchJSON('api/admin/declaration-notifications/send-now', {
    method: 'POST',
    body: options
  }))
}

export async function retryDeclarationNotificationFailuresAction(runId) {
  return withErrorHandling(async () => fetchJSON(`api/admin/declaration-notifications/runs/${runId}/retry-failures`, {
    method: 'POST'
  }))
}
