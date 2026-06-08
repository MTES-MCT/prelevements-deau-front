'use server'

import {revalidatePath} from 'next/cache'

import {fetchJSON, withErrorHandling} from '@/server/api-wrapper.js'

export async function createDeclarationAction({
  type,
  declarantUserId,
  files = [],
  fileTypes = [],
  comment
} = {}) {
  return withErrorHandling(async () => {
    if (!Array.isArray(files) || files.length === 0) {
      throw new Error('Aucun fichier fourni.')
    }

    const normalizedType = (type || '').trim().toLocaleLowerCase('fr-FR')
    if (!normalizedType) {
      throw new Error('Type de déclaration requis.')
    }

    if (!Array.isArray(fileTypes) || fileTypes.length !== files.length) {
      throw new Error('fileTypes doit contenir exactement un type par fichier.')
    }

    const normalizedTypes = fileTypes.map(t => (t || '').trim().toLocaleLowerCase('fr-FR'))
    if (normalizedTypes.some(t => !t)) {
      throw new Error('Chaque fichier doit avoir un type non vide.')
    }

    if (normalizedTypes.some(t => t !== normalizedType)) {
      throw new Error('Tous les fichiers doivent être du type de déclaration sélectionné.')
    }

    const formData = new FormData()

    formData.append('type', normalizedType)

    if (declarantUserId) {
      formData.append('declarantUserId', declarantUserId)
    }

    if (typeof comment === 'string' && comment.trim()) {
      formData.append('comment', comment.trim())
    }

    for (const [i, file] of files.entries()) {
      formData.append('files', file)
      formData.append('fileTypes', normalizedTypes[i])
    }

    const data = await fetchJSON('api/declarations', {
      method: 'POST',
      body: formData
    })

    await revalidateDeclarationPaths(data?.data?.id)

    return data
  })
}

export async function getMyDeclarationsAction() {
  return withErrorHandling(async () => fetchJSON('api/declarations/me'))
}

export async function getAllowedDeclarationTypesAction() {
  return withErrorHandling(async () => fetchJSON('api/declarations/allowed-types'))
}

export async function getDeclarationAction(declarationId) {
  return withErrorHandling(async () => {
    if (!declarationId) {
      throw new Error('declarationId est requis.')
    }

    return fetchJSON(`api/declarations/${declarationId}`)
  })
}

export async function getAvailablePointsPrelevementsForDeclarationAction(declarationId) {
  return withErrorHandling(async () => {
    if (!declarationId) {
      throw new Error('declarationId est requis.')
    }

    return fetchJSON(`api/declarations/${declarationId}/available-points-prelevements`)
  })
}

export async function revalidateDeclarationPaths(declarationId) {
  revalidatePath('/declarations')
  revalidatePath('/declarations/me')
  revalidatePath('/mes-declarations')

  if (declarationId) {
    revalidatePath(`/declarations/${declarationId}`)
    revalidatePath(`/mes-declarations/${declarationId}`)
  }
}
