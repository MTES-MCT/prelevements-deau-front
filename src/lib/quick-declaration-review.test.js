import test from 'ava'
import {describeQuickMeasure, describeQuickVolumes, formatReviewVolume, groupQuickReview} from './quick-declaration-review.js'

const period = {periodStartDate: '2026-11-01', periodEndDate: '2026-11-10'}
const index = {type: 'INDEX', readingDate: '2026-11-10', value: 135}
const volume = {type: 'VOLUME', ...period, value: 35}

test('le libellé distingue les dix opérations et les changements de date et de valeur simultanés', t => {
  const cases = [
    [null, index, 'Index ajouté'], [index, null, 'Index supprimé'], [index, {...index, value: 0}, 'Index modifié'],
    [index, {...index, readingDate: '2026-11-11'}, 'Date du relevé modifiée'],
    [null, volume, 'Volume ajouté'], [volume, null, 'Volume supprimé'], [volume, {...volume, value: 0}, 'Volume modifié'],
    [volume, {...volume, periodEndDate: '2026-12-01'}, 'Période modifiée'],
    [index, volume, 'Index remplacé par un volume'], [volume, index, 'Volume remplacé par un index'],
    [index, {...index, value: 0, readingDate: '2026-12-01'}, 'Index et date modifiés'],
    [volume, {...volume, value: 0, periodStartDate: '2025-12-01'}, 'Volume et période modifiés']
  ]
  for (const [before, after, action] of cases) t.is(describeQuickMeasure({before, after}).action, action)
  t.is(describeQuickMeasure({before: null, after: volume}).detail, '35 m³ du 1er au 10 nov. 2026')
})

test('le récapitulatif sépare deux comptages et deux compteurs avec le même nom de point', t => {
  const one = {pointPrelevementId: 'p', exploitationId: 'one', label: 'Prise'}
  const two = {...one, exploitationId: 'two'}
  const meter = {...one, compteurId: 'meter'}
  const change = {...one, ...period, before: 10, after: 0}
  const warning = {...meter, code: 'INDEX_BELOW_PREVIOUS'}
  const groups = groupQuickReview([one, two, meter], [change], [warning])
  t.is(groups.length, 3)
  t.deepEqual(groups.find(g => g.measures.includes(one)).changes, [change])
  t.is(groups.find(g => g.measures.includes(two)).warnings.length, 0)
  t.deepEqual(groups.find(g => g.measures.includes(meter)).warnings, [warning])
})

test('un relevé isolé, un volume nul et une nouvelle période calculée ont des effets distincts', t => {
  const measures = [{before: null, after: index}]
  t.is(describeQuickVolumes({measures, changes: []}), 'Aucun nouveau volume calculé pour ce relevé.')
  t.is(formatReviewVolume(null), 'Aucun')
  t.is(formatReviewVolume(0), '0 m³')
  t.is(describeQuickVolumes({measures, changes: [{...period, before: null, after: 0, afterKind: 'COMPUTED'}]}),
    'Un volume de 0 m³ est calculé du 1er au 10 nov. 2026.')
  t.is(describeQuickVolumes({measures: [{before: null, after: volume}], changes: [{...period, before: null, after: 35}]}), null)
})

test('la synthèse explique un déplacement et une conversion de même valeur', t => {
  const measures = [{before: index, after: volume}]
  const moved = [{...period, before: 35, after: null}, {...period, periodEndDate: '2026-11-12', before: null, after: 35}]
  t.is(describeQuickVolumes({measures, changes: moved}), 'Sur les 2 périodes concernées, le total reste de 35 m³.')
  t.regex(describeQuickVolumes({measures, changes: [{...period, before: 35, after: 35, beforeKind: 'COMPUTED', afterKind: 'DECLARED'}]}), /reste de 35 m³.*déclaré directement/)
  t.regex(describeQuickVolumes({measures, changes: [{...period, before: 35, after: 35, beforeKind: 'MIXED', afterKind: 'MIXED'}]}), /répartition change/)
})

test('une nouvelle déclaration explique quel relevé sera retenu à une date déjà occupée', t => {
  const measure = {before: null, after: index}
  const warning = {code: 'INDEX_SAME_DATE', readingDate: index.readingDate, value: 125}
  t.is(describeQuickMeasure(measure, [warning]).action, 'Nouvel index retenu')
  t.is(describeQuickMeasure(measure, [{...warning, readingDate: '2026-11-11'}]).action, 'Index ajouté')
  t.is(describeQuickMeasure({before: null, after: volume}, [{code: 'VOLUME_OVERLAP'}]).action, 'Volume déclaré retenu')
})
