import test from 'ava'

import {
  buildQuickEditorDraft, createQuickEditorRows, getQuickDateErrors, switchQuickRowValue
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
