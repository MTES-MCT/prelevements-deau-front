'use server'

import {fetchJSON, withErrorHandling} from '@/server/api-wrapper.js'

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
