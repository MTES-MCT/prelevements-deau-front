'use server'

import {revalidatePath} from 'next/cache'

import {
  fetchJSON,
  withErrorHandling
} from '@/server/api-wrapper.js'

export async function getDeclarantsAction() {
  return withErrorHandling(async () => fetchJSON('api/declarants'))
}

export async function getCollecteurPreleveursAction() {
  return withErrorHandling(async () => fetchJSON('api/collecteurs/me/preleveurs'))
}

export async function getDeclarantAction(id) {
  return withErrorHandling(async () => fetchJSON(`api/declarants/${id}`))
}

export async function createPreleveurAction(payload) {
  return withErrorHandling(async () => {
    const result = await fetchJSON('api/declarants', {
      method: 'POST',
      body: payload
    })
    revalidatePath('/declarants')
    revalidatePath('/preleveurs')
    return result
  })
}

export async function updatePreleveurAction(idPreleveur, payload) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/declarants/${idPreleveur}`, {
      method: 'PUT',
      body: payload
    })
    revalidatePath('/declarants')
    revalidatePath('/preleveurs')
    revalidatePath(`/declarants/${idPreleveur}`)
    revalidatePath(`/declarants/${idPreleveur}/edit`)
    revalidatePath(`/preleveurs/${idPreleveur}`)
    return result
  })
}

export async function sendDeclarantAccountCreationNotificationAction(declarantId) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/declarants/${declarantId}`, {
      method: 'PUT',
      body: {
        notifyAccountCreation: true
      }
    })
    revalidatePath('/declarants')
    revalidatePath(`/declarants/${declarantId}`)
    return result
  })
}

export async function deletePreleveurAction(idPreleveur) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/declarants/${idPreleveur}`, {
      method: 'DELETE'
    })
    revalidatePath('/declarants')
    revalidatePath('/preleveurs')
    return result
  })
}

export async function getPointsFromPreleveurAction(idPreleveur) {
  return withErrorHandling(async () => {
    try {
      return await fetchJSON(`api/preleveurs/${idPreleveur}/points-prelevement`)
    } catch (error) {
      if (error.code === 404) {
        return []
      }

      throw error
    }
  })
}

export async function getExploitationFromPreleveurAction(idPreleveur) {
  return withErrorHandling(async () => fetchJSON(`api/preleveurs/${idPreleveur}/exploitations`))
}

export async function sendDeclarationReminderAction(declarantId) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/declarants/${declarantId}/send-reminder`, {
      method: 'POST'
    })
    revalidatePath(`/declarants/${declarantId}`)
    return result
  })
}

export async function listDeclarantEmailAliasesAction(declarantId) {
  return withErrorHandling(async () => fetchJSON(`api/declarants/${declarantId}/email-aliases`))
}

export async function createDeclarantEmailAliasAction(declarantId, email) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/declarants/${declarantId}/email-aliases`, {
      method: 'POST',
      body: {email}
    })

    revalidatePath('/declarants')
    revalidatePath('/mon-compte')
    revalidatePath(`/declarants/${declarantId}`)
    revalidatePath(`/declarants/${declarantId}/edit`)

    return result
  })
}

export async function deleteDeclarantEmailAliasAction(declarantId, emailAliasId) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/declarants/${declarantId}/email-aliases/${emailAliasId}`, {
      method: 'DELETE'
    })

    revalidatePath('/declarants')
    revalidatePath('/mon-compte')
    revalidatePath(`/declarants/${declarantId}`)
    revalidatePath(`/declarants/${declarantId}/edit`)

    return result
  })
}
