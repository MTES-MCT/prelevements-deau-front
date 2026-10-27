import test from 'ava'
import XlsxPopulate from 'xlsx-populate'

import {createTabularSpreadsheet} from '@/lib/tabular-spreadsheet.js'

import {getZoneDeclarantExportColumns, ZONE_POINTS_EXPORT_COLUMNS} from './zone-export-columns.js'

function getColumn(columns, label) {
  return columns.find(column => column.label === label)
}

test('l’export des préleveurs expose le type métier et distingue le type de personne', t => {
  const columns = getZoneDeclarantExportColumns()
  const labels = new Set(columns.map(column => column.label))
  const declarant = {
    declarantRole: 'PRELEVEUR',
    preleveurType: 'GESTIONNAIRE_AEP',
    declarantType: 'LEGAL_PERSON'
  }

  t.true(labels.has('Type de préleveur'))
  t.false(labels.has('Type'))
  t.is(getColumn(columns, 'Type de préleveur').value(declarant), 'Gestionnaire AEP')
  t.is(getColumn(columns, 'Type de personne').value(declarant), 'Personne morale')
})

test('l’export des collecteurs ne propose pas le type de préleveur', t => {
  const columns = getZoneDeclarantExportColumns({collecteursOnly: true})

  t.false(columns.some(column => column.label === 'Type de préleveur'))
  t.true(columns.some(column => column.label === 'Type de personne'))
})

test('l’export Excel des PP sépare longitude X et latitude Y en cellules numériques', async t => {
  const columns = ZONE_POINTS_EXPORT_COLUMNS
  const blob = await createTabularSpreadsheet({columns, rows: [{
    name: '123 - Captage synthétique', coordinates: {type: 'Point', coordinates: [55.5, -21.1]}
  }]})
  const sheet = (await XlsxPopulate.fromDataAsync(await blob.arrayBuffer())).sheet(0)
  t.false(columns.some(column => column.label === 'Coordonnées'))
  for (const [label, expected] of [['X (longitude)', 55.5], ['Y (latitude)', -21.1]]) {
    const index = columns.findIndex(column => column.label === label) + 1
    t.is(sheet.cell(1, index).value(), label)
    t.is(sheet.cell(2, index).value(), expected)
  }
})

test('les coordonnées exportées conservent zéro sans transformer une absence en zéro', t => {
  const x = getColumn(ZONE_POINTS_EXPORT_COLUMNS, 'X (longitude)')
  const y = getColumn(ZONE_POINTS_EXPORT_COLUMNS, 'Y (latitude)')
  t.is(x.value({coordinates: [0, 0]}), 0)
  t.is(y.value({coordinates: [0, 0]}), 0)
  for (const coordinates of [undefined, null, [], [55.5], [null, undefined], [Infinity, NaN]]) {
    t.is(x.value({coordinates}), '')
    t.is(y.value({coordinates}), '')
  }
})
