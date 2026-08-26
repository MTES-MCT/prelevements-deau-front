'use server'

import {revalidatePath} from 'next/cache'

import {buildDeclarationFeedSearchParams} from '@/lib/declaration-feed.js'
import {fetchJSON, withErrorHandling} from '@/server/api-wrapper.js'
import {cachePerRequest} from '@/server/request-cache.js'

const getCachedMyTelemetrySource = cachePerRequest(async sourceId => withErrorHandling(async () => {
  if (!sourceId) {
    throw new Error('sourceId est requis.')
  }

  return fetchJSON(`api/declarations/telemetry-sources/${sourceId}`)
}))

const getCachedDeclaration = cachePerRequest(async declarationId => withErrorHandling(async () => {
  if (!declarationId) {
    throw new Error('declarationId est requis.')
  }

  return fetchJSON(`api/declarations/${declarationId}`)
}))

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

export async function getMyDeclarationFeedAction({cursor, includeMeta, limit} = {}) {
  return withErrorHandling(async () => {
    const searchParameters = buildDeclarationFeedSearchParams({cursor, includeMeta, limit})
    return fetchJSON(`api/declarations/me/feed?${searchParameters}`)
  })
}

export async function getReplayableDeclarationsAction() {
  return withErrorHandling(async () => fetchJSON('api/admin/declarations/replayable'))
}

export async function getMyTelemetrySourcesAction() {
  return withErrorHandling(async () => fetchJSON('api/declarations/me/telemetry-sources'))
}

export async function getMyTelemetrySourceAction(sourceId) {
  return getCachedMyTelemetrySource(sourceId)
}

export async function getAllowedDeclarationTypesAction({includePreleveurs = true} = {}) {
  const search = includePreleveurs ? '' : '?includePreleveurs=false'
  return withErrorHandling(async () => fetchJSON(`api/declarations/allowed-types${search}`))
}

export async function getQuickDeclarationContextAction({declarantUserId} = {}) {
  return withErrorHandling(async () => {
    const params = new URLSearchParams()

    if (declarantUserId) {
      params.set('declarantUserId', declarantUserId)
    }

    const query = params.toString()
    return fetchJSON(`api/declarations/quick/context${query ? `?${query}` : ''}`)
  })
}

function buildQuickDeclarationPayload({
  type,
  declarantUserId,
  measurementType,
  readingDate,
  periodStartDate,
  periodEndDate,
  entries = [],
  pointUsageNames = [],
  comment
} = {}) {
  const normalizedType = (type || '').trim().toLocaleLowerCase('fr-FR')
  const normalizedMeasurementType = measurementType || 'INDEX'

  if (normalizedMeasurementType === 'INDEX' && !readingDate) {
    throw new Error('Date de relevé requise.')
  }

  if (normalizedMeasurementType !== 'INDEX' && (!periodStartDate || !periodEndDate)) {
    throw new Error('Période requise.')
  }

  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error('Aucune valeur saisie.')
  }

  const payload = {
    measurementType: normalizedMeasurementType,
    entries
  }

  if (normalizedMeasurementType === 'INDEX') {
    payload.readingDate = readingDate
  } else {
    payload.periodStartDate = periodStartDate
    payload.periodEndDate = periodEndDate
  }

  if (normalizedType) {
    payload.type = normalizedType
  }

  if (declarantUserId) {
    payload.declarantUserId = declarantUserId
  }

  if (Array.isArray(pointUsageNames) && pointUsageNames.length > 0) {
    payload.pointUsageNames = pointUsageNames
  }

  if (typeof comment === 'string' && comment.trim()) {
    payload.comment = comment.trim()
  }

  return payload
}

export async function previewQuickDeclarationConflictsAction(payload) {
  return withErrorHandling(async () =>
    fetchJSON('api/declarations/quick/conflicts', {
      method: 'POST',
      body: buildQuickDeclarationPayload(payload)
    }))
}

export async function createQuickDeclarationAction(payload) {
  return withErrorHandling(async () => {
    const data = await fetchJSON('api/declarations/quick', {
      method: 'POST',
      body: buildQuickDeclarationPayload(payload)
    })

    await revalidateDeclarationPaths(data?.data?.id)

    return data
  })
}

export async function getDeclarationAction(declarationId) {
  return getCachedDeclaration(declarationId)
}

export async function getAvailablePointsPrelevementsForDeclarationAction(declarationId) {
  return withErrorHandling(async () => {
    if (!declarationId) {
      throw new Error('declarationId est requis.')
    }

    return fetchJSON(`api/declarations/${declarationId}/available-points-prelevements`)
  })
}

export async function reconcileDeclarationChunkAction({
  declarationId,
  chunkId,
  pointPrelevementId
} = {}) {
  return withErrorHandling(async () => {
    if (!declarationId) {
      throw new Error('declarationId est requis.')
    }

    if (!chunkId) {
      throw new Error('chunkId est requis.')
    }

    if (pointPrelevementId === undefined) {
      throw new Error('pointPrelevementId est requis.')
    }

    const data = await fetchJSON(`api/declarations/${declarationId}/chunks/${chunkId}/reconcile`, {
      method: 'POST',
      body: {
        pointPrelevementId
      }
    })

    await revalidateDeclarationPaths(declarationId)

    return data
  })
}

function normalizeDeclarationActionInput(input) {
  if (typeof input === 'object' && input !== null) {
    return {
      declarationId: input.declarationId,
      sourceId: input.sourceId
    }
  }

  return {
    declarationId: input,
    sourceId: null
  }
}

export async function deleteDeclarationAction(input) {
  return withErrorHandling(async () => {
    const {declarationId, sourceId} = normalizeDeclarationActionInput(input)

    if (!declarationId) {
      throw new Error('declarationId est requis.')
    }

    const data = await fetchJSON(`api/admin/declarations/${declarationId}`, {
      method: 'DELETE'
    })

    revalidatePath('/declarations')
    revalidatePath('/declarations/me')
    revalidatePath('/mes-declarations')
    revalidatePath(`/declarations/${declarationId}`)
    revalidatePath(`/mes-declarations/${declarationId}`)
    if (sourceId) {
      revalidatePath(`/declarations/${sourceId}`)
    }

    return data
  })
}

export async function replayDeclarationAction(input) {
  return withErrorHandling(async () => {
    const {declarationId, sourceId} = normalizeDeclarationActionInput(input)

    if (!declarationId) {
      throw new Error('declarationId est requis.')
    }

    const data = await fetchJSON(`api/admin/declarations/${declarationId}/replay`, {
      method: 'POST'
    })

    await revalidateDeclarationPaths(declarationId)
    if (sourceId) {
      revalidatePath(`/declarations/${sourceId}`)
    }

    return data
  })
}

export async function requestDeclarationPointsChangeAction({
  declarationId,
  message
} = {}) {
  return withErrorHandling(async () => {
    if (!declarationId) {
      throw new Error('declarationId est requis.')
    }

    const normalizedMessage = String(message ?? '').trim()

    if (!normalizedMessage) {
      throw new Error('Le message est requis.')
    }

    return fetchJSON(`api/declarations/${declarationId}/points-change-request`, {
      method: 'POST',
      body: {
        message: normalizedMessage
      }
    })
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
