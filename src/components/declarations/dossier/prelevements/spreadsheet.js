import {fr} from '@codegouvfr/react-dsfr'
import Button from '@codegouvfr/react-dsfr/Button'
import Tag from '@codegouvfr/react-dsfr/Tag'
import {
  Box, Divider,
  Typography
} from '@mui/material'

import FileValidationErrors from '@/components/declarations/file-validation-errors.js'
import PrelevementsCalendar from '@/components/declarations/prelevements-calendar.js'

const Spreadsheet = ({file, downloadFile}) => {
  const [, ...filename] = file.storageKey.split('-')
  return (
    <Box key={file.id_file} className='flex flex-col gap-6'>

      {file.result.data && (
        <>
          <Box className='flex flex-col gap-4'>
            <Divider textAlign='left'>
              Paramètres présents par pas de temps
            </Divider>

            <Box className='flex flex-col gap-2'>
              {file.result.data.dailyParameters && (
                <Box className='flex gap-1 items-center'>
                  Journalier : {file.result.data.dailyParameters.map(param => (
                    <Tag key={param.paramIndex} sx={{m: 1}}>
                      {param.nom_parametre} / {param.unite}
                    </Tag>
                  ))}
                </Box>
              )}

              {file.result.data.fifteenMinutesParameters && (
                <Box className='flex gap-1 items-center'>
                  Quinze minutes : {file.result.data.fifteenMinutesParameters.map(param => (
                    <Tag key={param.paramIndex} sx={{m: 1}}>
                      {param.nom_parametre} ({param.unite})
                    </Tag>
                  ))}
                </Box>
              )}
            </Box>
          </Box>

          <Box className='flex flex-col gap-4'>
            <Divider textAlign='left'>
              Calendrier des prélèvements
            </Divider>

            <PrelevementsCalendar data={file.result.data} />
          </Box>
        </>
      )}

      {file.result.errors && (
        <FileValidationErrors errors={file.result.errors} />
      )}

      <Box className='flex justify-between mt-4'>
        <Box className='flex flex-col p-2'>
          <Typography>
            <Box component='span' className='pr-1' sx={{color: fr.colors.decisions.text.label.blueFrance.default}} />
            {filename.join('-')}
          </Typography>
        </Box>

        <Button
          variant='contained'
          iconId='fr-icon-download-line'
          onClick={() => downloadFile(file.storageKey)}
        >
          Télécharger
        </Button>
      </Box>
    </Box>
  )
}

export default Spreadsheet
