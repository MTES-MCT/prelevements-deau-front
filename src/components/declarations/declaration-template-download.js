'use client'

import {useState} from 'react'

import {Download} from '@codegouvfr/react-dsfr/Download'

import {readSpreadsheetDownload} from '@/lib/spreadsheet-download.js'

const TEMPLATE_PATH = '/api/declarations/template'
const OUTPUT_FILE_NAME = 'template_declaration_prelevements_enrichi.xlsx'

const DeclarationTemplateDownload = ({inline = false, label = 'Télécharger le modèle de déclaration de volumes enrichi'}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleDownload(event) {
    event.preventDefault()

    try {
      setIsLoading(true)
      setError(null)

      const templateResponse = await fetch(TEMPLATE_PATH)

      const blob = await readSpreadsheetDownload(templateResponse)

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
