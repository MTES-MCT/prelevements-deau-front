'use server'

import {revalidatePath} from 'next/cache'

import {fetchJSON, withErrorHandling} from '@/server/api-wrapper.js'

const PASSWORD_ACCESSES_PATH = '/administration/acces-mot-de-passe'

export async function listPasswordAccessesAction({limit = 100, search = ''} = {}) {
  return withErrorHandling(async () => {
    const searchParams = new URLSearchParams({limit: String(limit)})

    if (search.trim()) {
      searchParams.set('search', search.trim())
    }

    return fetchJSON(`admin/password-accesses?${searchParams.toString()}`)
  })
}

export async function createPasswordActivationAction(userId) {
  return withErrorHandling(async () => {
    const data = await fetchJSON('admin/password-accesses', {
      method: 'POST',
      body: {userId}
    })

    revalidatePath(PASSWORD_ACCESSES_PATH)
    return data
  })
}

export async function revokePasswordAccessAction(userId) {
  return withErrorHandling(async () => {
    const data = await fetchJSON(`admin/password-accesses/${encodeURIComponent(userId)}`, {
      method: 'DELETE'
    })

    revalidatePath(PASSWORD_ACCESSES_PATH)
    return data
  })
}
