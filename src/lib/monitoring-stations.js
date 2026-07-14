function asTimestamp(value) {
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY
}

function getLatestValue(values = []) {
  let latest = null
  for (const value of values) {
    if (!latest || asTimestamp(value.at) > asTimestamp(latest.at)) {
      latest = value
    }
  }

  return latest
}

function getLatestMeasurement(station) {
  const latest = getLatestValue(station.values)
  if (!latest) {
    return null
  }

  if (station.type === 'PIEZOMETER') {
    return {
      at: latest.at,
      depth: latest.depth,
      levelNgf: latest.levelNgf,
      origin: latest.origin,
      aggregation: latest.aggregation
    }
  }

  return {
    at: latest.at,
    valueLitersPerSecond: latest.valueLitersPerSecond,
    granularity: latest.granularity
  }
}

export function getMonitoringStationMapSummary(station) {
  return {
    id: station.id,
    type: station.type,
    label: station.label,
    providerLabel: station.providerLabel,
    stationCode: station.stationCode,
    bssId: station.bssId,
    siteCode: station.siteCode,
    coordinates: station.coordinates,
    details: station.details,
    zones: station.zones ?? [],
    latestMeasurement: getLatestMeasurement(station)
  }
}

export function getMonitoringStationURL(station) {
  if (!station?.stationCode) {
    return null
  }

  const stationCode = encodeURIComponent(station.stationCode)

  if (station.type === 'PIEZOMETER') {
    return `https://ades.eaufrance.fr/Fiche/PtEau?Code=${stationCode}`
  }

  if (station.type === 'FLOW_STATION') {
    return `https://www.hydro.eaufrance.fr/stationhydro/${stationCode}/fiche`
  }

  return null
}
