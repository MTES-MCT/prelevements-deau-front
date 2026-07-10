'use server'

import {revalidatePath} from 'next/cache'

import {
  fetchJSON,
  withErrorHandling
} from '@/server/api-wrapper.js'

const LIST_FILTER_KEYS = [
  'declarantRole',
  'role',
  'status',
  'usage',
  'collecteur',
  'collector',
  'email',
  'emailStatus'
]

function revalidateZonePaths(zoneId) {
  revalidatePath('/zones')
  revalidatePath(`/zones/${zoneId}`)
  revalidatePath(`/zones/${zoneId}/agents`)
  revalidatePath(`/zones/${zoneId}/declarants`)
  revalidatePath(`/zones/${zoneId}/collecteurs`)
  revalidatePath(`/zones/${zoneId}/suivi-declarations`)
  revalidatePath(`/zones/${zoneId}/points-prelevement`)
  revalidatePath(`/zones/${zoneId}/parametres-ressources`)
  revalidatePath(`/zones/${zoneId}/exploitations`)
}

function revalidatePointPaths(zoneId, pointId) {
  revalidateZonePaths(zoneId)
  revalidatePath('/points-prelevement')

  if (pointId) {
    revalidatePath(`/points-prelevement/${pointId}`)
    revalidatePath(`/points-prelevement/${pointId}/edit`)
  }
}

function revalidateExploitationPaths(zoneId, exploitationId) {
  revalidateZonePaths(zoneId)
  revalidatePath('/exploitations')

  if (exploitationId) {
    revalidatePath(`/exploitations/${exploitationId}`)
    revalidatePath(`/exploitations/${exploitationId}/edit`)
  }
}

function buildListSearch(options = {}) {
  const searchParams = new URLSearchParams()

  if (options.page) {
    searchParams.set('page', String(options.page))
  }

  if (options.perPage) {
    searchParams.set('perPage', String(options.perPage))
  }

  if (options.limit) {
    searchParams.set('limit', String(options.limit))
  }

  if (options.search) {
    searchParams.set('search', String(options.search))
  }

  for (const key of LIST_FILTER_KEYS) {
    if (options[key]) {
      searchParams.set(key, String(options[key]))
    }
  }

  const search = searchParams.toString()
  return search ? `?${search}` : ''
}

function buildMatrixSearch(options = {}) {
  const searchParams = new URLSearchParams()

  if (options.periodType) {
    searchParams.set('periodType', String(options.periodType))
  }

  if (options.periodCount) {
    searchParams.set('periodCount', String(options.periodCount))
  }

  if (options.periodKey) {
    searchParams.set('periodKey', String(options.periodKey))
  }

  if (options.months) {
    searchParams.set('months', String(options.months))
  }

  if (options.to) {
    searchParams.set('to', String(options.to))
  }

  const search = searchParams.toString()
  return search ? `?${search}` : ''
}

function dateToInputValue(value) {
  if (!value) {
    return null
  }

  return String(value).slice(0, 10)
}

function todayAsInputValue() {
  const now = new Date()
  const timezoneOffset = now.getTimezoneOffset() * 60_000

  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 10)
}

function buildInstructorPayload(instructor, notificationPayload) {
  return {
    instructorUserId: instructor.id,
    isAdmin: Boolean(instructor.isAdmin),
    startDate: dateToInputValue(instructor.startDate) || todayAsInputValue(),
    endDate: dateToInputValue(instructor.endDate),
    ...notificationPayload
  }
}

export async function getZonesAction() {
  return withErrorHandling(async () => fetchJSON('api/zones'))
}

export async function getZonesActions() {
  return getZonesAction()
}

export async function getZoneAction(zoneId) {
  return withErrorHandling(async () => fetchJSON(`api/zones/${zoneId}`))
}

export async function getZoneGeometryAction(zoneId) {
  return withErrorHandling(async () => fetchJSON(`api/zones/${zoneId}/geometry`))
}

