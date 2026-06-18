'use client'

import {useCallback, useState} from 'react'

import {Input} from '@codegouvfr/react-dsfr/Input'
import {Select} from '@codegouvfr/react-dsfr/Select'
import {Tag} from '@codegouvfr/react-dsfr/Tag'
import {Upload} from '@codegouvfr/react-dsfr/Upload'

const MAX_FILE_SIZE = 50 * 1024 * 1024
const SPREADSHEET_ACCEPT = '.xlsx, .xls, .ods, .csv'

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
          <p className='fr-text--sm fr-mb-1w'>Type de déclaration</p>
          <Tag>{selectedDeclarationType?.name ?? selectedDeclarationTypeCode}</Tag>
        </div>
      ) : (
        <Select
          label='Type de déclaration *'
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

      <Upload
        hint='Déposez un ou plusieurs fichiers du type sélectionné. Taille maximale : 50 Mo par fichier.'
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
