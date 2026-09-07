const ACCESS_STATUS_LABELS = Object.freeze({
  ACTIVE: 'Avec accès actif',
  FUTURE: 'Accès à venir',
  ENDED: 'Accès terminés',
  NONE: 'Aucun accès'
})

const ACCOUNT_STATUS_LABELS = Object.freeze({
  ACTIVE: 'Actif',
  DISABLED: 'Désactivé'
})

export function getAgentName(agent) {
  return [agent?.firstName, agent?.lastName].filter(Boolean).join(' ').trim()
    || agent?.email
    || 'Agent sans nom'
}

export function getAgentAccountStatusLabel(status) {
  return ACCOUNT_STATUS_LABELS[status] ?? status ?? 'État inconnu'
}

export function getAgentAccessStatusLabel(status) {
  return ACCESS_STATUS_LABELS[status] ?? status ?? 'État inconnu'
}

export function getAgentActiveZoneSummary(agent) {
  const activeCount = Number(agent?.activeHabilitationsCount ?? 0)
  const futureCount = Number(agent?.futureHabilitationsCount ?? 0)

  if (activeCount > 0) {
    return `${activeCount} zone${activeCount > 1 ? 's' : ''} active${activeCount > 1 ? 's' : ''}`
  }

  if (futureCount > 0) {
    return `${futureCount} accès à venir`
  }

  return 'Aucun accès actif'
}

export function getAgentVisibleZones(agent, limit = 2) {
  const zones = Array.isArray(agent?.zones) ? agent.zones : []
  const relevantZones = zones.filter(zone => ['ACTIVE', 'FUTURE'].includes(zone?.status))

  return {
    visible: relevantZones.slice(0, limit),
    remainingCount: Math.max(0, relevantZones.length - limit)
  }
}

export function getAgentHabilitations(agent) {
  return Array.isArray(agent?.habilitations) ? agent.habilitations : []
}

export function getAgentCurrentAndFutureZoneIds(agent) {
  return new Set(getAgentHabilitations(agent)
    .filter(habilitation => ['ACTIVE', 'FUTURE'].includes(habilitation?.status))
    .map(habilitation => habilitation.zone?.id ?? habilitation.zoneId)
    .filter(Boolean))
}

export function groupZoneOptions(zones = []) {
  const labels = {
    REGION: 'Régions',
    DEPARTEMENT: 'Départements',
    SAGE: 'SAGE'
  }
  const groups = new Map()

  for (const zone of zones) {
    const type = zone?.type ?? 'AUTRE'
    const label = labels[type] ?? 'Autres zones'

    if (!groups.has(label)) {
      groups.set(label, [])
    }

    groups.get(label).push({
      value: zone.id,
      label: zone.name,
      content: zone.name
    })
  }

  const groupOrder = ['Régions', 'Départements', 'SAGE', 'Autres zones']

  return [...groups.entries()]
    .sort(([left], [right]) => groupOrder.indexOf(left) - groupOrder.indexOf(right))
    .map(([label, options]) => ({
      label,
      options: options.sort((left, right) => left.label.localeCompare(right.label, 'fr'))
    }))
}
