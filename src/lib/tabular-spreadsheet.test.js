import test from 'ava'
import XlsxPopulate from 'xlsx-populate'

import {cleanSheetName, createTabularSpreadsheet} from './tabular-spreadsheet.js'

test('export navigateur : types, accents, en-têtes gras et largeurs conservés', async t => {
  const columns = [
    {label: 'Prélèvement', key: 'point'},
    {label: 'Volume', key: 'volume'},
    {label: 'Date', key: 'date'},
    {label: 'Actif', key: 'active'},
    {label: 'Usages', key: 'usages'},
    {label: 'Commentaire', key: 'missing'},
    {label: 'Calcul', value: row => row.volume * 2}
  ]
  const blob = await createTabularSpreadsheet({columns, sheetName: 'Points / prélèvements', rows: [{
    point: '=SUM(1,2)', volume: 12.5, date: new Date('2026-06-03T00:00:00.000Z'),
    active: true, usages: ['Irrigation', 'Industrie']
  }]})
  const workbook = await XlsxPopulate.fromDataAsync(await blob.arrayBuffer())
  const sheet = workbook.sheet(0)
  t.is(sheet.name(), 'Points   prélèvements')
  t.is(sheet.cell('A1').value(), 'Prélèvement')
  t.true(sheet.cell('A1').style('bold'))
  t.is(sheet.column(1).width(), 13)
  t.is(sheet.cell('A2').value(), '=SUM(1,2)')
  t.is(sheet.cell('A2').formula(), undefined)
  t.is(sheet.cell('B2').value(), 12.5)
  t.is(sheet.cell('C2').value(), 46176)
  t.is(sheet.cell('C2').style('numberFormat'), 'dd/mm/yyyy')
  t.is(sheet.cell('D2').value(), 'Oui')
  t.is(sheet.cell('E2').value(), 'Irrigation, Industrie')
  t.is(sheet.cell('G2').value(), 25)
})

test('les exports simultanés sont indépendants et acceptent un tableau vide', async t => {
  const columns = [{label: 'Point', key: 'point'}]
  const blobs = await Promise.all([
    createTabularSpreadsheet({columns, rows: [{point: 'A'}]}),
    createTabularSpreadsheet({columns, rows: [{point: 'B'}]}),
    createTabularSpreadsheet({columns})
  ])
  const workbooks = await Promise.all(blobs.map(async blob => XlsxPopulate.fromDataAsync(await blob.arrayBuffer())))
  t.is(workbooks[0].sheet(0).cell('A2').value(), 'A')
  t.is(workbooks[1].sheet(0).cell('A2').value(), 'B')
  t.is(workbooks[2].sheet(0).cell('A1').value(), 'Point')
  t.is(workbooks[2].sheet(0).cell('A2').value(), undefined)
})

test('le nom de feuille respecte les contraintes Excel', t => {
  t.is(cleanSheetName('[]:*?/\\'), 'Export')
  t.is(cleanSheetName('x'.repeat(40)), 'x'.repeat(31))
})
