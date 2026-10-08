'use server'

import {revalidatePath} from 'next/cache'
import {fetchJSON, withErrorHandling} from '@/server/api-wrapper.js'

export async function getCollectorPointManagementAdminAction(collecteurId) {
  // API rechecks the current admin session, including for a direct action call.
  return withErrorHandling(async () => fetchJSON(`api/collecteurs/${encodeURIComponent(collecteurId)}/point-management`), {
    forbiddenOnAccessDenied: false
  })
}

export async function updateCollectorPointManagementAction(collecteurId, payload) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/collecteurs/${encodeURIComponent(collecteurId)}/point-management`, {
      method: 'PATCH', body: payload
    })
    revalidatePath(`/declarants/${collecteurId}/gestion`)
    revalidatePath('/points-prelevement')
    revalidatePath('/points-prelevement/[id]/edit', 'page')
    return result
  }, {forbiddenOnAccessDenied: false})
}
