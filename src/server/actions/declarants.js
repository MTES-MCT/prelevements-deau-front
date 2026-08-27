'use server'

import {revalidatePath} from 'next/cache'

import {buildCollecteurAssociationQuery} from '@/lib/collecteur-association-search.js'
import {toDeclarantsListResult} from '@/lib/declarant-list.js'
import {buildDeclarantsApiSearchQuery} from '@/lib/declarant-search.js'
import {
  fetchJSON,
  withErrorHandling
} from '@/server/api-wrapper.js'
import {cachePerRequest} from '@/server/request-cache.js'

export async function getDeclarantsAction() {
  return withErrorHandling(async () => fetchJSON('api/declarants'))
}

const getCachedDeclarantsSearch = cachePerRequest(async query => withErrorHandling(
  async () => toDeclarantsListResult(await fetchJSON(`api/declarants/search?${query}`))
))

export async function searchDeclarantsAction(options) {
  return getCachedDeclarantsSearch(buildDeclarantsApiSearchQuery(options))
}

const getCachedCollecteurPreleveursSearch = cachePerRequest(async query => withErrorHandling(
  async () => toDeclarantsListResult(
    await fetchJSON(`api/collecteurs/me/preleveurs/search?${query}`)
  )
))

export async function searchCollecteurPreleveursAction(options) {
  return getCachedCollecteurPreleveursSearch(buildDeclarantsApiSearchQuery(options))
}

export async function getCollecteurPreleveursAction() {
  return withErrorHandling(async () => fetchJSON('api/collecteurs/me/preleveurs'))
}

export async function getCollecteurExploitationCandidatesAction(
  collecteurId,
  options,
  {idsOnly = false} = {}
) {
  const query = buildCollecteurAssociationQuery(options, {idsOnly})

  return withErrorHandling(async () => (
    fetchJSON(`api/collecteurs/${collecteurId}/exploitations/candidates?${query}`)
  ), {forbiddenOnAccessDenied: false})
}

export async function updateCollecteurExploitationAssociationsAction(
  collecteurId,
  payload,
  associationVersion
) {
  return withErrorHandling(async () => {
    const hasRemoval = Array.isArray(payload?.removeExploitationIds)
      && payload.removeExploitationIds.length > 0
    const result = await fetchJSON(`api/collecteurs/${collecteurId}/exploitations`, {
      method: 'PATCH',
      headers: hasRemoval && associationVersion
        ? {'If-Match': associationVersion}
        : {},
      body: payload
    })

    revalidatePath('/declarants')
    revalidatePath(`/declarants/${collecteurId}`)
    revalidatePath(`/declarants/${collecteurId}/exploitations`)
    revalidatePath('/exploitations/[id]', 'page')
    revalidatePath('/exploitations/[id]/edit', 'page')
    revalidatePath('/zones/[zoneId]/exploitations', 'page')

    return result
  }, {forbiddenOnAccessDenied: false})
}

const getCachedDeclarantOverview = cachePerRequest(async id => withErrorHandling(
  async () => fetchJSON(`api/declarants/${id}/overview`)
))

export async function getDeclarantOverviewAction(id) {
  return getCachedDeclarantOverview(id)
}

export async function createPreleveurAction(payload) {
  return withErrorHandling(async () => {
    const result = await fetchJSON('api/declarants', {
      method: 'POST',
      body: payload
    })
    revalidatePath('/declarants')
    revalidatePath('/preleveurs')
    for (const zoneId of payload.zoneIds || []) {
      revalidatePath(`/zones/${zoneId}/declarants`)
      revalidatePath(`/zones/${zoneId}/collecteurs`)
    }

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
    revalidatePath(`/declarants/${idPreleveur}/gestion`)
    revalidatePath(`/preleveurs/${idPreleveur}`)
    return result
  })
}

export async function sendDeclarantAccountCreationNotificationAction(declarantId) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/declarants/${declarantId}/notifications/account-creation`, {
      method: 'POST'
    })
    revalidatePath('/declarants')
    revalidatePath(`/declarants/${declarantId}`)
    revalidatePath(`/declarants/${declarantId}/gestion`)
    return result
  })
}

export async function getDeclarantZonesAction(declarantId) {
  return withErrorHandling(async () => fetchJSON(`api/declarants/${declarantId}/zones`))
}

export async function updateDeclarantZonesAction(declarantId, zoneIds) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/declarants/${declarantId}/zones`, {
      method: 'PUT',
      body: {zoneIds}
    })

    revalidatePath('/declarants')
    revalidatePath(`/declarants/${declarantId}`)
    revalidatePath(`/declarants/${declarantId}/gestion`)
    for (const zoneId of zoneIds) {
      revalidatePath(`/zones/${zoneId}/declarants`)
      revalidatePath(`/zones/${zoneId}/collecteurs`)
    }

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

export async function listDeclarantEmailAliasesAction(declarantId) {
  return withErrorHandling(async () => fetchJSON(`api/declarants/${declarantId}/email-aliases`))
}

export async function listDeclarantContactEmailsAction(declarantId) {
  return withErrorHandling(async () => fetchJSON(`api/declarants/${declarantId}/contact-emails`))
}

export async function updateDeclarantContactEmailsAction(declarantId, contactEmails) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/declarants/${declarantId}/contact-emails`, {
      method: 'PUT',
      body: {contactEmails}
    })

    revalidatePath('/declarants')
    revalidatePath(`/declarants/${declarantId}`)
    revalidatePath(`/declarants/${declarantId}/edit`)

    return result
  })
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
