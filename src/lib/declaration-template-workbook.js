const POINT_SHEET_NAME = 'point_de_prelevement'
const POINT_COLUMN_NAME = 'id_point_de_prelevement_ou_rejet'
const DECLARATION_SHEET_NAME = 'declaration_de_volume'
const USAGE_COLUMN_NAME = 'usage'
const WATER_USE_SHEET_NAME = 'Usages SANDRE'
const WATER_USE_DEFINED_NAME = 'USAGES_SANDRE'
const FIRST_DATA_ROW = 2
const LAST_DATA_ROW = 1001

function findHeaderColumnNumber(sheet, headerName) {
  const usedRange = sheet.usedRange()
  const endColumn = usedRange.endCell().columnNumber()

  for (let column = 1; column <= endColumn; column += 1) {
    const value = String(sheet.cell(1, column).value() ?? '').trim()

    if (value === headerName) {
      return column
    }
  }

  return null
}

function getWaterUseCodeSortParts(code) {
  const match = /^(\d+)(.*)$/v.exec(code)

  return {
    number: match ? Number(match[1]) : Number.MAX_SAFE_INTEGER,
    suffix: match?.[2] ?? ''
  }
}

function compareWaterUses(left, right) {
  const leftParts = getWaterUseCodeSortParts(left.code)
  const rightParts = getWaterUseCodeSortParts(right.code)

  return leftParts.number - rightParts.number
    || leftParts.suffix.localeCompare(rightParts.suffix, 'fr', {numeric: true})
}

export function formatTemplateWaterUseOption(waterUse) {
  const code = String(waterUse?.code ?? '').trim().toLocaleUpperCase('fr-FR')
  const label = String(waterUse?.label ?? '').trim()

  if (!code || !label) {
    return null
  }

  return `${code} - ${label}`
}

export function getTemplateWaterUses(waterUses = []) {
  return waterUses
    .map(waterUse => ({
      code: String(waterUse?.code ?? '').trim().toLocaleUpperCase('fr-FR'),
      kind: waterUse?.kind === 'SUB_USAGE' ? 'Sous-usage' : 'Usage principal',
      label: String(waterUse?.label ?? '').trim(),
      option: formatTemplateWaterUseOption(waterUse)
    }))
    .filter(waterUse => waterUse.code && waterUse.label && waterUse.option)
    .sort(compareWaterUses)
}

function populatePointNames(workbook, pointNames) {
  const sheet = workbook.sheet(POINT_SHEET_NAME)

  if (!sheet) {
    throw new Error(`La feuille "${POINT_SHEET_NAME}" est introuvable.`)
  }

  const columnNumber = findHeaderColumnNumber(sheet, POINT_COLUMN_NAME)

  if (!columnNumber) {
    throw new Error(`La colonne "${POINT_COLUMN_NAME}" est introuvable.`)
  }

  sheet.range(FIRST_DATA_ROW, columnNumber, LAST_DATA_ROW, columnNumber).value(null)

  for (const [index, pointName] of pointNames.entries()) {
    sheet.cell(FIRST_DATA_ROW + index, columnNumber).value(pointName)
  }
}

function clearLegacyDictionaryWaterUses(workbook) {
  const dictionarySheet = workbook.sheet('Dictionnaire')

  if (!dictionarySheet) {
    return
  }

  const lastRow = dictionarySheet.usedRange().endCell().rowNumber()
  let headingRow = null
  let nextSectionRow = null

  for (let row = 1; row <= lastRow; row += 1) {
    const value = String(dictionarySheet.cell(row, 1).value() ?? '').trim()

    if (value.startsWith('Liste des usages du SANDRE')) {
      headingRow = row
      continue
    }

    if (headingRow && value === 'Types de ressource en eau') {
      nextSectionRow = row
      break
    }
  }

  if (!headingRow || !nextSectionRow) {
    return
  }

  dictionarySheet
    .cell(headingRow, 1)
    .value('Liste des usages du SANDRE : voir l’onglet « Usages SANDRE »')
  dictionarySheet.range(headingRow + 1, 1, nextSectionRow - 1, 1).value(null)
}

function populateWaterUses(workbook, waterUses) {
  const rows = getTemplateWaterUses(waterUses)

  if (rows.length === 0) {
    return
  }

  const sheet = workbook.sheet(WATER_USE_SHEET_NAME) ?? workbook.addSheet(WATER_USE_SHEET_NAME)
  const usedRange = sheet.usedRange()

  if (usedRange) {
    usedRange.value(null)
  }

  sheet.range('A1:D1').value([['Code', 'Niveau', 'Libellé', 'Valeur à utiliser']])
  sheet.range(2, 1, rows.length + 1, 4).value(rows.map(row => [
    row.code,
    row.kind,
    row.label,
    row.option
  ]))
  sheet.range(`A1:D${rows.length + 1}`).style({
    fontFamily: 'Arial',
    fontSize: 10,
    verticalAlignment: 'top'
  })
  sheet.range('A1:D1').style({
    bold: true,
    fill: 'E3E3FD',
    horizontalAlignment: 'center'
  })
  sheet.column('A').width(10)
  sheet.column('B').width(18)
  sheet.column('C').width(55)
  sheet.column('D').width(70)
  sheet.freezePanes(0, 1)

  workbook.definedName(
    WATER_USE_DEFINED_NAME,
    sheet.range(2, 4, rows.length + 1, 4)
  )

  clearLegacyDictionaryWaterUses(workbook)
}

function configureUsageColumn(workbook) {
  const sheet = workbook.sheet(DECLARATION_SHEET_NAME)

  if (!sheet) {
    throw new Error(`La feuille "${DECLARATION_SHEET_NAME}" est introuvable.`)
  }

  const columnNumber = findHeaderColumnNumber(sheet, USAGE_COLUMN_NAME)

  if (!columnNumber) {
    throw new Error(`La colonne "${USAGE_COLUMN_NAME}" est introuvable.`)
  }

  const range = sheet.range(FIRST_DATA_ROW, columnNumber, LAST_DATA_ROW, columnNumber)
  range.value(null)
  range.dataValidation({
    type: 'list',
    allowBlank: true,
    showErrorMessage: true,
    errorTitle: 'Usage non reconnu',
    error: 'Sélectionnez un usage proposé dans la liste.',
    formula1: WATER_USE_DEFINED_NAME
  })
}

export function enrichDeclarationTemplateWorkbook(workbook, {
  pointNames = [],
  waterUses = []
} = {}) {
  populatePointNames(workbook, pointNames)
  populateWaterUses(workbook, waterUses)
  configureUsageColumn(workbook)

  return workbook
}

export const declarationTemplateWorkbookConfig = Object.freeze({
  declarationSheetName: DECLARATION_SHEET_NAME,
  firstDataRow: FIRST_DATA_ROW,
  lastDataRow: LAST_DATA_ROW,
  usageColumnName: USAGE_COLUMN_NAME,
  waterUseDefinedName: WATER_USE_DEFINED_NAME,
  waterUseSheetName: WATER_USE_SHEET_NAME
})
