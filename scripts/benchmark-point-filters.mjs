import {performance} from 'node:perf_hooks'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'

const moduleUrl = process.argv[2]
  ? pathToFileURL(resolve(process.argv[2]))
  : new URL('../src/lib/points-prelevement-filters.js', import.meta.url)
const {createPointFilterModel, filterPointsWithScores, getPointFacetCounts} = await import(moduleUrl)

// Run from the front root: node --loader ./ava-loader.js scripts/benchmark-point-filters.mjs
// Synthetic, in-memory data only; does not require an API, account or database.
// Optional argument: absolute path to a baseline copy of points-prelevement-filters.js.
for (const size of [1000, 10_000]) {
  const points = Array.from({length: size}, (_, i) => ({
    id: `point-${i}`, name: `Captage synthétique ${i}`, usageName: `Secteur ${i % 20}`,
    flowType: i % 5 ? 'PRELEVEMENT' : 'REJET',
    waterBodyType: i % 2 ? 'SUPERFICIELLE' : 'SOUTERRAIN',
    usages: [{code: i % 3 ? '2A' : '5', label: i % 3 ? 'Aspersion' : 'Eau potable'}],
    managementZones: [{id: `zone-${i % 20}`, name: `Zone ${i % 20}`, type: 'SAGE'}],
    exploitationStatuses: ['EN_ACTIVITE'], preleveurTypes: ['IRRIGANT'],
    collecteurStatus: i % 2 ? 'WITH_COLLECTEUR' : 'WITHOUT_COLLECTEUR',
    connectorStatus: i % 2 ? 'WITH_CONNECTOR' : 'WITHOUT_CONNECTOR',
    searchAccess: {declarants: true, exploitations: true}
  }))
  const {index, defaultFilters} = createPointFilterModel(points, {flowTypes: ['PRELEVEMENT', 'REJET']})
  for (const [scenario, filters] of Object.entries({
    all: defaultFilters,
    facets: {...defaultFilters, usageKeys: ['2'], managementZoneIds: ['zone-1', 'zone-2']},
    search: {...defaultFilters, query: 'secteur 12'}
  })) {
    const durations = []
    let count
    for (let iteration = 0; iteration < 12; iteration++) {
      const start = performance.now()
      const result = filterPointsWithScores(points, filters, index)
      getPointFacetCounts(points, filters, index, result.scores)
      count = result.points.length
      if (iteration > 1) durations.push(performance.now() - start)
    }
    durations.sort((a, b) => a - b)
    console.log(JSON.stringify({size, scenario, count, p50Ms: durations[4], p95Ms: durations[9]}))
  }
}
