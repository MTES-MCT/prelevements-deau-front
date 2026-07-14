'use client'

import {useCallback, useState} from 'react'

import {Button} from '@codegouvfr/react-dsfr/Button'

function normalizeCellValue(value) {
  if (value === undefined || value === null) {
    return ''
  }

  if (value instanceof Date) {
    return value
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
  if (typeof column.value === 'function') {
    return normalizeCellValue(column.value(row))
  }

  if (column.key) {
    return normalizeCellValue(row?.[column.key])
  }

  return ''
}

function cleanSheetName(sheetName) {
  return String(sheetName || 'Export')
    .replaceAll(/[\\/?*[\]:]/g, ' ')
    .slice(0, 31)
    .trim() || 'Export'
}

function cleanFileName(filename) {
  return String(filename || 'export.xlsx')
    .replaceAll(/[^\p{L}\d._ -]+/gu, '-')
    .replaceAll(/\s+/g, '-')
}

function getColumnWidth(label, values) {
  const maxLength = Math.max(
    String(label || '').length,
    ...values.map(value => String(value ?? '').length)
  )

  return Math.min(Math.max(maxLength + 2, 12), 60)
}

async function loadXlsxPopulate() {
  const importedModule = await import('xlsx-populate/browser/xlsx-populate')

  return importedModule.default ?? importedModule
}

const ZoneExportButton = ({
  columns,
  filename,
  label = 'Exporter Excel',
  rows,
  resolveRows,
  size = 'medium',
  sheetName
}) => {
  const [isExporting, setIsExporting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleExport = useCallback(async () => {
    setIsExporting(true)
    setErrorMessage('')

    try {
      const XlsxPopulate = await loadXlsxPopulate()
      const exportRows = typeof resolveRows === 'function'
        ? await resolveRows(rows)
        : rows

      const workbook = await XlsxPopulate.fromBlankAsync()
      const sheet = workbook.sheet(0)
      const headers = columns.map(column => column.label)
      const dataRows = (exportRows || []).map(row => columns.map(column => getColumnValue(column, row)))

      sheet.name(cleanSheetName(sheetName))
      sheet.cell(1, 1).value([headers, ...dataRows])
      sheet.row(1).style('bold', true)

      for (const [index, column] of columns.entries()) {
        sheet.column(index + 1).width(getColumnWidth(column.label, dataRows.map(row => row[index])))
      }

      const blob = await workbook.outputAsync({type: 'blob'})
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = cleanFileName(filename)
      document.body.append(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch {
      setErrorMessage('Impossible de générer l’export Excel.')
    } finally {
      setIsExporting(false)
    }
  }, [columns, filename, resolveRows, rows, sheetName])

  return (
    <>
      <Button
        disabled={isExporting}
        iconId='ri-download-line'
        priority='secondary'
        size={size}
        onClick={handleExport}
      >
        {isExporting ? 'Export en cours…' : label}
      </Button>

      {errorMessage ? (
        <p className='fr-error-text fr-mt-2v' role='alert'>
          {errorMessage}
        </p>
      ) : null}
    </>
  )
}

export default ZoneExportButton
