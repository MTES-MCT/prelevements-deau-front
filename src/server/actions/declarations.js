'use server'

import {revalidatePath} from 'next/cache'

import {fetchJSON, withErrorHandling} from '@/server/api-wrapper.js'

/**
 * Create a declaration with files (multipart/form-data)
 *
 * Expects:
 * - type: string
 * - files: File[]
 * - fileTypes: string[] (1 type métier par fichier, même ordre, unique par déclaration)
 * - comment?: string
 * - aotDecreeNumber?: string
 *
 * Côté API :
 * - status = défaut (SUBMITTED)
 * - dataSourceType = SPREADSHEET
 * - waterWithdrawalType = "Inconnu"
 */
export async function createDeclarationAction({
  type,
  files = [],
  fileTypes = [],
  comment,
  aotDecreeNumber
} = {}) {
  return withErrorHandling(async () => {
    if (!Array.isArray(files) || files.length === 0) {
      throw new Error('Aucun fichier fourni.')
    }

    if (!Array.isArray(fileTypes) || fileTypes.length !== files.length) {
      throw new Error('fileTypes doit contenir exactement un type par fichier.')
    }

    const normalizedTypes = fileTypes.map(t => (t || '').trim().toLowerCase())
    if (normalizedTypes.some(t => !t)) {
      throw new Error('Chaque fichier doit avoir un type non vide.')
    }

    if (new Set(normalizedTypes).size !== normalizedTypes.length) {
      throw new Error('Chaque type doit être unique dans une déclaration.')
    }

    const formData = new FormData()

    formData.append('type', type)

    if (typeof comment === 'string' && comment.trim()) {
      formData.append('comment', comment.trim())
    }

    if (typeof aotDecreeNumber === 'string' && aotDecreeNumber.trim()) {
      formData.append('aotDecreeNumber', aotDecreeNumber.trim())
    }

    for (const [i, file] of files.entries()) {
      formData.append('files', file)
      formData.append('fileTypes', fileTypes[i])
    }

    const data = await fetchJSON('api/declarations', {
      method: 'POST',
      body: formData
    })

    revalidateDeclarationPaths(data?.data?.id)

    return data
  })
}

/**
 * Get user declarations
 */
export async function getMyDeclarationsAction() {
  return withErrorHandling(async () => fetchJSON('api/declarations/me'))
}

/**
 * Get a single declaration by ID (UUID)
 */
export async function getDeclarationAction(declarationId) {
  return withErrorHandling(async () => {
    if (!declarationId) {
      throw new Error('declarationId est requis.')
    }

    return fetchJSON(`api/declarations/${declarationId}`)
  })
}

/**
 * Revalidate declaration paths after mutations
 */
export async function revalidateDeclarationPaths(declarationId) {
  revalidatePath('/declarations')
  revalidatePath('/declarations/me')

  if (declarationId) {
    revalidatePath(`/declarations/${declarationId}`)
  }
}
