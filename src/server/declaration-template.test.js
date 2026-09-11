import {readFile} from 'node:fs/promises'

import test from 'ava'
import XlsxPopulate from 'xlsx-populate'

import {createDeclarationTemplateBuffer} from './declaration-template.js'

const templatePath = new URL('../../public/images/assets/modele_declaration_volumes.xlsx', import.meta.url)

test('les modèles sont indépendants et conservent les listes et styles du fichier versionné', async t => {
  const template = await readFile(templatePath)
  const source = await XlsxPopulate.fromDataAsync(template)
  const results = await Promise.all(['POINT-A', 'POINT-B'].map(async name => {
    const buffer = await createDeclarationTemplateBuffer(template, {
      points: [{name}], waterUses: [{code: '4', kind: 'USAGE', label: 'Industrie'}]
    })
    return XlsxPopulate.fromDataAsync(buffer)
  }))
  t.is(results[0].sheet('point_de_prelevement').cell('A2').value(), 'POINT-A')
  t.is(results[1].sheet('point_de_prelevement').cell('A2').value(), 'POINT-B')
  t.deepEqual(results[0].sheets().map(sheet => sheet.name()), source.sheets().map(sheet => sheet.name()))
  t.is(results[0].sheet('declaration_de_volume').range('G2:G1001').dataValidation().formula1, 'USAGES_SANDRE')
  t.deepEqual(results[0].sheet('point_de_prelevement').cell('A1').style('fill'), source.sheet('point_de_prelevement').cell('A1').style('fill'))
  t.is(results[0].sheet('Usages SANDRE').cell('D2').value(), '4 - Industrie')
})
