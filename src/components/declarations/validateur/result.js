import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {
  Card, CardContent, Typography
} from '@mui/material'
import {Box} from '@mui/system'

import FileValidationErrors from '@/components/declarations/file-validation-errors.js'
import {formatBytes} from '@/utils/size.js'

const ValidateurResult = ({file, errors = []}) => {
  const noError = errors.length === 0
  return (
    <div className='flex flex-col gap-4'>
      {errors && (
        <Alert
          closable={false}
          title={noError ? 'Le fichier est valide' : 'Le fichier est invalide'}
          description={noError ? 'Aucune erreur détectée' : `Le fichier contient ${errors.length} erreur${errors.length > 1 ? 's' : ''}`}
          severity={noError ? 'success' : 'error'}
        />
      )}

      {file && errors.length > 0 && (
        <Box className='flex flex-col gap-4'>
          <Card variant='outlined'>
            <CardContent>
              <Typography gutterBottom variant='h5' component='div'>
                {file.name}
              </Typography>
              <Typography variant='body2' sx={{color: 'text.secondary'}}>
                {formatBytes(file.size)}
              </Typography>
            </CardContent>
            <FileValidationErrors errors={errors} />
          </Card>
        </Box>
      )}
    </div>
  )
}

export default ValidateurResult