export async function getZoneDeclarantsAction(zoneId, options = {}) {
  return withErrorHandling(async () => fetchJSON(`api/zones/${zoneId}/declarants${buildListSearch(options)}`))
}

export async function getZoneCollecteursAction(zoneId, options = {}) {
  return withErrorHandling(async () => fetchJSON(`api/zones/${zoneId}/collecteurs${buildListSearch(options)}`))
}

export async function getZoneDeclarationMonthlyStatusAction(zoneId, options = {}) {
  return withErrorHandling(async () => fetchJSON(`api/zones/${zoneId}/suivi-declarations${buildMatrixSearch(options)}`))
}

export async function getZoneDeclarationSettingsAction(zoneId) {
  return withErrorHandling(async () => fetchJSON(`api/zones/${zoneId}/declaration-settings`))
}

export async function updateZoneDeclarationSettingsAction(zoneId, payload) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/zones/${zoneId}/declaration-settings`, {
      method: 'PUT',
      body: payload
    })

    revalidateZonePaths(zoneId)

    return result
  })
}

export async function createZoneDeclarationOverrideAction(zoneId, payload) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/zones/${zoneId}/declaration-period-overrides`, {
      method: 'POST',
      body: payload
    })

    revalidateZonePaths(zoneId)

    return result
  })
}

export async function updateZoneDeclarationOverrideAction(zoneId, overrideId, payload) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/zones/${zoneId}/declaration-period-overrides/${overrideId}`, {
      method: 'PUT',
      body: payload
    })

    revalidateZonePaths(zoneId)

    return result
  })
}

export async function deleteZoneDeclarationOverrideAction(zoneId, overrideId) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/zones/${zoneId}/declaration-period-overrides/${overrideId}`, {
      method: 'DELETE'
    })

    revalidateZonePaths(zoneId)

    return result
  })
}

export async function getZoneMonitoringStationsAction(zoneId) {
  return withErrorHandling(async () => fetchJSON(`api/zones/${zoneId}/monitoring-stations`))
}

export async function createZoneMonitoringStationAction(zoneId, payload) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/zones/${zoneId}/monitoring-stations`, {
      method: 'POST',
      body: payload
    })

    revalidateZonePaths(zoneId)
    return result
  })
}

export async function updateZoneMonitoringStationAction(zoneId, associationId, payload) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/zones/${zoneId}/monitoring-stations/${associationId}`, {
      method: 'PATCH',
      body: payload
    })

    revalidateZonePaths(zoneId)
    return result
  })
}

export async function deleteZoneMonitoringStationAction(zoneId, associationId) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/zones/${zoneId}/monitoring-stations/${associationId}`, {
      method: 'DELETE'
    })

    revalidateZonePaths(zoneId)
    return result
  })
}

export async function getZoneInstructorsAction(zoneId) {
  return withErrorHandling(async () => fetchJSON(`api/zones/${zoneId}/instructeurs`))
}

export async function getZoneInstructorOptionsAction(zoneId, options = {}) {
  return withErrorHandling(async () => fetchJSON(`api/zones/${zoneId}/instructeurs/options${buildListSearch(options)}`))
}

export async function getZoneInstructorAction(zoneId, instructorUserId) {
  return withErrorHandling(async () => fetchJSON(`api/zones/${zoneId}/instructeurs/${instructorUserId}`))
}

export async function addZoneInstructorAction(zoneId, payload) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/zones/${zoneId}/instructeurs`, {
      method: 'POST',
      body: payload
    })

    revalidateZonePaths(zoneId)

    return result
  })
}

export async function sendZoneInstructorAccountCreationNotificationAction(zoneId, instructor) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/zones/${zoneId}/instructeurs`, {
      method: 'POST',
      body: buildInstructorPayload(instructor, {
        notifyAccountCreation: true,
        notifyZoneAttachment: false
      })
    })

    revalidateZonePaths(zoneId)

    return result
  })
}

export async function sendZoneInstructorAttachmentNotificationAction(zoneId, instructor) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/zones/${zoneId}/instructeurs`, {
      method: 'POST',
      body: buildInstructorPayload(instructor, {
        notifyAccountCreation: false,
        notifyZoneAttachment: true
      })
    })

    revalidateZonePaths(zoneId)

    return result
  })
}

