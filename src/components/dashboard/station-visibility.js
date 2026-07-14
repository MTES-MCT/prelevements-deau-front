export function getIsolatedStationId(stations, visibility) {
  const visibleStations = stations.filter(station => visibility[station.id] !== false)
  return visibleStations.length === 1 ? visibleStations[0].id : null
}

export function toggleStationIsolation(stations, visibility, stationId) {
  const showAll = getIsolatedStationId(stations, visibility) === stationId

  return Object.fromEntries(stations.map(station => [
    station.id,
    showAll || station.id === stationId
  ]))
}
