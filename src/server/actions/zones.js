'use server'

import {revalidatePath} from 'next/cache'

import {
  fetchJSON,
  withErrorHandling
} from '@/server/api-wrapper.js'

function revalidateZonePaths(zoneId) {
  revalidatePath('/zones')
  revalidatePath(`/zones/${zoneId}`)
  revalidatePath(`/zones/${zoneId}/instructeurs`)
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

export async function getZoneDeclarantsAction(zoneId) {
  return withErrorHandling(async () => fetchJSON(`api/zones/${zoneId}/declarants`))
}

export async function getZoneInstructorsAction(zoneId) {
  return withErrorHandling(async () => fetchJSON(`api/zones/${zoneId}/instructeurs`))
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

export async function deleteZoneInstructorAction(zoneId, instructorUserId) {
  return withErrorHandling(async () => {
    const result = await fetchJSON(`api/zones/${zoneId}/instructeurs/${instructorUserId}`, {
      method: 'DELETE'
    })

    revalidateZonePaths(zoneId)

    return result
  })
}
