'use server'

import {authenticatedFetch, fetchJSON, withErrorHandling} from '@/server/api-wrapper.js'

export async function exportCampaignResultsAction(campaignId) {
  return withErrorHandling(async () => {
    const response = await authenticatedFetch(`api/campaigns/${encodeURIComponent(campaignId)}/export`)
    if (!response.ok) {
      const error = new Error('Impossible d’exporter les résultats de la campagne.')
      error.code = response.status
      throw error
    }
    return {content: await response.text(), fileName: 'resultats-campagne.csv'}
  }, {forbiddenOnAccessDenied: false})
}

export async function getDataExportOptionsAction() {
  return withErrorHandling(async () => fetchJSON('api/exports/options'))
}

export async function listDataExportsAction() {
  return withErrorHandling(async () => fetchJSON('api/exports'))
}

export async function createDataExportAction(payload) {
  return withErrorHandling(async () => fetchJSON('api/exports', {
    method: 'POST',
    body: payload
  }))
}

export async function getDataExportDownloadAction(exportId) {
  return withErrorHandling(async () => fetchJSON(`api/exports/${exportId}/download`))
}

export async function deleteDataExportAction(exportId) {
  return withErrorHandling(async () => fetchJSON(`api/exports/${exportId}`, {
    method: 'DELETE'
  }))
}
