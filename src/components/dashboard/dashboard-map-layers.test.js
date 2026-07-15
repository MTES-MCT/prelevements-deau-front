import test from 'ava'

import {
  DEFAULT_MAP_LAYER_VISIBILITY,
  getVisibleMapFeatures,
  PRELEVEUR_MAP_LAYER_VISIBILITY,
  resolveMapLayerVisibility
} from './dashboard-map-layers.js'

const POINTS = [{id: 'point-1'}, {id: 'point-2'}]
const MONITORING_STATIONS = [
  {id: 'piezo-1', type: 'PIEZOMETER'},
  {id: 'flow-1', type: 'FLOW_STATION'}
]

test('toutes les couches restent visibles par défaut', t => {
  t.deepEqual(resolveMapLayerVisibility(), DEFAULT_MAP_LAYER_VISIBILITY)
})

test('la carte préleveur masque les couches de suivi de la ressource', t => {
  const visibleLayers = resolveMapLayerVisibility(PRELEVEUR_MAP_LAYER_VISIBILITY)
  const visibleFeatures = getVisibleMapFeatures({
    monitoringStations: MONITORING_STATIONS,
    points: POINTS,
    visibleLayers
  })

  t.deepEqual(visibleFeatures.points, POINTS)
  t.deepEqual(visibleFeatures.monitoringStations, [])
})

test('les couches activées sont incluses dans le cadrage', t => {
  const visibleFeatures = getVisibleMapFeatures({
    monitoringStations: MONITORING_STATIONS,
    points: POINTS,
    visibleLayers: {
      points: true,
      piezometers: true,
      flowStations: false
    }
  })

  t.deepEqual(visibleFeatures.points, POINTS)
  t.deepEqual(visibleFeatures.monitoringStations, [MONITORING_STATIONS[0]])
})
