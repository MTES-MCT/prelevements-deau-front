import test from 'ava'
import {buildQuickReadingChart, getIndexIntervalBounds, indexReadingsByDay} from './quick-reading-chart.js'

test('l’historique du graphique déduplique les relevés et les volumes de la déclaration et écarte les données ultérieures', t => {
  const current = {date: '2026-06-18', value: {id: 'milieu', value: '65.21'}}
  const prior = {date: '2026-05-10', value: {id: 'ancien', value: 50}}
  const later = {date: '2026-07-19', value: {id: 'suivant', value: '75.21'}}
  const reported = {id: 'calcul', periodStart: prior.date, periodEnd: current.date, value: '15.21'}
  const future = {id: 'futur', periodStart: current.date, periodEnd: later.date, value: '10'}
  const {indexes, intervals} = buildQuickReadingChart({
    readings: [current],
    history: [later, {...current, value: {...current.value}}, prior],
    volumes: [reported],
    volumeHistory: [{...reported}, future, {...reported, id: 'écrasé', isOverwritten: true}]
  })
  t.deepEqual(indexes.map(point => [point.day, point.amount]), [['2026-05-10', 50], ['2026-06-18', 65.21]])
  t.deepEqual(intervals.map(period => [period.start, period.end, period.amount]), [['2026-05-10', '2026-06-18', 15.21]])
  t.deepEqual(indexes.map(point => point.current), [false, true])
  t.true(intervals[0].current)
})

test('une déclaration de volume conserve les index historiques et les périodes calculées avec leur véritable nature', t => {
  const current = {id: 'saisie', valueKind: 'DECLARED', value: 30, periodStart: '2026-06-10', periodEnd: '2026-06-16'}
  const history = ['2026-06-10', '2026-06-15', '2026-06-16'].map((date, i) => ({date, value: {id: date, value: 20 + i * 10}}))
  const {indexes, intervals} = buildQuickReadingChart({
    declared: true, volumes: [current], history,
    volumeHistory: [{...current}, {id: 'calcul', valueKind: 'COMPUTED', value: 10, periodStart: '2026-06-10', periodEnd: '2026-06-15'}]
  })
  t.deepEqual(indexes.map(row => [row.day, row.current]), [['2026-06-10', false], ['2026-06-15', false]])
  t.deepEqual(intervals.map(row => [row.value.id, row.end, row.direct, row.current]), [
    ['saisie', '2026-06-15', true, true], ['calcul', '2026-06-15', false, false]
  ])
})

test('un volume saisi pour une seule journée conserve sa fin métier inclusive même avec une borne de stockage exclusive', t => {
  const {indexes, intervals} = buildQuickReadingChart({
    declared: true,
    volumes: [{id: 'volume', value: '0', periodStart: '2026-03-29T00:00:00.000Z', periodEnd: '2026-03-30T00:00:00.000Z'}]
  })
  t.deepEqual(indexes, [])
  t.deepEqual(intervals.map(period => [period.start, period.end, period.amount]), [['2026-03-29', '2026-03-29', 0]])
})

test('dans le graphique d’index, un volume historique saisi et un volume calculé gardent leurs origines et périodes', t => {
  const {intervals} = buildQuickReadingChart({
    readings: [{date: '2026-06-20', value: {id: 'fin', value: '150'}}],
    volumes: [{id: 'variation', valueKind: 'COMPUTED', value: '5', periodStart: '2026-06-12', periodEnd: '2026-06-20'}],
    volumeHistory: [{id: 'saisie', valueKind: 'DECLARED', value: '42', periodStart: '2026-06-01', periodEnd: '2026-06-09'}]
  })
  t.deepEqual(intervals.map(period => [period.start, period.end, period.amount, period.direct]), [
    ['2026-06-01', '2026-06-08', 42, true], ['2026-06-12', '2026-06-20', 5, false]
  ])
})

test('une bande entre deux relevés concorde exactement avec le volume fourni par PE, même près de la limite de précision', t => {
  const start = {day: '2026-05-01', value: {value: '9999999999999999.9997'}}
  const end = {day: '2026-06-01', value: {value: '9999999999999999.9999'}}
  const byDay = indexReadingsByDay([start, end])
  const interval = {start: start.day, end: end.day, value: {value: '2e-4'}}
  const bounds = getIndexIntervalBounds(interval, byDay)
  t.is(bounds.start, start)
  t.is(bounds.end, end)
  t.is(getIndexIntervalBounds({...interval, value: {value: '0.0003'}}, byDay), null)
  t.is(getIndexIntervalBounds({...interval, value: {value: 0}}, byDay), null)

  const stable = {...end, value: start.value}
  t.deepEqual(getIndexIntervalBounds({...interval, value: {value: 0}}, indexReadingsByDay([start, stable])), {start, end: stable})
})

test('seules les séries suivantes fournies explicitement prolongent le graphique du reçu', t => {
  const prior = {id: 'avant', value: 320, readingDate: '2026-05-15'}
  const current = {id: 'reçu', value: 380, readingDate: '2026-06-15'}
  const next = {id: 'après', value: 380, readingDate: '2026-07-15'}
  const reported = {id: '60', value: 60, valueKind: 'COMPUTED', periodStart: prior.readingDate, periodEnd: current.readingDate}
  const subsequent = {id: '0', value: 0, valueKind: 'COMPUTED', periodStart: current.readingDate, periodEnd: next.readingDate}
  const futureOnlyInLegacy = {...next, id: 'non qualifié', value: 500}
  const asReading = value => ({value, date: value.readingDate})
  const {indexes, intervals} = buildQuickReadingChart({
    readings: [asReading(current)], history: [prior, current, futureOnlyInLegacy].map(asReading), volumes: [reported],
    volumeHistory: [reported, subsequent, {...subsequent, id: 'non qualifié'}],
    following: {indexes: [current, next, {...next}], volumes: [reported, subsequent, {...subsequent}]}
  })
  t.deepEqual(indexes.map(row => [row.value.id, row.scope, row.current]), [
    ['avant', 'history', false], ['reçu', 'current', true], ['après', 'following', false]
  ])
  t.deepEqual(intervals.map(row => [row.amount, row.scope, row.current]), [[60, 'current', true], [0, 'following', false]])
})

test('une saisie directe, une baisse, une borne ambiguë ou absente conservent leur volume indépendant', t => {
  const first = {date: '2026-05-01', value: {value: 10, unit: 'm³'}}
  const last = {date: '2026-06-01', value: {value: 50, unit: 'm³'}}
  const {indexes, intervals: [volume]} = buildQuickReadingChart({
    readings: [last], history: [first],
    volumes: [{periodStart: first.date, periodEnd: last.date, value: 40, unit: 'm³'}]
  })
  const byDay = indexReadingsByDay(indexes)
  t.truthy(getIndexIntervalBounds(volume, byDay))
  t.is(getIndexIntervalBounds({...volume, direct: true}, byDay), null)
  t.is(getIndexIntervalBounds({...volume, value: {value: 40, unit: 'L'}}, byDay), null)
  t.is(getIndexIntervalBounds(volume, indexReadingsByDay([indexes[1]])), null)
  const decrease = indexReadingsByDay([indexes[0], {...indexes[1], value: {value: 4}}])
  t.is(getIndexIntervalBounds({...volume, value: {value: 4}}, decrease), null)
  const ambiguous = buildQuickReadingChart({
    readings: [last], history: [first, {...first, value: {value: 15}}]
  })
  t.is(getIndexIntervalBounds(volume, indexReadingsByDay(ambiguous.indexes)), null)
})
