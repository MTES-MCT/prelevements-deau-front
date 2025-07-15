import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {
  Card, CardContent, Typography
} from '@mui/material'
import {Box} from '@mui/system'

import PrelevementsAccordion from '@/components/declarations/dossier/prelevements/prelevements-accordion.js'
import Spreadsheet from '@/components/declarations/dossier/prelevements/spreadsheet.js'
import FileValidationErrors from '@/components/declarations/file-validation-errors.js'
import {formatBytes} from '@/utils/size.js'

const ValidateurResult = ({file, fileType, pointPrelevement, data, errors = []}) => {
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

      {file && errors.length > 0 && !data && (
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

      {data && (
        <PrelevementsAccordion
          isOpen
          idPoint={data.pointPrelevement}
          pointPrelevement={pointPrelevement}
          volumePreleveTotal={data.volumePreleveTotal}
          status={errors?.length > 0 || !data ? 'error' : 'success'}
        >
          {fileType === 'Données standardisées' ? (
            <Spreadsheet
              data={data}
              errors={errors}
            />
          ) : (
            <Alert severity='info' description=' Ce type de dossier n’est pas encore pris en charge.' />
          )}

        </PrelevementsAccordion>
      )}
    </div>
  )
}

export default ValidateurResult
