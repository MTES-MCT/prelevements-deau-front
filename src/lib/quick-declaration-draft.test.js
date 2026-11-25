import test from 'ava'

import {
  buildQuickEditorDraft, createQuickEditorRows, getQuickCorrectionFormContext, getQuickDateErrors, getQuickEditorInitialDates, getQuickEditorMapPoints,
  getQuickEditorRowKey, getQuickMeasureBadge, hasQuickEditorMeasure, switchQuickRowValue
} from './quick-declaration-draft.js'

const declaration = {
  revision: 2,
  measurementType: 'INDEX',
  entries: [
    {id: 'a', exploitationId: 'one', pointPrelevementId: 'point', pointName: 'Prise A', usageId: 'usage', value: 10, readingDate: '2026-01-15'},
    {id: 'b', exploitationId: 'two', pointPrelevementId: 'point', pointName: 'Prise B', usageId: 'usage', value: 0, readingDate: '2026-01-15'}
  ]
}

const volumes = {...declaration, measurementType: 'VOLUME', entries: declaration.entries.map(({readingDate, ...entry}) =>
  ({...entry, periodStartDate: '2026-01-01', periodEndDate: readingDate}))}
const otherCounting = {pointPrelevementId: 'point', exploitationId: 'three', pointName: 'Prise A', countingCode: '003', usageId: 'usage'}
const build = (record, rows, type = record.measurementType, dates = getQuickEditorInitialDates(record).dates) =>
  buildQuickEditorDraft(record, rows, type, dates, '2026-01-31')

test('le formulaire partagé distingue les compteurs historiques et préremplit seulement les mesures du dépôt', t => {
  const point = {...declaration.entries[0], flowType: 'REJET', countingCode: '001', usageLabel: 'Irrigation'}
  const records = [
    {...point, compteurId: 'red', compteurName: 'Rouge'},
    {...point, id: 'b', compteurId: 'blue', compteurName: 'Bleu', value: 0, readingDate: '2026-01-16'}
  ]
  const shape = {type: 'Point', coordinates: [2.1, 46.2]}
  const fixed = {...declaration, entries: records, emptyEntries: [otherCounting], mapPoints: [
    {id: 'point', coordinates: shape}, {id: 'hors-formulaire', coordinates: shape}
  ]}
  const {initial, context: {points}, rows} = getQuickCorrectionFormContext(fixed)
  t.deepEqual(Object.keys(rows), ['a', 'b', 'new:three'])
  t.deepEqual(Object.values(rows).map(row => row.value), ['10', '0', ''])
  t.deepEqual(points.map(point => [point.formEntryId, point.compteurId, point.flowType]), [
    ['a', 'red', 'REJET'], ['b', 'blue', 'REJET'], ['new:three', undefined, undefined]
  ])
  t.is(points[0].name, 'Prise A')
  t.is(points[0].correction.label, 'Prise A — Code comptage : 001 · compteur Rouge')
  const ambiguous = {...fixed, entries: records.map(entry => ({...entry, compteurName: null}))}
  const legacy = getQuickCorrectionFormContext(ambiguous).context.points
  t.deepEqual(legacy.slice(0, 2).map(point => point.correction.label), [
    'Prise A — Code comptage : 001 · ligne 1', 'Prise A — Code comptage : 001 · ligne 2'
  ])
  t.is(points[0].usage.label, 'Irrigation')
  t.deepEqual(points.map(point => point.correction.original?.value), [10, 0, undefined])
  t.true(points.every(point => point.pointPrelevementId === 'point' && point.coordinates === shape))
  t.true(initial.requiresDateSelection)
  t.is(initial.dates.readingDate, '')

  rows.b.value = ''
  rows['new:three'].value = '0'
  const {payload, reviewEntries} = build(fixed, points.map(point => ({...point, ...rows[point.formEntryId]})), 'INDEX', {readingDate: '2026-01-15'})
  t.deepEqual(payload.entries.map(entry => [entry.id, entry.exploitationId, entry.value]), [['a', 'one', 10], [undefined, 'three', 0]])
  t.deepEqual(reviewEntries.map(entry => [entry.compteurId, entry.before?.value, entry.after?.value]), [['blue', 0, undefined], [null, undefined, 0]])
})

