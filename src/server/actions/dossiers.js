'use server'

import {revalidatePath} from 'next/cache'

import {
  fetchJSON,
  fetchBlob,
  withErrorHandling
} from '@/server/api-wrapper.js'

/**
 * Get all dossiers
 * @returns {Promise<Object>} - Result object
 */
export async function getDossiersAction() {
  return withErrorHandling(async () => fetchJSON('api/dossiers'))
}

/**
 * Get dossiers filtered by status
 * @param {string} status - Status to filter by
 * @returns {Promise<Object>} - Result object
 */
export async function getDossiersByStatusAction(status) {
  return withErrorHandling(async () => fetchJSON(`api/dossiers?status=${status}`))
}

/**
 * Get user dossiers
 * @returns {Promise<Object>} - Result object
 */
export async function getMyDossiers() {
  return withErrorHandling(async () => fetchJSON(`api/dossiers/me`))
}

/**
 * Get dossiers statistics
 * @returns {Promise<Object>} - Result object
 */
export async function getDossiersStatsAction() {
  return withErrorHandling(async () => fetchJSON('api/dossiers/stats'))
}

/**
 * Get a single dossier by ID
 * @param {string} _id - Dossier ID
 * @returns {Promise<Object>} - Result object
 */
export async function getDossierAction(_id) {
  return withErrorHandling(async () => {
    const data = await fetchJSON(`api/dossiers/${_id}`)
    return data
  })
}

/**
 * Get a file from a dossier
 * @param {string} dossierId - Dossier ID
 * @param {string} attachmentId - Attachment ID
 * @returns {Promise<Object>} - Result object
 */
export async function getFileAction(dossierId, attachmentId) {
  return withErrorHandling(async () => fetchJSON(`api/dossiers/${dossierId}/files/${attachmentId}`))
}

/**
 * Get file series from a dossier
 * @param {string} dossierId - Dossier ID
 * @param {string} attachmentId - Attachment ID
 * @param {Object} options - Options
 * @param {boolean} [options.withPoint=false] - Include point info
 * @returns {Promise<Object>} - Result object
 */
export async function getFileSeriesAction(dossierId, attachmentId, {withPoint = false} = {}) {
  return withErrorHandling(async () => {
    const search = withPoint ? '?withPoint=1' : ''
    return fetchJSON(`api/dossiers/${dossierId}/files/${attachmentId}/series${search}`)
  })
}

/**
 * Get file integrations from a dossier
 * @param {string} dossierId - Dossier ID
 * @param {string} attachmentId - Attachment ID
 * @param {Object} options - Options
 * @param {boolean} [options.withPoint=false] - Include point info
 * @returns {Promise<Object>} - Result object
 */
export async function getFileIntegrationsAction(dossierId, attachmentId, {withPoint = false} = {}) {
  return withErrorHandling(async () => {
    const search = withPoint ? '?withPoint=1' : ''
    return fetchJSON(`api/dossiers/${dossierId}/files/${attachmentId}/integrations${search}`)
  })
}

/**
 * Get file blob from a dossier
 * @param {string} dossierId - Dossier ID
 * @param {string} attachmentId - Attachment ID
 * @returns {Promise<Object>} - Result object with blob
 */
export async function getFileBlobAction(dossierId, attachmentId) {
  return withErrorHandling(async () => fetchBlob(`api/dossiers/${dossierId}/files/${attachmentId}/download`))
}

/**
 * Validate a file (no auth required)
 * @param {ArrayBuffer} buffer - File buffer
 * @param {string} fileType - File type
 * @returns {Promise<Object>} - Result object
 */
export async function validateFileAction(buffer, fileType) {
  return withErrorHandling(async () => {
    const blob = new Blob([buffer])
    return fetchJSON(`validate-file?fileType=${fileType}`, {
      method: 'POST',
      body: blob,
      requireAuth: false
    })
  })
}

/**
 * Revalidate dossier paths after mutations
 * @param {string} [dossierId] - Optional dossier ID
 */
export async function revalidateDossierPaths(dossierId) {
  revalidatePath('/dossiers')
  if (dossierId) {
    revalidatePath(`/dossiers/${dossierId}`)
  }
}
