import {fileURLToPath} from 'node:url'

import test from 'ava'
import XlsxPopulate from 'xlsx-populate'

import {
  declarationTemplateWorkbookConfig,
  enrichDeclarationTemplateWorkbook,
  formatTemplateWaterUseOption,
  getTemplateWaterUses
} from './declaration-template-workbook.js'

async function createWorkbook() {
  const workbook = await XlsxPopulate.fromBlankAsync()
  const pointSheet = workbook.sheet(0).name('point_de_prelevement')
  const declarationSheet = workbook.addSheet('declaration_de_volume')
  const dictionarySheet = workbook.addSheet('Dictionnaire')

  pointSheet.cell('A1').value('id_point_de_prelevement_ou_rejet')
  pointSheet.cell('A2').value('ANCIEN-POINT')
  declarationSheet.cell('G1').value('usage')
  declarationSheet.cell('G2').value('AEP')
  dictionarySheet.cell('A40').value('Liste des usages du SANDRE')
  dictionarySheet.cell('A41').value('ANCIEN USAGE')
  dictionarySheet.cell('A77').value('Types de ressource en eau')

  return workbook
}

test('formatTemplateWaterUseOption produit une valeur stable avec le code', t => {
  t.is(
    formatTemplateWaterUseOption({
      code: '4d',
      label: 'Refroidissement avec restitution supérieure à 99 %'
    }),
    '4D - Refroidissement avec restitution supérieure à 99 %'
  )
  t.is(formatTemplateWaterUseOption({code: '4D'}), null)
})

test('getTemplateWaterUses trie usages et sous-usages par code', t => {
  t.deepEqual(
    getTemplateWaterUses([
      {code: '10', kind: 'USAGE', label: 'Défense contre incendie'},
      {code: '2A', kind: 'SUB_USAGE', label: 'Irrigation par aspersion'},
      {code: '2', kind: 'USAGE', label: 'Irrigation'}
    ]),
    [
      {
        code: '2',
        kind: 'Usage principal',
        label: 'Irrigation',
        option: '2 - Irrigation'
      },
      {
        code: '2A',
        kind: 'Sous-usage',
        label: 'Irrigation par aspersion',
        option: '2A - Irrigation par aspersion'
      },
      {
        code: '10',
        kind: 'Usage principal',
        label: 'Défense contre incendie',
        option: '10 - Défense contre incendie'
      }
    ]
  )
})

test('enrichDeclarationTemplateWorkbook configure points, usages et liste déroulante', async t => {
  const workbook = await createWorkbook()

  enrichDeclarationTemplateWorkbook(workbook, {
    pointNames: ['POINT-1', 'POINT-2'],
    waterUses: [
      {code: '4', kind: 'USAGE', label: 'Industrie'},
      {
        code: '4D',
        kind: 'SUB_USAGE',
        label: 'Refroidissement avec restitution supérieure à 99 %'
      }
    ]
  })

  t.is(workbook.sheet('point_de_prelevement').cell('A2').value(), 'POINT-1')
  t.is(workbook.sheet('point_de_prelevement').cell('A3').value(), 'POINT-2')
  t.is(workbook.sheet('declaration_de_volume').cell('G2').value(), null)
  t.is(
    workbook.sheet('Usages SANDRE').cell('D3').value(),
    '4D - Refroidissement avec restitution supérieure à 99 %'
  )
  t.true(
    String(workbook.sheet('Dictionnaire').cell('A40').value())
      .includes('Usages SANDRE')
  )
  t.is(workbook.sheet('Dictionnaire').cell('A41').value(), null)

  const validation = workbook
    .sheet('declaration_de_volume')
    .range('G2:G1001')
    .dataValidation()

  t.is(validation.type, 'list')
  t.true(validation.allowBlank)
  t.is(validation.formula1, declarationTemplateWorkbookConfig.waterUseDefinedName)
})

test('le modèle statique contient le référentiel et aucune valeur AEP imposée', async t => {
  const templatePath = fileURLToPath(new URL(
    '../../public/images/assets/modele_declaration_volumes.xlsx',
    import.meta.url
  ))
  const workbook = await XlsxPopulate.fromFileAsync(templatePath)
  const usageSheet = workbook.sheet(declarationTemplateWorkbookConfig.waterUseSheetName)
  const usageOptions = new Set(usageSheet
    .range(`D2:D${usageSheet.usedRange().endCell().rowNumber()}`)
    .value()
    .flat())

  t.true(usageOptions.has(
    '4D - Refroidissement avec restitution supérieure à 99 %'
  ))
  t.true(usageOptions.has('17 - Usage domestique'))
  t.is(workbook.sheet('declaration_de_volume').cell('G2').value(), undefined)

  const validation = workbook
    .sheet('declaration_de_volume')
    .range('G2:G1001')
    .dataValidation()

  t.is(validation.type, 'list')
  t.is(validation.formula1, declarationTemplateWorkbookConfig.waterUseDefinedName)
})
