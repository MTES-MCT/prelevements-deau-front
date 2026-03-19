'use client'

import {useState} from 'react'

import {Download} from '@codegouvfr/react-dsfr/Download'
import XlsxPopulate from 'xlsx-populate/browser/xlsx-populate'

import {getPointsPrelevementOptionsAction} from '@/server/actions/points-prelevement.js'

const TEMPLATE_PATH = '/images/assets/template_declaration_prelevements.xlsx'
const SHEET_NAME = 'point_de_prelevement'
const TARGET_COLUMN_NAME = 'id_point_de_prelevement_ou_rejet'
const OUTPUT_FILE_NAME = 'template_declaration_prelevements_enrichi.xlsx'

function findHeaderColumnNumber(sheet, headerName) {
  const usedRange = sheet.usedRange()
  const endColumn = usedRange.endCell().columnNumber()

  for (let col = 1; col <= endColumn; col += 1) {
    const value = String(sheet.cell(1, col).value() ?? '').trim()

    if (value === headerName) {
      return col
    }
  }

  return null
}

const DeclarationTemplateDownload = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleDownload(event) {
    event.preventDefault()

    try {
      setIsLoading(true)
      setError(null)

      const [templateResponse, result] = await Promise.all([
        fetch(TEMPLATE_PATH),
        getPointsPrelevementOptionsAction()
      ])

      if (!templateResponse.ok) {
        throw new Error('Impossible de récupérer le template.')
      }

      if (!result?.success) {
        throw new Error(result?.error || 'Impossible de récupérer les points de prélèvement.')
      }

      const points = Array.isArray(result.data) ? result.data : []
      const pointNames = points.map(point => point?.name).filter(Boolean)

      const arrayBuffer = await templateResponse.arrayBuffer()
      const workbook = await XlsxPopulate.fromDataAsync(arrayBuffer)

      const sheet = workbook.sheet(SHEET_NAME)
      if (!sheet) {
        throw new Error(`La feuille "${SHEET_NAME}" est introuvable.`)
      }

      const columnNumber = findHeaderColumnNumber(sheet, TARGET_COLUMN_NAME)
      if (!columnNumber) {
        throw new Error(`La colonne "${TARGET_COLUMN_NAME}" est introuvable.`)
      }

      const startRow = 2

      // On vide l'ancienne zone sans toucher au style
      const usedRange = sheet.usedRange()
      const lastRow = Math.max(usedRange.endCell().rowNumber(), startRow + pointNames.length - 1)

      for (let row = startRow; row <= lastRow; row += 1) {
        sheet.cell(row, columnNumber).value(null)
      }

      // On remplit ligne par ligne
      for (const [index, pointId] of pointNames.entries()) {
        const row = startRow + index
        sheet.cell(row, columnNumber).value(pointId)
      }

      const blob = await workbook.outputAsync()

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = OUTPUT_FILE_NAME
      document.body.append(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error_) {
      setError(error_.message || 'Une erreur est survenue.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <Download
        details={isLoading ? 'Préparation du fichier…' : 'XLSX – template enrichi avec vos points de prélèvement'}
        label='Télécharger le template « Données standardisées »'
        linkProps={{
          href: TEMPLATE_PATH,
          onClick: handleDownload,
          'aria-busy': isLoading
        }}
      />

      {error ? (
        <p className='fr-text--sm fr-mt-2w fr-text-default--error'>
          {error}
        </p>
      ) : null}
    </div>
  )
}

export default DeclarationTemplateDownload
