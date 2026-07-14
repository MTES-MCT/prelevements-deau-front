import test from 'ava'

import {
  getMonitoringStationMapSummary,
  getMonitoringStationURL
} from './monitoring-stations.js'

test('getMonitoringStationMapSummary conserve seulement la dernière mesure', t => {
  const summary = getMonitoringStationMapSummary({
    id: 'station-id',
    type: 'PIEZOMETER',
    label: 'Ortaffa',
    stationCode: '10971X0198/LAFAR',
    zones: [{id: 'zone-id', name: 'BV du Tech'}],
    values: [
      {at: '2026-07-10T08:00:00Z', depth: 4.2, levelNgf: 24.9},
      {at: '2026-07-12T08:00:00Z', depth: 4.4, levelNgf: 24.7}
    ]
  })

  t.deepEqual(summary.latestMeasurement, {
    at: '2026-07-12T08:00:00Z',
    depth: 4.4,
    levelNgf: 24.7,
    origin: undefined,
    aggregation: undefined
  })
  t.false('values' in summary)
})

test('getMonitoringStationURL construit les fiches officielles', t => {
  t.is(
    getMonitoringStationURL({type: 'PIEZOMETER', stationCode: '10971X0198/LAFAR'}),
    'https://ades.eaufrance.fr/Fiche/PtEau?Code=10971X0198%2FLAFAR'
  )
  t.is(
    getMonitoringStationURL({type: 'FLOW_STATION', stationCode: 'Y020401001'}),
    'https://www.hydro.eaufrance.fr/stationhydro/Y020401001/fiche'
  )
})
