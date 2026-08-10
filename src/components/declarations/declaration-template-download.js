'use client'

import {useState} from 'react'

import {Download} from '@codegouvfr/react-dsfr/Download'

import {enrichDeclarationTemplateWorkbook} from '@/lib/declaration-template-workbook.js'
import {getPointsPrelevementOptionsAction} from '@/server/actions/points-prelevement.js'
import {getWaterUsesAction} from '@/server/actions/referentiels.js'

const TEMPLATE_PATH = '/images/assets/modele_declaration_volumes.xlsx'
const OUTPUT_FILE_NAME = 'template_declaration_prelevements_enrichi.xlsx'

const DeclarationTemplateDownload = ({inline = false, label = 'Télécharger le modèle de déclaration de volumes enrichi'}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleDownload(event) {
    event.preventDefault()

    try {
      setIsLoading(true)
      setError(null)

      const [templateResponse, pointsResult, waterUsesResult] = await Promise.all([
        fetch(TEMPLATE_PATH),
        getPointsPrelevementOptionsAction(),
        getWaterUsesAction()
      ])

      if (!templateResponse.ok) {
        throw new Error('Impossible de récupérer le modèle.')
      }

      if (!pointsResult?.success) {
        throw new Error(pointsResult?.error || 'Impossible de récupérer les points de prélèvement.')
      }

      const points = Array.isArray(pointsResult.data) ? pointsResult.data : []
      const pointNames = points.map(point => point?.name).filter(Boolean)
      const waterUses = waterUsesResult?.success && Array.isArray(waterUsesResult.data?.items)
        ? waterUsesResult.data.items
        : []

      const arrayBuffer = await templateResponse.arrayBuffer()
      const {default: XlsxPopulate} = await import('xlsx-populate/browser/xlsx-populate')
      const workbook = await XlsxPopulate.fromDataAsync(arrayBuffer)
      enrichDeclarationTemplateWorkbook(workbook, {pointNames, waterUses})

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

  if (inline) {
    return (
      <>
        <a
          aria-busy={isLoading}
          className='fr-link fr-icon-download-line fr-link--icon-right'
          href={TEMPLATE_PATH}
          // eslint-disable-next-line react/jsx-no-bind
          onClick={handleDownload}
        >
          {isLoading ? 'Préparation du fichier…' : label}
        </a>
        {error ? (
          <span className='fr-text-default--error block'>
            {error}
          </span>
        ) : null}
      </>
    )
  }

  return (
    <div>
      <Download
        details={isLoading ? 'Préparation du fichier…' : 'XLSX – modèle de déclaration de volumes enrichi avec vos points de prélèvement'}
        label={label}
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
