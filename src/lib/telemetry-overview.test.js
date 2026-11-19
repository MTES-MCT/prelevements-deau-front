import test from 'ava'
import {buildTelemetryOverview} from './telemetry-overview.js'

function index(day, value) {
  return {kind: 'index', day, amount: Number(value), value: {value, unit: 'm³'}}
}

function volume(start, end, value, kind = 'computed') {
  return {kind, day: end, start, end, amount: Number(value), value: {value, unit: 'm³'}}
}

const panel = (indexes, rows, key = indexes ? 'index' : 'volume') => ({key, unit: 'm³', indexes, rows})

test('la synthèse groupe par fin de période à Paris et garde les deux bornes et les mesures originales', t => {
  const april = index('2026-04-30T21:00:00Z', '1000')
  const may = index('2026-05-31T20:00:00Z', '1010')
  const august = index('2026-08-30T08:00:00Z', '1060')
  const acrossMidnight = volume(april.day, '2026-04-30T22:00:00Z', '2.000000000000000000000000000001')
  const later = volume(acrossMidnight.end, '2026-05-02T09:00:00Z', '0.100000000000000000000000000002')
  const zero = volume(acrossMidnight.end, later.end, '0', 'direct')
  const unordered = [later, zero, acrossMidnight]
  const {grain, buckets} = buildTelemetryOverview([panel(true, [august, april, may]), panel(false, unordered)])
  t.is(grain, 'month')
  t.deepEqual(buckets.map(b => b.key), ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08'])
  const [aprilBucket, mayBucket, juneBucket] = buckets
  t.is(mayBucket.start, Date.parse('2026-04-30T22:00:00Z'))
  t.is(mayBucket.panels[0].marks[0].row, may)
  t.true(mayBucket.panels[0].marks[0].connect)
  t.deepEqual(aprilBucket.panels[1].marks, [])
  const [computed, direct] = mayBucket.panels[1].marks
  t.is(computed.start, acrossMidnight.start)
  t.is(computed.end, later.end)
  t.is(computed.count, 2)
  t.is(computed.value.value, '2.100000000000000000000000000003')
  t.is(direct.kind, 'direct')
  t.is(direct.amount, 0)
  t.deepEqual(juneBucket.panels.flatMap(p => p.marks), [])
  t.false(buckets.at(-1).panels[0].marks[0].connect)
  t.is(mayBucket.panels[1].rows[0], acrossMidnight)
  t.is(unordered[0], later)
})

test('deux périodes chevauchantes sont signalées même si elles se terminent dans des mois différents', t => {
  const v1 = volume('2026-04-28T12:00:00Z', '2026-04-30T12:00:00Z', '92')
  const v2 = volume('2026-04-29T12:00:00Z', '2026-05-02T12:00:00Z', '123')
  const v3 = volume('2026-05-02T12:00:00Z', '2026-08-02T12:00:00Z', '1.2e3')
  const {buckets} = buildTelemetryOverview([panel(false, [v1, v2, v3]), panel(false, [v1], 'autre-compteur')])
  for (const b of buckets.slice(0, 2)) {
    const [mark] = b.panels[0].marks
    t.true(mark.overlapping)
    t.is(mark.amount, null)
    t.is(mark.value.value, null)
    t.is(b.panels[0].rows.length, 1)
  }
  t.is(buckets[0].panels[1].marks[0].amount, 92)
  t.is(buckets.at(-1).panels[0].marks[0].value.value, '1200')
})

test('une baisse au milieu du mois ou deux derniers index contradictoires interrompent la courbe', t => {
  const dates = ['2026-03-20', '2026-04-01', '2026-04-25', '2026-05-01', '2026-05-01', '2026-06-30']
  const values = ['1111111111111111111111.91', '1111111111111111111111.90', '1111111111111111111111.92', '600', '620', '700']
  const rows = dates.map((date, i) => index(date + 'T10:00:00Z', values[i]))
  const {buckets} = buildTelemetryOverview([panel(true, rows)])
  const [march, april, may, june] = buckets.map(b => b.panels[0].marks[0])
  t.is(march.value.value, values[0])
  t.is(april.row, rows[2])
  t.false(april.connect)
  t.is(may.amount, null)
  t.false(may.connect)
  t.false(june.connect)
})

test('les deux journées de changement d’heure gardent leurs durées civiles véritables', t => {
  for (const [dates, key, hours] of [
    [['2026-03-26', '2026-04-01'], '2026-03-29', 23],
    [['2026-10-23', '2026-10-29'], '2026-10-25', 25]
  ]) {
    const {grain, buckets} = buildTelemetryOverview([panel(true, dates.map(date => index(date + 'T10:00:00Z', '20')))])
    t.is(grain, 'day')
    const b = buckets.find(b => b.key === key)
    t.is(b.end - b.start, hours * 3600000)
  }
})

test('chaque occurrence de l’heure répétée reste identifiable et les tranches restent bornées', t => {
  const {grain, buckets} = buildTelemetryOverview([panel(true,
    ['2026-10-24T22:00:00Z', '2026-10-25T05:00:00Z'].map(d => index(d, '12')))])
  t.is(grain, 'hour')
  const repeated = buckets.filter(b => b.shortLabel === '02:00')
  t.is(repeated.length, 2)
  t.regex(repeated[0].label, /UTC\+2/)
  t.regex(repeated[1].label, /UTC\+1/)
  t.not(repeated[0].key, repeated[1].key)
  for (const range of [
    ['2026-01-01T00:00:00.001Z', '2026-01-01T00:00:00.008Z'],
    ['1950-04-10T00:00:00Z', '2026-10-25T12:00:00Z']
  ]) {
    const result = buildTelemetryOverview([panel(true, range.map(d => index(d, '0')))])
    t.true(result.buckets.length <= 12)
    t.is(new Set(result.buckets.map(b => b.key)).size, result.buckets.length)
  }
})

test('les mesures sans valeur, sans bornes ou de nature étrangère ne deviennent pas des volumes nuls', t => {
  const end = '2026-02-23T10:00:00Z'
  const zero = volume('2026-02-22T10:00:00Z', end, '0')
  const source = [null, {...zero, amount: null}, {...zero, kind: 'other'}, {...zero, start: null}]
  t.deepEqual(buildTelemetryOverview([panel(false, source)]).buckets, [])
  const {buckets} = buildTelemetryOverview([panel(false, [...source, zero])])
  t.deepEqual(buckets[0].panels[0].rows, [zero])
  t.is(buckets[0].panels[0].marks[0].amount, 0)
})
