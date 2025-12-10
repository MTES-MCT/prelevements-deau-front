'use server'

import {revalidatePath} from 'next/cache'

import {
  authenticatedFetch,
  fetchJSON,
  withErrorHandling
} from '@/server/api-wrapper.js'

// ============================================================================
// Documents
// ============================================================================

/**
 * Get documents for a préleveur
 * @param {string} id - Préleveur ID
 * @returns {Promise<Object>} - Result object
 */
export async function getDocumentsFromPreleveurAction(id) {
  return withErrorHandling(async () => fetchJSON(`api/preleveurs/${id}/documents`))
}

/**
 * Create a new document for a préleveur
 * Note: This function handles FormData for file uploads
 * @param {string} idPreleveur - Préleveur ID
 * @param {Object} payload - Document metadata
 * @param {File} document - File to upload
 * @returns {Promise<Object>} - Result object
 */
export async function createDocumentAction(idPreleveur, payload, document) {
  return withErrorHandling(async () => {
    const formData = new FormData()
    for (const [key, value] of Object.entries(payload)) {
      if (value !== null && value !== undefined) {
        formData.append(key, value)
      }
    }

    formData.append('document', document)

    const result = await fetchJSON(`api/preleveurs/${idPreleveur}/documents`, {
      method: 'POST',
      body: formData
    })

    revalidatePath(`/preleveurs/${idPreleveur}`)
    return result
  })
}

/**
 * Upload a document without metadata
 * @param {string} idPreleveur - Préleveur ID
 * @param {File} document - File to upload
 * @returns {Promise<Object>} - Result object
 */
export async function uploadDocumentAction(idPreleveur, document) {
  return withErrorHandling(async () => {
    const formData = new FormData()
    formData.append('document', document)

    const result = await fetchJSON(`api/preleveurs/${idPreleveur}/documents/upload`, {
      method: 'POST',
      body: formData
    })

    revalidatePath(`/preleveurs/${idPreleveur}`)
    return result
  })
}

/**
 * Update a document
 * @param {string} idDocument - Document ID
 * @param {Object} payload - Updated document data
 * @returns {Promise<Object>} - Result object
 */
export async function updateDocumentAction(idDocument, payload) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/documents/${idDocument}`, {
      method: 'PUT',
      body: payload
    })
    return result
  })
}

/**
 * Delete a document
 * @param {string} idDocument - Document ID
 * @param {string} [preleveurId] - Optional préleveur ID for revalidation
 * @returns {Promise<Object>} - Result object
 */
export async function deleteDocumentAction(idDocument, preleveurId) {
  return withErrorHandling(async () => {
    const response = await authenticatedFetch(`api/documents/${idDocument}`, {
      method: 'DELETE'
    })

    if (preleveurId) {
      revalidatePath(`/preleveurs/${preleveurId}`)
    }

    // Return response status
    return {deleted: response.ok}
  })
}
