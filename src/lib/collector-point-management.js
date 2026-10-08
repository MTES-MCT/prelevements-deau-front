import {isCollecteurDeclarant} from './declarant-detail.js'

export function canConfigureCollectorPointManagement(sessionInfo, declarant) {
  return sessionInfo?.role === 'ADMIN'
    && !sessionInfo.impersonation?.active
    && isCollecteurDeclarant(declarant)
    && !declarant?.deletedAt
    && !declarant?.user?.deletedAt
}

export function collectorManagementHasChanges(current, saved) {
  return current.enabled !== saved.enabled
    || current.zoneIds.length !== saved.zoneIds.length
    || current.zoneIds.some(id => !saved.zoneIds.includes(id))
}

export function collectorManagementZoneOptions(availableZones, selectedZones = []) {
  const zones = new Map([...availableZones, ...selectedZones].map(zone => [zone.id, zone]))
  return [['REGION', 'Régions'], ['DEPARTEMENT', 'Départements'], ['SAGE', 'SAGE']]
    .map(([type, label]) => ({
      label,
      options: [...zones.values()].filter(zone => zone.type === type)
        .sort((left, right) => left.name.localeCompare(right.name, 'fr'))
        .map(zone => ({value: zone.id, label: zone.name, content: zone.name}))
    }))
    .filter(group => group.options.length > 0)
}
