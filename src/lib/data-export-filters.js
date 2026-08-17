const SANDRE_ZONE_GROUPS = [
  {
    type: 'SUP',
    label: 'Eaux superficielles'
  },
  {
    type: 'SOU',
    label: 'Eaux souterraines'
  }
]

function sortByLabel(options) {
  return [...options].sort((a, b) =>
    String(a.sortLabel || a.label || '').localeCompare(String(b.sortLabel || b.label || ''), 'fr', {
      sensitivity: 'base'
    })
  )
}

export function formatSandreZoneLabel(zone = {}) {
  const name = typeof zone.name === 'string' ? zone.name.trim() : ''
  const code = typeof zone.code === 'string' ? zone.code.trim() : ''

  if (name && code) {
    return `${name} — ${code}`
  }

  return name || code || zone.id || ''
}

export function buildSandreZoneOptions(zones = []) {
  return SANDRE_ZONE_GROUPS.map(group => ({
    label: group.label,
    options: sortByLabel(zones
      .filter(zone => zone.type === group.type)
      .map(zone => {
        const label = formatSandreZoneLabel(zone)

        return {
          value: zone.id,
          label,
          content: label,
          title: label,
          sortLabel: zone.name || zone.code || label
        }
      }))
  }))
}

export function getSandreZoneFilterLabels(filters = {}, optionLabels = new Map()) {
  const selectedIds = Array.isArray(filters.sandreZoneIds) ? filters.sandreZoneIds : []
  const snapshot = Array.isArray(filters.sandreZones) ? filters.sandreZones : []
  const snapshotLabels = new Map()

  for (const zone of snapshot) {
    const label = formatSandreZoneLabel(zone)

    if (zone?.id && label) {
      snapshotLabels.set(zone.id, label)
    }
  }

  if (selectedIds.length > 0) {
    return selectedIds.map(id => snapshotLabels.get(id) || optionLabels.get(id) || id)
  }

  // Certaines anciennes réponses API ne contiennent que le snapshot d’affichage.
  return snapshot
    .map(zone => formatSandreZoneLabel(zone))
    .filter(Boolean)
}
