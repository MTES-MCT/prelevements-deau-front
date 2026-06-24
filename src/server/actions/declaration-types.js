'use server'

import {revalidatePath} from 'next/cache'

import {fetchJSON, withErrorHandling} from '@/server/api-wrapper.js'

export async function listDeclarationTypesAction() {
  return withErrorHandling(async () => fetchJSON('api/admin/declaration-types'))
}

export async function createDeclarationTypeAction(payload) {
  return withErrorHandling(async () => {
    const result = await fetchJSON('api/admin/declaration-types', {
      method: 'POST',
      body: payload
    })

    revalidatePath('/types-declaration')
    revalidatePath('/mes-declarations')

    return result
  })
}

export async function updateDeclarationTypeAction(declarationTypeId, payload) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/admin/declaration-types/${declarationTypeId}`, {
      method: 'PUT',
      body: payload
    })

    revalidatePath('/types-declaration')
    revalidatePath('/mes-declarations')

    return result
  })
}

export async function disableDeclarationTypeAction(declarationTypeId) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/admin/declaration-types/${declarationTypeId}`, {
      method: 'DELETE'
    })

    revalidatePath('/types-declaration')
    revalidatePath('/mes-declarations')

    return result
  })
}

export async function restoreDeclarationTypeAction(declarationTypeId) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/admin/declaration-types/${declarationTypeId}/restore`, {
      method: 'POST'
    })

    revalidatePath('/types-declaration')
    revalidatePath('/mes-declarations')

    return result
  })
}

export async function getDeclarantDeclarationTypesAction(declarantId) {
  return withErrorHandling(async () => fetchJSON(`api/declarants/${declarantId}/declaration-types`))
}

export async function addDeclarantDeclarationTypeAction(declarantId, payload) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/declarants/${declarantId}/declaration-types`, {
      method: 'POST',
      body: payload
    })

    revalidatePath(`/declarants/${declarantId}`)
    revalidatePath(`/declarants/${declarantId}/gestion`)
    revalidatePath('/mes-declarations')

    return result
  })
}

export async function updateDeclarantDeclarationTypeAction(declarantId, linkId, payload) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/declarants/${declarantId}/declaration-types/${linkId}`, {
      method: 'PUT',
      body: payload
    })

    revalidatePath(`/declarants/${declarantId}`)
    revalidatePath(`/declarants/${declarantId}/gestion`)
    revalidatePath('/mes-declarations')

    return result
  })
}

export async function removeDeclarantDeclarationTypeAction(declarantId, linkId) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/declarants/${declarantId}/declaration-types/${linkId}`, {
      method: 'DELETE'
    })

    revalidatePath(`/declarants/${declarantId}`)
    revalidatePath(`/declarants/${declarantId}/gestion`)
    revalidatePath('/mes-declarations')

    return result
  })
}