test('le badge signale les ajouts, retraits, conversions et vraies modifications de valeur', t => {
  const original = declaration.entries[0]
  const row = {...original, value: '10', readingDate: '2026-01-20'}
  t.is(getQuickMeasureBadge(original, row, 'INDEX', 'INDEX'), null)
  t.is(getQuickMeasureBadge(original, {...row, value: '10.00'}, 'INDEX', 'INDEX'), null)
  t.is(getQuickMeasureBadge(original, {...row, value: '30'}, 'INDEX', 'INDEX'), 'Modifié')
  t.is(getQuickMeasureBadge({...original, value: 0}, {...row, value: ''}, 'INDEX', 'INDEX'), 'Supprimé')
  t.is(getQuickMeasureBadge(null, {...row, value: ''}, 'INDEX', 'INDEX'), null)
  t.is(getQuickMeasureBadge(null, {...row, value: '0'}, 'INDEX', 'VOLUME'), 'Ajouté')
  t.is(getQuickMeasureBadge(null, row, 'VOLUME', 'INDEX'), 'Ajouté')
  t.is(getQuickMeasureBadge(original, {...row, value: '0'}, 'VOLUME', 'VOLUME'), 'Modifié')
  t.is(getQuickMeasureBadge(original, row, 'VOLUME', 'INDEX'), 'Modifié')
  t.is(getQuickMeasureBadge(original, {...row, removed: true}, 'INDEX', 'VOLUME'), 'Supprimé')
  t.is(getQuickMeasureBadge(original, {...row, value: ''}, 'VOLUME', 'INDEX'), 'Supprimé')
})

test('une seule date modifiée déplace tous les index, garde les zéros et produit un nouveau brouillon de vérification', t => {
  const rows = createQuickEditorRows(declaration)
  const {dates, requiresDateSelection} = getQuickEditorInitialDates(declaration)
  t.false(requiresDateSelection)
  t.is(dates.readingDate, '2026-01-15')
  t.is(build(declaration, rows).payload, null)
  for (const day of ['2026-01-14', '2026-01-12']) {
    const {payload, reviewEntries} = build(declaration, rows, 'INDEX', {...dates, readingDate: day})
    t.deepEqual(payload, {
      measurementType: 'INDEX', revision: 2, readingDate: day,
      entries: [
        {id: 'a', pointPrelevementId: 'point', exploitationId: 'one', usageId: 'usage', value: 10},
        {id: 'b', pointPrelevementId: 'point', exploitationId: 'two', usageId: 'usage', value: 0}
      ]
    })
    t.deepEqual(reviewEntries.map(({before, after}) => [before.readingDate, after.readingDate, after.value]), [
      ['2026-01-15', day, 10], ['2026-01-15', day, 0]
    ])
  }
  t.is(build(declaration, rows, 'INDEX', dates).payload, null)
})

test('un changement de valeur seul garde la date commune et ne récapitule que le comptage touché', t => {
  const rows = createQuickEditorRows(declaration)
  rows[0].value = '3'
  const {payload, reviewEntries} = build(declaration, rows)
  t.is(payload.readingDate, '2026-01-15')
  t.is(reviewEntries.length, 1)
  t.is(reviewEntries[0].id, 'a')
})

test('changer une borne applique la période à chaque volume et ne transmet aucune date sur les lignes', t => {
  const {dates} = getQuickEditorInitialDates(volumes)
  const rows = createQuickEditorRows(volumes)
  t.is(build(volumes, rows).payload, null)
  for (const periodEndDate of ['2026-01-10', '2026-01-01']) {
    const {payload, reviewEntries} = build(volumes, rows, 'VOLUME', {...dates, periodEndDate})
    t.is(payload.periodStartDate, '2026-01-01')
    t.is(payload.periodEndDate, periodEndDate)
    t.false(Object.hasOwn(payload, 'readingDate'))
    t.deepEqual(reviewEntries.map(({before, after}) => [before.periodEndDate, after.periodEndDate]), [
      ['2026-01-15', periodEndDate], ['2026-01-15', periodEndDate]
    ])
    t.true(payload.entries.every(entry => !Object.keys(entry).some(field => field.endsWith('Date'))))
  }
})

test('la validation des dates communes ne répète pas une erreur par point et ignore le mode inactif', t => {
  const dates = {periodStartDate: '2026-01-10', periodEndDate: '2026-01-11', readingDate: '2026-02-31'}
  t.deepEqual(getQuickDateErrors('VOLUME', dates, '2026-01-11'), [])
  t.is(build(declaration, createQuickEditorRows(declaration), 'INDEX', dates).errors.length, 1)
  t.is(build(volumes, createQuickEditorRows(volumes), 'VOLUME', {...dates, periodEndDate: '2026-01-09'}).errors.length, 1)
  t.is(getQuickDateErrors('VOLUME', {...dates, periodEndDate: '2026-02-01'}, '2026-01-31').length, 1)
})

