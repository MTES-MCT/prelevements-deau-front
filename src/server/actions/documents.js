'use server'

import {revalidatePath} from 'next/cache'

import {
  authenticatedFetch,
  fetchJSON,
  withErrorHandling
} from '@/server/api-wrapper.js'

export async function getDocumentsFromPreleveurAction(id) {
  return withErrorHandling(async () => fetchJSON(`api/preleveurs/${id}/documents`))
}

export async function createDocumentAction(declarantId, payload, document) {
  return withErrorHandling(async () => {
    const formData = new FormData()
    for (const [key, value] of Object.entries(payload)) {
      if (value !== null && value !== undefined) {
        if (Array.isArray(value)) {
          for (const item of value) {
            formData.append(key, item)
          }
        } else {
          formData.append(key, value)
        }
      }
    }

    formData.append('document', document)

    const result = await fetchJSON(`api/preleveurs/${declarantId}/documents`, {
      method: 'POST',
      body: formData
    })

    revalidatePath(`/declarants/${declarantId}`)
    revalidatePath(`/preleveurs/${declarantId}`)
    return result
  })
}

export async function uploadDocumentAction(declarantId, document) {
  return withErrorHandling(async () => {
    const formData = new FormData()
    formData.append('document', document)

    const result = await fetchJSON(`api/preleveurs/${declarantId}/documents/upload`, {
      method: 'POST',
      body: formData
    })

    revalidatePath(`/declarants/${declarantId}`)
    revalidatePath(`/preleveurs/${declarantId}`)
    return result
  })
}

export async function updateDocumentAction(documentId, payload, declarantId) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/documents/${documentId}`, {
      method: 'PUT',
      body: payload
    })

    if (declarantId) {
      revalidatePath(`/declarants/${declarantId}`)
      revalidatePath(`/preleveurs/${declarantId}`)
    }

    return result
  })
}

export async function deleteDocumentAction(documentId, declarantId) {
  return withErrorHandling(async () => {
    const response = await authenticatedFetch(`api/documents/${documentId}`, {
      method: 'DELETE'
    })

    if (declarantId) {
      revalidatePath(`/declarants/${declarantId}`)
      revalidatePath(`/preleveurs/${declarantId}`)
    }

    return {deleted: response.ok}
  })
}
