export const DEFAULT_MAP_LAYER_VISIBILITY = Object.freeze({
  points: true,
  piezometers: true,
  flowStations: true
})

export const PRELEVEUR_MAP_LAYER_VISIBILITY = Object.freeze({
  points: true,
  piezometers: false,
  flowStations: false
})

export function resolveMapLayerVisibility(initialVisibility) {
  return {
    ...DEFAULT_MAP_LAYER_VISIBILITY,
    ...initialVisibility
  }
}

export function getVisibleMapFeatures({monitoringStations, points, visibleLayers}) {
  return {
    points: visibleLayers.points ? points : [],
    monitoringStations: monitoringStations.filter(station =>
      (station.type === 'PIEZOMETER' && visibleLayers.piezometers)
      || (station.type === 'FLOW_STATION' && visibleLayers.flowStations))
  }
}
