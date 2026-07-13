'use client'

import {useCallback, useState} from 'react'

import {Input} from '@codegouvfr/react-dsfr/Input'
import {Select} from '@codegouvfr/react-dsfr/Select'
import {Tag} from '@codegouvfr/react-dsfr/Tag'
import {Upload} from '@codegouvfr/react-dsfr/Upload'

import DeclarationTemplateDownload from '@/components/declarations/declaration-template-download.js'

const MAX_FILE_SIZE_MB = 50
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024
const SPREADSHEET_ACCEPT = '.xlsx, .xls, .ods, .csv'
const TEMPLATE_DECLARATION_TYPE_CODE = 'template-file'

const FileValidateurForm = ({
  allowedDeclarationTypes = [],
  comment = '',
  resetForm,
  selectedDeclarationTypeCode,
  onCommentChange,
  onDeclarationTypeChange,
  handleSubmit
}) => {
  const [fileInputError, setFileInputError] = useState(null)

  const selectedDeclarationType = allowedDeclarationTypes.find(
    declarationType => declarationType.code === selectedDeclarationTypeCode
  )
  const canDownloadTemplate = allowedDeclarationTypes.some(
    declarationType => declarationType.code === TEMPLATE_DECLARATION_TYPE_CODE
  )

  const inputError = fileInputError || (selectedDeclarationTypeCode
    ? null
    : 'Sélectionner d’abord un type de déclaration.')

  const handleFileChange = useCallback(event => {
    const selectedFiles = [...(event.target.files ?? [])]

    if (selectedFiles.length === 0) {
      return
    }

    const oversizedFile = selectedFiles.find(file => file.size > MAX_FILE_SIZE)
    if (oversizedFile) {
      resetForm()
      setFileInputError(`Le fichier ${oversizedFile.name} dépasse la taille maximale autorisée (50 Mo).`)
      return
    }

    resetForm()
    setFileInputError(null)
    handleSubmit(selectedFiles)
  }, [handleSubmit, resetForm])

  const handleDeclarationTypeChange = event => {
    setFileInputError(null)
    onDeclarationTypeChange?.(event.target.value)
  }

  return (
    <div className='flex flex-col gap-4'>
      {allowedDeclarationTypes.length === 1 ? (
        <div>
          <p className='fr-text--sm fr-mb-1w'>Type de fichier attendu</p>
          <Tag>{selectedDeclarationType?.name ?? selectedDeclarationTypeCode}</Tag>
        </div>
      ) : (
        <Select
          label='Type de fichier attendu *'
          nativeSelectProps={{
            value: selectedDeclarationTypeCode,
            onChange: handleDeclarationTypeChange
          }}
        >
          <option disabled hidden value=''>
            Sélectionner un type de déclaration
          </option>
          {allowedDeclarationTypes.map(declarationType => (
            <option key={declarationType.code} value={declarationType.code}>
              {declarationType.name}
            </option>
          ))}
        </Select>
      )}

      <div className='fr-text--sm flex flex-col gap-1 text-gray-700'>
        <p className='fr-mb-0'>
          Vous pouvez déposer directement les fichiers issus de votre outil logiciel de gestion des prélèvements.
        </p>
        {canDownloadTemplate && (
          <p className='fr-mb-0'>
            Si vous n&apos;utilisez pas d&apos;outil logiciel, remplissez notre modèle de déclaration de volumes (format Excel) :{' '}
            <DeclarationTemplateDownload inline label='Télécharger le modèle' />
          </p>
        )}
        <p className='fr-mb-0'>Taille maximale : {MAX_FILE_SIZE_MB} Mo par fichier.</p>
      </div>

      <Upload
        hint='Déposez un ou plusieurs fichiers du type sélectionné.'
        state={inputError ? 'error' : 'default'}
        stateRelatedMessage={inputError}
        nativeInputProps={{
          onChange: handleFileChange,
          accept: SPREADSHEET_ACCEPT,
          multiple: true,
          disabled: !selectedDeclarationTypeCode
        }}
      />

      <Input
        textArea
        label='Commentaire'
        nativeTextAreaProps={{
          value: comment,
          onChange: e => onCommentChange?.(e.target.value),
          rows: 3
        }}
        hintText='Facultatif'
      />
    </div>
  )
}

export default FileValidateurForm
