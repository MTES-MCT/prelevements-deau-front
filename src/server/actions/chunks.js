'use server'

import {revalidatePath} from 'next/cache'

import {fetchJSON, withErrorHandling} from '@/server/api-wrapper.js'

export async function instructChunkAction({
  chunkId,
  pointPrelevementId,
  status,
  comment
} = {}) {
  return withErrorHandling(async () => {
    if (!chunkId || typeof chunkId !== 'string') {
      throw new Error('chunkId est requis.')
    }

    const normalizedStatus = typeof status === 'string' ? status.trim() : ''
    const allowedStatuses = ['PENDING', 'REJECTED', 'VALIDATED']

    if (!allowedStatuses.includes(normalizedStatus)) {
      throw new Error('Statut invalide.')
    }

    const payload = {
      instructionStatus: normalizedStatus
    }

    if (typeof pointPrelevementId === 'string' && pointPrelevementId.trim()) {
      payload.pointPrelevementId = pointPrelevementId.trim()
    } else {
      payload.pointPrelevementId = null
    }

    if (typeof comment === 'string' && comment.trim()) {
      payload.instructionComment = comment.trim()
    } else {
      payload.instructionComment = null
    }

    const data = await fetchJSON(`api/chunks/${chunkId}/instruction`, {
      method: 'POST',
      body: payload
    })

    revalidateInstructorChunkPaths({
      sourceId: null,
      declarationId: data?.data?.declarationId
    })

    return data
  })
}

function revalidateInstructorChunkPaths({sourceId, declarationId} = {}) {
  revalidatePath('/declarations')
  revalidatePath('/mes-declarations')

  if (sourceId) {
    revalidatePath(`/declarations/${sourceId}`)
  }

  if (declarationId) {
    revalidatePath(`/mes-declarations/${declarationId}`)
  }
}
