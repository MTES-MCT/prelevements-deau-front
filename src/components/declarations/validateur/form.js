'use client'

import {useState} from 'react'

import {Input} from '@codegouvfr/react-dsfr/Input'
import {Upload} from '@codegouvfr/react-dsfr/Upload'
import {useEventCallback} from '@mui/material'

const FileValidateurForm = ({resetForm, handleSubmit}) => {
  const [file, setFile] = useState(null)
  const [comment, setComment] = useState(null)
  const [inputError, setInputError] = useState(null)

  const handleFileChange = useEventCallback(event => {
    const file = event.target.files[0]
    if (file.size > 10 * 1024 * 1024) {
      setInputError('Le fichier dépasse la taille maximale autorisée (10 Mo)')
    } else {
      resetForm()
      setInputError(null)
      setFile(file)
      handleSubmit(file, comment)
    }
  }, [file, handleSubmit, comment])

  return (
    <div className='flex flex-col gap-4'>
      <Upload
        hint='Déposé le fichier que vous souhaitez valider'
        state={inputError ? 'error' : 'default'}
        stateRelatedMessage={inputError}
        nativeInputProps={{
          onChange: handleFileChange,
          accept: '.xlsx, .xls, .ods'
        }}
      />

      <Input
        textArea
        label='Commentaire'
        nativeTextAreaProps={{
          value: comment,
          onChange: e => setComment(e.target.value),
          rows: 3
        }}
        hintText='Facultatif'
      />
    </div>
  )
}

export default FileValidateurForm
