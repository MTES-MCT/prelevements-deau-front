import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {
  Card, CardContent, Typography
} from '@mui/material'

import FileValidationErrors from '@/components/declarations/file-validation-errors.js'
import {formatBytes} from '@/utils/size.js'

const ValidateurResult = ({file, errors}) => (
  <div className='flex flex-col gap-4'>
    {errors && (
      <Alert
        closable={false}
        title={errors?.length === 0 ? 'Le fichier est valide' : 'Le fichier est invalide'}
        description={errors?.length === 0 ? 'Aucune erreur détectée' : `Le fichier contient ${errors?.length} erreur${errors?.length > 1 ? 's' : ''}`}
        severity={errors?.length === 0 ? 'success' : 'error'}
      />
    )}

    {file && errors?.length > 0 && (
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
    )}
  </div>
)

export default ValidateurResult
