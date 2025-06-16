import {fr} from '@codegouvfr/react-dsfr'
import Tag from '@codegouvfr/react-dsfr/Tag'
import {
  Alert, Box, Button, Divider,
  Typography
} from '@mui/material'

import PrelevementsCalendar from '@/components/declarations/prelevements-calendar.js'

const Spreadsheet = ({file, downloadFile}) => (
  file ? (
    <Box key={file.id_file} className='flex flex-col gap-6'>

      <Box className='flex flex-col gap-4'>
        <Divider textAlign='left'>
          Paramètres présents par pas de temps
        </Divider>

        <Box className='flex flex-col gap-2'>
          <Box className='flex gap-1 items-center'>
            Journalier : {file.result.data.dailyParameters.map(param => (
              <Tag key={param.paramIndex} sx={{m: 1}}>
                {param.nom_parametre} / {param.unite}
              </Tag>
            ))}
          </Box>

          <Box className='flex gap-1 items-center'>
            Quinze minutes : {file.result.data.fifteenMinutesParameters.map(param => (
              <Tag key={param.paramIndex} sx={{m: 1}}>
                {param.nom_parametre} ({param.unite})
              </Tag>
            ))}
          </Box>
        </Box>
      </Box>

      <Box className='flex flex-col gap-4'>
        <Divider textAlign='left'>
          Calendrier des prélèvements
        </Divider>

        <PrelevementsCalendar data={file.result.data} />
      </Box>

      <Box className='flex justify-between'>
        <Box className='flex flex-col p-2'>
          <Typography>
            <Box component='span' className='pr-1' sx={{color: fr.colors.decisions.text.label.blueFrance.default}} />
            {file.storageKey}
          </Typography>
        </Box>

        <Button
          variant='contained'
          size='small'
          onClick={() => downloadFile(file.storageKey)}
        >
          Télécharger
        </Button>
      </Box>
    </Box>
  ) : (
    <Alert severity='error'>
      Aucun fichier trouvé
    </Alert>
  )
)

export default Spreadsheet
