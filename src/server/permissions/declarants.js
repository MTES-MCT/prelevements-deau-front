import {getCurrentUser} from '@/server/actions/user.js'
import {getZoneAction, getZonesAction} from '@/server/actions/zones.js'

export async function canCurrentUserCreateDeclarant({zoneId = null} = {}) {
  const currentUserResult = await getCurrentUser()
  const currentRole = currentUserResult?.data?.role

  if (currentRole === 'ADMIN') {
    return true
  }

  if (currentRole !== 'INSTRUCTOR') {
    return false
  }

  if (zoneId) {
    const zoneResult = await getZoneAction(zoneId)
    return Boolean(zoneResult.success && zoneResult.data?.isAdmin)
  }

  const zonesResult = await getZonesAction()
  const zones = zonesResult.success && Array.isArray(zonesResult.data)
    ? zonesResult.data
    : []

  return zones.some(zone => zone.isAdmin)
}
