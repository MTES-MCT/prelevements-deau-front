'use client'

import {useCallback, useState} from 'react'

import {Button} from '@codegouvfr/react-dsfr/Button'

import {createTabularSpreadsheet} from '@/lib/tabular-spreadsheet.js'

function cleanFileName(filename) {
  return String(filename || 'export.xlsx')
    .replaceAll(/[^\p{L}\d._ -]+/gu, '-')
    .replaceAll(/\s+/g, '-')
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
      const exportRows = typeof resolveRows === 'function'
        ? await resolveRows(rows)
        : rows

      const blob = await createTabularSpreadsheet({columns, rows: exportRows || [], sheetName})
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = cleanFileName(filename)
      document.body.append(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      setErrorMessage(error.message || 'Impossible de générer l’export Excel.')
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