test('un historique aux dates différentes requiert un choix explicite, et conserve les dates initiales dans chaque avant', t => {
  const mixed = {...declaration, entries: [declaration.entries[0], {...declaration.entries[1], readingDate: '2026-01-20'}]}
  const rows = createQuickEditorRows(mixed)
  const {dates, requiresDateSelection} = getQuickEditorInitialDates(mixed)
  t.true(requiresDateSelection)
  t.is(dates.readingDate, '')
  t.is(build(mixed, rows).payload, null)
  t.deepEqual(build(mixed, rows).reviewEntries, [])
  rows[0].value = '5'
  t.is(build(mixed, rows).payload, null)
  const {reviewEntries, payload} = build(mixed, rows, 'INDEX', {...dates, readingDate: '2026-01-25'})
  t.is(payload.readingDate, '2026-01-25')
  t.deepEqual(reviewEntries.map(({before, after}) => [before.readingDate, after.readingDate]), [
    ['2026-01-15', '2026-01-25'], ['2026-01-20', '2026-01-25']
  ])
})

test('une seule borne historique divergente demande une période complète ; le retrait total reste disponible', t => {
  const mixed = {...volumes, entries: [volumes.entries[0], {...volumes.entries[1], periodEndDate: '2026-01-20'}]}
  const rows = createQuickEditorRows(mixed)
  const {dates, requiresDateSelection} = getQuickEditorInitialDates(mixed)
  t.true(requiresDateSelection)
  t.deepEqual(dates, {readingDate: '', periodStartDate: '', periodEndDate: ''})
  t.true(getQuickEditorInitialDates({...volumes, requiresDateSelection: true}).requiresDateSelection)
  rows[0].removed = true
  t.is(build(mixed, rows).payload, null)
  const period = {periodStartDate: '2026-01-01', periodEndDate: '2026-01-20'}
  const {reviewEntries} = build(mixed, rows, 'VOLUME', period)
  t.deepEqual(reviewEntries.map(({before, after}) => [before.periodEndDate, after]), [['2026-01-15', null]])
  rows[1].removed = true
  const empty = build(mixed, rows)
  t.deepEqual(empty.payload, {measurementType: 'VOLUME', revision: 2, entries: []})
  t.deepEqual(empty.errors, [])
  t.true(empty.reviewEntries.every(entry => entry.after === null))
})

test('le périmètre fixe affiche le comptage vide dès le départ et ignore les exploitations extérieures', t => {
  const fixed = {...declaration, emptyEntries: [otherCounting, otherCounting, declaration.entries[0]],
    availableEntries: [{...otherCounting, exploitationId: 'hors-perimetre'}]}
  const rows = createQuickEditorRows(fixed)
  t.deepEqual(rows.map(row => row.exploitationId), ['one', 'two', 'three'])
  t.is(getQuickEditorRowKey(rows[2]), 'new:three')
  t.false(hasQuickEditorMeasure(rows[2]))
  t.is(build(fixed, rows).payload, null)
  rows[0].removed = true
  rows[2].value = '0'
  const {payload, reviewEntries} = build(fixed, rows)
  t.deepEqual(payload.entries.map(row => row.exploitationId), ['two', 'three'])
  t.false(Object.hasOwn(payload.entries[1], 'id'))
  t.false(Object.hasOwn(payload.entries[1], 'readingDate'))
  t.deepEqual(reviewEntries.map(({exploitationId, before, after}) => [exploitationId, before, after]), [
    ['one', {type: 'INDEX', value: 10, readingDate: '2026-01-15'}, null],
    ['three', null, {type: 'INDEX', value: 0, readingDate: '2026-01-15'}]
  ])
  t.is(reviewEntries[1].label, 'Prise A — Code comptage : 003')
  rows[2].value = ''
  t.is(rows.length, 3)
  t.deepEqual(build(fixed, rows).reviewEntries.map(row => row.exploitationId), ['one'])
  rows[0].removed = false
  t.is(build(fixed, rows).payload, null)
})

test('effacer un ancien comptage puis le rétablir garde son identité et sa date initiale', t => {
  const old = {...declaration, entries: [{...declaration.entries[0], exploitationId: null, effectiveExploitationId: 'one',
    countingCode: '001', compteurId: 'meter', compteurName: 'M-100'}], emptyEntries: [declaration.entries[0]]}
  const rows = createQuickEditorRows(old)
  t.is(rows.length, 1)
  rows[0].value = ''
  t.deepEqual(build(old, rows).payload.entries, [])
  t.is(build(old, rows).reviewEntries[0].after, null)
  rows[0].value = '12'
  const {payload, reviewEntries} = build(old, rows, 'INDEX', {readingDate: '2026-01-21'})
  t.is(payload.entries[0].id, 'a')
  t.is(payload.entries[0].exploitationId, null)
  t.is(reviewEntries[0].exploitationId, 'one')
  t.is(reviewEntries[0].compteurId, 'meter')
  t.is(reviewEntries[0].label, 'Prise A — Code comptage : 001 · compteur M-100')
  t.deepEqual(reviewEntries[0].after, {type: 'INDEX', value: 12, readingDate: '2026-01-21'})
  t.deepEqual(reviewEntries[0].before, {type: 'INDEX', value: 10, readingDate: '2026-01-15'})
})

