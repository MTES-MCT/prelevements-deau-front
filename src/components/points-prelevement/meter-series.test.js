import test from 'ava'
import {getMeterSeriesQuery, loadMeterSeriesPages} from './meter-series.js'

const metadata = {readingSeries: true, frequency: 'instantaneous'}

test('seules les options compteur demandent les observations exactes', t => {
  t.deepEqual(getMeterSeriesQuery({meterId: 'meter', readingSeries: true}), {meterId: 'meter', temporalOperator: 'raw', aggregationFrequency: 'instantaneous'})
  t.deepEqual(getMeterSeriesQuery({metricTypeCode: 'index'}), {})
  t.deepEqual(getMeterSeriesQuery({meterId: 'meter'}), {})
})

test('toutes les pages et les observations du même jour sont conservées', async t => {
  const requests = []
  const result = await loadMeterSeriesPages(async query => {
    requests.push(query)
    return {metadata, values: [{date: '2026-09-16', values: [{readingId: query.cursor ? 'second' : 'first'}]}], nextCursor: query.cursor ? null : 'cursor'}
  })
  t.deepEqual(requests, [{limit: 5000}, {limit: 5000, cursor: 'cursor'}])
  t.deepEqual(result.values.flatMap(day => day.values.map(reading => reading.readingId)), ['first', 'second'])
  t.is(result.metadata.valuesCount, 2)
  t.is(result.metadata.minDate, '2026-09-16')
  t.is(result.metadata.maxDate, '2026-09-16')
  t.is(result.metadata.excludedReadingsCount, 2)
})

test('une erreur de page ou une boucle ne produit jamais une courbe partielle', async t => {
  await t.throwsAsync(() => loadMeterSeriesPages(async query => {
    if (query.cursor) throw new Error('Échec HTTP')
    return {metadata, values: [], nextCursor: 'cursor'}
  }), {message: 'Échec HTTP'})
  await t.throwsAsync(() => loadMeterSeriesPages(async () => ({metadata, values: [], nextCursor: 'cursor'})), {message: /pagination/})
  await t.throwsAsync(() => loadMeterSeriesPages(async () => ({values: []})), {message: /invalide/})
})

test('la limite de 20 000 refuse explicitement la troncature', async t => {
  let page = 0
  await t.throwsAsync(() => loadMeterSeriesPages(async () => ({metadata, values: [{date: '2026-09-16', values: Array.from({length: 5000}, () => ({}))}], nextCursor: String(++page)})), {message: /20 000/})
})
