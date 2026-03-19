import {Card} from '@mui/material'
import {Box} from '@mui/system'

import FileValidationErrors from '@/components/declarations/file-validation-errors.js'

const FileValidationResult = ({
  fileName,
  validationStatus,
  errors = []
}) => {
  const hasError = validationStatus === 'error' || errors.some(({severity}) => severity === 'error')
  const hasWarning = validationStatus === 'warning' || errors.some(({severity}) => severity === 'warning')
  const status = hasError ? 'error' : (hasWarning ? 'warning' : 'success')
  const subtitle = hasError
    ? `Le fichier contient ${errors.length} erreur${errors.length > 1 ? 's' : ''}`
    : (hasWarning
      ? `Le fichier contient ${errors.length} avertissement${errors.length > 1 ? 's' : ''}`
      : 'Le fichier est valide'
    )

  return (
    <Box className='flex flex-col gap-4'>
      <Card variant='outlined'>
        <div className={`flex justify-between gap-2 sm:flex-wrap fr-alert ${`fr-alert--${status}`}`}>
          <div>
            <h3 className='fr-alert__title'>{fileName}</h3>
            <p>{subtitle}</p>
          </div>
        </div>

        {errors.length > 0 && (
          <FileValidationErrors errors={errors} />
        )}
      </Card>
    </Box>
  )
}

export default FileValidationResult
