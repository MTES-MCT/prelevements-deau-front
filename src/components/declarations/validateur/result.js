import {useState} from 'react'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {
  Card, CardContent, Typography
} from '@mui/material'
import {Box} from '@mui/system'

import PrelevementsAccordion from '@/components/declarations/dossier/prelevements/prelevements-accordion.js'
import Spreadsheet from '@/components/declarations/dossier/prelevements/spreadsheet.js'
import FileValidationErrors from '@/components/declarations/file-validation-errors.js'
import {formatBytes} from '@/utils/size.js'

const ValidateurResult = ({file, fileType, pointsPrelevement, data, errors = []}) => {
  const [selectedPointId, setSelectedPointId] = useState(data?.length === 1 ? data[0].pointPrelevement : null)
  return (
    <Box className='flex flex-col gap-4'>
      <Alert
        closable={false}
        title={noError ? 'Le fichier est valide' : 'Le fichier est invalide'}
        description={noError ? 'Aucune erreur détectée' : `Le fichier contient ${errors.length} erreur${errors.length > 1 ? 's' : ''}`}
        severity={noError ? 'success' : 'error'}
      />

      <Card variant='outlined'>
        <CardContent>
          <Typography gutterBottom variant='h5' component='div'>
            {file.name}
          </Typography>
          <Typography variant='body2' sx={{color: 'text.secondary'}}>
            {formatBytes(file.size)}
          </Typography>
        </CardContent>

        {errors.length > 0 && !data && (
          <FileValidationErrors errors={errors} />
        )}

        {data && (
          data.map(d => {
            const poinPrelevementId = d?.pointPrelevement || pointsPrelevement[0]

            return (
              <PrelevementsAccordion
                key={d.pointPrelevement}
                isOpen={selectedPointId === poinPrelevementId}
                idPoint={d.pointPrelevement}
                pointPrelevement={pointsPrelevement.find(p => p.id_point === d.pointPrelevement)}
                volumePreleveTotal={d.volumePreleveTotal}
                status={status}
                handleSelect={() => setSelectedPointId(poinPrelevementId)}
              >
                <Spreadsheet
                  data={d}
                  errors={errors}
                />
              </PrelevementsAccordion>
            )
          })
        )}
      </Card>
    </Box>
  )
}

export default ValidateurResult