test('la carte déduplique les points physiques et limite ses géométries au périmètre fixé', t => {
  const geometry = {type: 'Point', coordinates: [2.139, 46.37]}
  const fixed = {...declaration, emptyEntries: [otherCounting, {...otherCounting, exploitationId: 'four', pointPrelevementId: 'other', pointName: 'Source'}],
    mapPoints: [
      {id: 'point', name: 'Nom autorisé', coordinates: geometry},
      {id: 'invisible', name: 'Hors périmètre', coordinates: geometry}
    ]}
  t.deepEqual(getQuickEditorMapPoints(fixed), [
    {pointPrelevementId: 'point', name: 'Nom autorisé', coordinates: geometry},
    {pointPrelevementId: 'other', name: 'Source', coordinates: null}
  ])
  const historical = {...declaration, availableEntries: [otherCounting]}
  t.is(createQuickEditorRows(historical).length, 2)
  t.deepEqual(getQuickEditorMapPoints(historical), [{pointPrelevementId: 'point', name: 'Prise A', coordinates: null}])
})

test('convertir préserve les brouillons de chaque type, y compris un ajout à zéro et un retrait', t => {
  const rows = createQuickEditorRows({...declaration, emptyEntries: [otherCounting]})
  rows[1].removed = true
  rows[2].value = '3'
  const dates = {...getQuickEditorInitialDates(declaration).dates, readingDate: '2026-01-16'}
  const converted = rows.map(row => switchQuickRowValue(row, 'INDEX', 'VOLUME'))
  t.is(build(declaration, converted, 'VOLUME', dates).payload, null)
  converted[2].value = '0'
  Object.assign(dates, {periodStartDate: '2026-01-05', periodEndDate: '2026-01-07'})
  const {payload, reviewEntries} = build(declaration, converted, 'VOLUME', dates)
  t.is(payload.periodStartDate, '2026-01-05')
  t.false(Object.hasOwn(payload, 'readingDate'))
  t.deepEqual(payload.entries.map(row => row.value), [10, 0])
  t.deepEqual(reviewEntries.map(row => [row.before?.type, row.after?.type]), [['INDEX', 'VOLUME'], ['INDEX', undefined], [undefined, 'VOLUME']])
  t.is(reviewEntries[2].after.periodEndDate, dates.periodEndDate)
  t.is(reviewEntries[1].before.value, 0)
  const restored = converted.map(row => switchQuickRowValue(row, 'VOLUME', 'INDEX'))
  const draft = build(declaration, restored, 'INDEX', dates)
  t.is(draft.payload.readingDate, '2026-01-16')
  t.false(Object.hasOwn(draft.payload, 'periodStartDate'))
  t.deepEqual(draft.reviewEntries[2].after, {type: 'INDEX', readingDate: '2026-01-16', value: 3})
  t.deepEqual(build(declaration, restored.map(row => switchQuickRowValue(row, 'INDEX', 'VOLUME')), 'VOLUME', dates).payload, payload)
})

test('une déclaration en volumes convertie en index utilise une seule nouvelle date', t => {
  const rows = createQuickEditorRows(volumes).map(row => switchQuickRowValue(row, 'VOLUME', 'INDEX'))
  const dates = getQuickEditorInitialDates(volumes).dates
  t.is(build(volumes, rows, 'INDEX', dates).payload, null)
  const {payload, reviewEntries} = build(volumes, rows, 'INDEX', {...dates, readingDate: '2026-01-18'})
  t.is(payload.readingDate, '2026-01-18')
  t.false(Object.hasOwn(payload, 'periodEndDate'))
  t.deepEqual(reviewEntries.map(row => [row.before.type, row.after.type, row.after.readingDate]), [
    ['VOLUME', 'INDEX', '2026-01-18'], ['VOLUME', 'INDEX', '2026-01-18']
  ])
})

test('vider une ligne au clavier puis changer de type efface tous ses brouillons, dans les deux sens', t => {
  for (const [from, to] of [['INDEX', 'VOLUME'], ['VOLUME', 'INDEX']]) {
    const switched = switchQuickRowValue({...otherCounting, value: '20'}, from, to)
    const cleared = switchQuickRowValue({...switched, value: ''}, to, from)
    t.is(cleared.value, '')
    t.false(hasQuickEditorMeasure(cleared))
    t.is(switchQuickRowValue(cleared, from, to).value, '')
    // A later value starts a new measurement and is carried across, including zero.
    t.is(switchQuickRowValue({...cleared, value: '0'}, from, to).value, '0')
  }
})
