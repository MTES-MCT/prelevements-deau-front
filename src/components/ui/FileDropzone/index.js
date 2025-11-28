'use client'

import {useCallback, useRef, useState} from 'react'

import {fr} from '@codegouvfr/react-dsfr'

import './index.css'

const FileDropzone = ({
  accept = '.pdf,.doc,.docx,.xls,.xlsx,.odt,.ods',
  disabled = false,
  hint = 'Format PDF, Word, Excel - Max 50MB',
  label = 'Glissez-déposez votre fichier ici',
  multiple = false,
  onChange,
  value
}) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isButtonHover, setIsButtonHover] = useState(false)
  const inputRef = useRef(null)

  const handleDragOver = useCallback(e => {
    if (disabled) {
      return
    }

    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [disabled])

  const handleDragLeave = useCallback(e => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(e => {
    if (disabled) {
      return
    }

    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const {files} = e.dataTransfer
    if (files && files.length > 0) {
      onChange?.(files)
    }
  }, [disabled, onChange])

  const handleFileInput = useCallback(e => {
    onChange?.(e.target.files)
  }, [onChange])

  const handleButtonClick = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleRemoveFile = useCallback(index => {
    if (!value) {
      return
    }

    // Create a new FileList-like array without the removed file
    const dt = new DataTransfer()
    for (const [i, file] of [...value].entries()) {
      if (i !== index) {
        dt.items.add(file)
      }
    }

    onChange?.(dt.files.length > 0 ? dt.files : null)
  }, [value, onChange])

  const files = value ? [...value] : []

  return (
    <div className='file-dropzone-container'>
      <div
        className={`file-dropzone ${isDragOver ? 'file-dropzone--drag-over' : ''} ${disabled ? 'file-dropzone--disabled' : ''}`}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <span
          className='fr-icon-upload-line file-dropzone__icon'
          style={{
            color: fr.colors.decisions.text.actionHigh.blueFrance.default
          }}
        />
        <p className='file-dropzone__label'>
          <strong>{label}</strong>
        </p>
        <p className='file-dropzone__separator'>
          ou
        </p>
        <button
          className={`fr-btn ${isButtonHover ? '' : 'fr-btn--secondary'}`}
          disabled={disabled}
          type='button'
          onClick={handleButtonClick}
          onMouseEnter={() => setIsButtonHover(true)}
          onMouseLeave={() => setIsButtonHover(false)}
        >
          Parcourir les fichiers
        </button>
        <input
          ref={inputRef}
          accept={accept}
          className='sr-only'
          disabled={disabled}
          multiple={multiple}
          type='file'
          onChange={handleFileInput}
        />
        <p className='file-dropzone__hint'>
          {hint}
        </p>
      </div>

      {files.length > 0 && (
        <div className='file-dropzone__files'>
          {files.map((file, index) => (
            <div key={`${file.name}-${file.lastModified}`} className='file-dropzone__file'>
              <span className='fr-icon-file-line' />
              <span className='file-dropzone__file-name'>{file.name}</span>
              <button
                className='file-dropzone__file-remove'
                title='Supprimer le fichier'
                type='button'
                onClick={() => handleRemoveFile(index)}
              >
                <span className='fr-icon-close-line' />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default FileDropzone
