'use server'

import {revalidatePath} from 'next/cache'

import {
  fetchJSON,
  withErrorHandling
} from '@/server/api-wrapper.js'

export async function getReglesFromPreleveurAction(declarantId) {
  return withErrorHandling(async () => {
    try {
      return await fetchJSON(`api/preleveurs/${declarantId}/regles`)
    } catch (error) {
      if (error.code === 404) {
        return []
      }

      throw error
    }
  })
}

export async function getRegleAction(regleId) {
  return withErrorHandling(async () => fetchJSON(`api/regles/${regleId}`))
}

export async function createRegleAction(declarantId, payload) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/preleveurs/${declarantId}/regles`, {
      method: 'POST',
      body: payload
    })
    revalidatePath(`/declarants/${declarantId}`)
    revalidatePath(`/preleveurs/${declarantId}`)
    return result
  })
}

export async function updateRegleAction(regleId, payload, declarantId) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/regles/${regleId}`, {
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

export async function deleteRegleAction(regleId, declarantId) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/regles/${regleId}`, {
      method: 'DELETE'
    })
    if (declarantId) {
      revalidatePath(`/declarants/${declarantId}`)
      revalidatePath(`/preleveurs/${declarantId}`)
    }

    return result
  })
}