export async function deleteZoneInstructorAction(zoneId, instructorUserId) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/zones/${zoneId}/instructeurs/${instructorUserId}`, {
      method: 'DELETE'
    })

    revalidateZonePaths(zoneId)

    return result
  })
}

export async function getZonePointsPrelevementAction(zoneId, options = {}) {
  return withErrorHandling(async () => fetchJSON(`api/zones/${zoneId}/points-prelevement${buildListSearch(options)}`))
}

export async function getZonePointsPrelevementOptionsAction(zoneId) {
  return withErrorHandling(async () => fetchJSON(`api/zones/${zoneId}/points-prelevement/options`))
}

export async function getZonePointPrelevementAction(zoneId, pointId) {
  return withErrorHandling(async () => fetchJSON(`api/zones/${zoneId}/points-prelevement/${pointId}`))
}

export async function createZonePointPrelevementAction(zoneId, payload) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/zones/${zoneId}/points-prelevement`, {
      method: 'POST',
      body: payload
    })

    revalidatePointPaths(zoneId, result?.id)

    return result
  })
}

export async function updateZonePointPrelevementAction(zoneId, pointId, payload) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/zones/${zoneId}/points-prelevement/${pointId}`, {
      method: 'PUT',
      body: payload
    })

    revalidatePointPaths(zoneId, pointId)

    return result
  })
}

export async function deleteZonePointPrelevementAction(zoneId, pointId) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/zones/${zoneId}/points-prelevement/${pointId}`, {
      method: 'DELETE'
    })

    revalidatePointPaths(zoneId, pointId)

    return result
  })
}

export async function getZoneExploitationsAction(zoneId, options = {}) {
  return withErrorHandling(async () => fetchJSON(`api/zones/${zoneId}/exploitations${buildListSearch(options)}`))
}

export async function getZoneExploitationAction(zoneId, exploitationId) {
  return withErrorHandling(async () => fetchJSON(`api/zones/${zoneId}/exploitations/${exploitationId}`))
}

export async function createZoneExploitationAction(zoneId, payload) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/zones/${zoneId}/exploitations`, {
      method: 'POST',
      body: payload
    })

    revalidateExploitationPaths(zoneId, result?.id)

    if (payload.declarantUserId) {
      revalidatePath(`/declarants/${payload.declarantUserId}`)
    }

    if (payload.pointPrelevementId) {
      revalidatePath(`/points-prelevement/${payload.pointPrelevementId}`)
    }

    for (const collecteurUserId of payload.collecteurUserIds ?? []) {
      revalidatePath(`/declarants/${collecteurUserId}`)
    }

    return result
  })
}

export async function updateZoneExploitationAction(zoneId, exploitationId, payload) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/zones/${zoneId}/exploitations/${exploitationId}`, {
      method: 'PUT',
      body: payload
    })

    revalidateExploitationPaths(zoneId, exploitationId)

    if (payload.declarantUserId) {
      revalidatePath(`/declarants/${payload.declarantUserId}`)
    }

    if (payload.pointPrelevementId) {
      revalidatePath(`/points-prelevement/${payload.pointPrelevementId}`)
    }

    for (const collecteurUserId of payload.collecteurUserIds ?? []) {
      revalidatePath(`/declarants/${collecteurUserId}`)
    }

    return result
  })
}

export async function deleteZoneExploitationAction(zoneId, exploitationId) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/zones/${zoneId}/exploitations/${exploitationId}`, {
      method: 'DELETE'
    })

    revalidateExploitationPaths(zoneId, exploitationId)

    return result
  })
}

export async function getZoneDeclarantOptionsAction(zoneId) {
  return withErrorHandling(async () => fetchJSON(`api/zones/${zoneId}/exploitations/declarants-options`))
}
