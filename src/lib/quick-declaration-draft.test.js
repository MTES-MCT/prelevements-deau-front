import test from 'ava'

import {
  addQuickEditorRow, buildQuickEditorDraft, createQuickEditorRows, getQuickDateErrors, getQuickEditorOptions,
  getQuickEditorRowKey, switchQuickRowValue
} from './quick-declaration-draft.js'

const declaration = {
  revision: 'revision',
  measurementType: 'INDEX',
  entries: [
    {id: 'a', exploitationId: 'one', pointPrelevementId: 'point', pointName: 'Prise A', usageId: 'usage', value: 10, readingDate: '2026-01-15'},
    {id: 'b', exploitationId: 'two', pointPrelevementId: 'point', pointName: 'Prise B', usageId: 'usage', value: 0, readingDate: '2026-01-15'}
  ]
}

test('une modification de date conserve les dates et exploitations des autres lignes', t => {
  const rows = createQuickEditorRows(declaration)
  const build = () => buildQuickEditorDraft(declaration, rows, 'INDEX', '2026-01-30')
  t.is(build().payload, null)
  rows[0].readingDate = '2026-01-14'
  t.deepEqual(build().payload.entries.map(entry => [entry.readingDate, entry.value, entry.exploitationId]), [
    ['2026-01-14', 10, 'one'], ['2026-01-15', 0, 'two']
  ])
})

test('la conversion reprend la valeur et restaure chaque brouillon lors des allers-retours', t => {
  const [row] = createQuickEditorRows(declaration)
  const volume = switchQuickRowValue(row, 'INDEX', 'VOLUME')
  t.is(volume.value, '10')
  t.is(volume.periodStartDate, '')
  const editedVolume = {...volume, value: '0', periodStartDate: '2026-01-02', periodEndDate: '2026-01-02'}
  const index = switchQuickRowValue(editedVolume, 'VOLUME', 'INDEX')
  t.is(index.value, '10')
  t.is(index.readingDate, '2026-01-15')
  const restored = switchQuickRowValue(index, 'INDEX', 'VOLUME')
  t.is(restored.value, '0')
  t.is(restored.periodStartDate, '2026-01-02')
  const {payload} = buildQuickEditorDraft(declaration, [restored], 'VOLUME', '2026-01-30')
  t.is(payload.entries[0].value, 0)
  t.false('readingDate' in payload.entries[0])
})

test('les contrôles utilisent chaque borne et ignorent les dates du mode inactif', t => {
  const row = {periodStartDate: '2026-01-10', periodEndDate: '2026-01-11', readingDate: '2026-02-31'}
  t.deepEqual(getQuickDateErrors('VOLUME', row, '2026-01-11'), [])
  t.is(getQuickDateErrors('INDEX', row, '2026-01-11').length, 1)
  t.is(getQuickDateErrors('VOLUME', {...row, periodStartDate: '2026-01-12'}, '2026-01-30').length, 1)
  t.is(getQuickDateErrors('VOLUME', {...row, periodEndDate: '2026-01-31'}, '2026-01-30').length, 1)
})

test('supprimer la dernière ligne crée un brouillon vide explicite, annuler restaure les lignes', t => {
  const rows = createQuickEditorRows(declaration)
  const removed = rows.map(row => ({...row, removed: true, value: ''}))
  t.deepEqual(buildQuickEditorDraft(declaration, removed, 'INDEX').payload, {
    measurementType: 'INDEX', revision: 'revision', entries: []
  })
  t.is(buildQuickEditorDraft(declaration, rows, 'INDEX').payload, null)
})

test('une déclaration initialement en volumes peut être convertie en index datés indépendamment', t => {
  const volumes = {...declaration, measurementType: 'VOLUME', entries: declaration.entries.map(({readingDate, ...entry}) => ({
    ...entry, periodStartDate: '2026-01-01', periodEndDate: readingDate
  }))}
  const indexRows = createQuickEditorRows(volumes).map(row => switchQuickRowValue(row, 'VOLUME', 'INDEX'))
  t.is(buildQuickEditorDraft(volumes, indexRows, 'INDEX').payload, null)
  indexRows[0].readingDate = '2026-01-15'
  indexRows[1].readingDate = '2026-01-13'
  const {payload} = buildQuickEditorDraft(volumes, indexRows, 'INDEX', '2026-01-31')
  t.deepEqual(payload.entries.map(entry => [entry.readingDate, entry.value]), [['2026-01-15', 10], ['2026-01-13', 0]])
  t.true(payload.entries.every(entry => !('periodStartDate' in entry) && !('periodEndDate' in entry)))
})

test('une seule borne de volume peut changer sur une seule ligne', t => {
  const volumes = {...declaration, measurementType: 'VOLUME', entries: declaration.entries.map(({readingDate, ...entry}) => ({
    ...entry, periodStartDate: '2026-01-01', periodEndDate: readingDate
  }))}
  const rows = createQuickEditorRows(volumes)
  const build = () => buildQuickEditorDraft(volumes, rows, 'VOLUME', '2026-01-31')
  t.is(build().payload, null)
  rows[0].periodStartDate = '2026-01-05'
  t.deepEqual(build().payload.entries.map(entry => [entry.periodStartDate, entry.periodEndDate]), [
    ['2026-01-05', '2026-01-15'], ['2026-01-01', '2026-01-15']
  ])
  rows[1].periodEndDate = '2026-01-01'
  t.is(build().payload.entries[1].periodEndDate, '2026-01-01')
})

