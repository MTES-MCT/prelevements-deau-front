function normalizeCellValue(value) {
  if (value === undefined || value === null) {
    return ''
  }

  if (typeof value === 'boolean') {
    return value ? 'Oui' : 'Non'
  }

  if (Array.isArray(value)) {
    return value.filter(Boolean).join(', ')
  }

  return value
}

function getColumnValue(column, row) {
  return normalizeCellValue(typeof column.value === 'function' ? column.value(row) : row?.[column.key])
}

export function cleanSheetName(sheetName) {
  return String(sheetName || 'Export')
    .replaceAll(/[\\/?*[\]:]/g, ' ')
    .slice(0, 31)
    .trim() || 'Export'
}

export async function createTabularSpreadsheet({columns, rows = [], sheetName}) {
  const {default: writeExcelFile} = await import('write-excel-file/universal')
  const values = rows.map(row => columns.map(column => getColumnValue(column, row)))
  const widths = columns.map((column, index) => {
    let width = String(column.label || '').length
    for (const row of values) {
      width = Math.max(width, String(row[index] ?? '').length)
    }

    return {width: Math.min(Math.max(width + 2, 12), 60)}
  })
  const data = [
    columns.map(column => ({value: column.label, type: String, fontWeight: 'bold'})),
    ...values.map(row => row.map(value => value instanceof Date
      ? {value, type: Date, format: 'dd/mm/yyyy'}
      : {value, type: typeof value === 'number' ? Number : String}))
  ]

  return writeExcelFile(data, {sheet: cleanSheetName(sheetName), columns: widths}).toBlob()
}
