import test from 'ava'
import {getReadingScopeRanges} from './reading-scope.js'

const range = (start, end = start) => ({start: Date.parse(start), end: Date.parse(end)})

test('le chapeau du volume saisi couvre sa dernière journée entière et écarte l’index historique', t => {
  const rows = [
    {day: '2026-09-29', current: false},
    {start: '2026-10-01', end: '2026-10-31', direct: true, current: true},
    {start: '2026-10-01', end: '2026-10-31', current: false}
  ]
  t.deepEqual(getReadingScopeRanges(rows), [range('2026-10-01', '2026-11-01')])
  t.deepEqual(getReadingScopeRanges([{start: '2026-03-29', end: '2026-03-29', direct: true, current: true}]),
    [range('2026-03-29', '2026-03-30')])
})

test('un volume calculé se termine sur son index et deux relevés seuls restent deux repères', t => {
  const points = [
    {day: '2026-11-15', current: true},
    {day: '2026-10-31', current: true},
    {day: '2026-11-12', current: false}
  ]
  t.deepEqual(getReadingScopeRanges(points), [range('2026-10-31'), range('2026-11-15')])
  const calculated = {start: '2026-09-30', end: '2026-10-31', amount: 0, current: true}
  t.deepEqual(getReadingScopeRanges([...points, calculated]), [range('2026-09-30', '2026-10-31'), range('2026-11-15')])
})

test('la sélection télérelevée conserve ses bornes exactes, y compris la portion du mois précédent et les coupures', t => {
  const first = '2026-09-30T08:00:00.321Z'
  const mid = '2026-10-01T08:00:00.654Z'
  const last = '2026-10-02T08:00:01.000Z'
  const afterGap = '2026-10-02T08:00:01.001Z'
  const rows = [
    {start: mid, end: last, direct: false, current: true},
    {start: first, end: mid, direct: true, current: true},
    {day: last, current: true},
    {day: afterGap, current: true}
  ]
  t.deepEqual(getReadingScopeRanges(rows, {exactTimes: true}), [range(first, last), range(afterGap)])
})

test('un reçu sans mesure active datée ne produit aucun repère', t => {
  const rows = [
    {day: '2026-09-29', current: false},
    {start: '2026-09-30', end: '2026-09-29', direct: true, current: true},
    {start: '2026-09-30', current: true}
  ]
  t.deepEqual(getReadingScopeRanges(rows), [])
})