const otherCounting = {pointPrelevementId: 'point', exploitationId: 'three', pointName: 'Prise A', countingCode: '003', usageId: 'usage'}

test('ajouter un autre comptage du même point et retirer une ligne forment une seule correction', t => {
  const originals = createQuickEditorRows(declaration)
  const available = [declaration.entries[0], otherCounting, {...otherCounting}]
  const [option] = getQuickEditorOptions(available, originals)
  t.deepEqual(getQuickEditorOptions(available, originals), [{entry: otherCounting, restoreId: null}])
  const rows = addQuickEditorRow(originals, option)
  t.is(getQuickEditorRowKey(rows[2]), 'new:three')
  t.deepEqual(getQuickEditorOptions(available, rows), [])
  t.is(addQuickEditorRow(rows, option), rows)
  t.is(buildQuickEditorDraft(declaration, rows, 'INDEX').payload, null)
  rows[0].removed = true
  rows[2].readingDate = '2026-01-11'
  rows[2].value = '0'
  const {payload, reviewEntries} = buildQuickEditorDraft(declaration, rows, 'INDEX', '2026-01-30')
  t.deepEqual(payload.entries.map(row => row.exploitationId), ['two', 'three'])
  t.false(Object.hasOwn(payload.entries[1], 'id'))
  t.deepEqual(reviewEntries.map(({exploitationId, before, after}) => [exploitationId, before, after]), [
    ['one', {type: 'INDEX', value: 10, readingDate: '2026-01-15'}, null],
    ['three', null, {type: 'INDEX', value: 0, readingDate: '2026-01-11'}]
  ])
  t.is(reviewEntries[1].label, 'Prise A — Code comptage : 003')
  t.deepEqual(buildQuickEditorDraft(declaration, rows.slice(0, 2), 'INDEX').reviewEntries.map(row => row.exploitationId), ['one'])
})

test('un ancien comptage rétabli par le sélecteur garde son identifiant et ses valeurs en brouillon', t => {
  const old = {...declaration, entries: [{...declaration.entries[0], exploitationId: null, effectiveExploitationId: 'one',
    countingCode: '001', compteurId: 'meter', compteurName: 'M-100'}]}
  const originals = createQuickEditorRows(old)
  const available = [declaration.entries[0], otherCounting]
  t.is(getQuickEditorOptions(available, originals).length, 1)
  const removed = [{...originals[0], removed: true, value: '12'}]
  const [option] = getQuickEditorOptions(available, removed)
  const restored = addQuickEditorRow(removed, option)
  t.is(restored.length, 1)
  const {payload, reviewEntries} = buildQuickEditorDraft(old, restored, 'INDEX', '2026-01-30')
  t.is(payload.entries[0].id, 'a')
  t.is(payload.entries[0].exploitationId, null)
  t.is(reviewEntries[0].exploitationId, 'one')
  t.is(reviewEntries[0].compteurId, 'meter')
  t.is(reviewEntries[0].label, 'Prise A — Code comptage : 001 · compteur M-100')
  t.is(reviewEntries[0].after.value, 12)
  t.is(reviewEntries[0].before.value, 10)
  const untouched = addQuickEditorRow([{...originals[0], removed: true}], option)
  t.is(buildQuickEditorDraft(old, untouched, 'INDEX').payload, null)
})

test('la conversion récapitule tous les index initiaux, les retraits et les ajouts avec leurs propres périodes', t => {
  const originals = createQuickEditorRows(declaration)
  const [option] = getQuickEditorOptions([otherCounting], originals)
  const rows = addQuickEditorRow(originals, option)
  rows[1].removed = true
  Object.assign(rows[2], {readingDate: '2026-01-10', value: '3'})
  const converted = rows.map(row => switchQuickRowValue(row, 'INDEX', 'VOLUME'))
  Object.assign(converted[0], {periodStartDate: '2026-01-01', periodEndDate: '2026-01-14'})
  Object.assign(converted[2], {value: '0', periodStartDate: '2026-01-05', periodEndDate: '2026-01-05'})
  const {payload, reviewEntries} = buildQuickEditorDraft(declaration, converted, 'VOLUME', '2026-01-30')
  t.deepEqual(payload.entries.map(row => [row.value, row.periodStartDate]), [[10, '2026-01-01'], [0, '2026-01-05']])
  t.deepEqual(reviewEntries.map(row => [row.before?.type, row.after?.type]), [['INDEX', 'VOLUME'], ['INDEX', undefined], [undefined, 'VOLUME']])
  t.false(Object.hasOwn(reviewEntries[2].after, 'readingDate'))
  t.is(reviewEntries[1].before.value, 0)
  const restored = converted.map(row => switchQuickRowValue(row, 'VOLUME', 'INDEX'))
  const draft = buildQuickEditorDraft(declaration, restored, 'INDEX', '2026-01-30')
  t.deepEqual(draft.reviewEntries.map(row => row.exploitationId), ['two', 'three'])
  t.deepEqual(draft.reviewEntries[1].after, {type: 'INDEX', readingDate: '2026-01-10', value: 3})
})
