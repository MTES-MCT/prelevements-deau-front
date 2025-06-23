import {fr} from '@codegouvfr/react-dsfr'
import Badge from '@codegouvfr/react-dsfr/Badge'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material'

import {formatNumber} from '@/utils/number.js'

const PrelevementsAccordion = ({idPoint, pointPrelevement, volumePreleveTotal = null, status, isOpen, handleSelect, children}) => (
  <Accordion
    expanded={isOpen}
    onChange={handleSelect}
  >
    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
      <Box className='flex justify-between w-full items-center'>
        <Box>
          {pointPrelevement ? (
            <Box>
              <Typography fontWeight='bold' className='flex gap-2'>
                {idPoint && `${idPoint} - `}{pointPrelevement.nom}
              </Typography>
              <Typography variant='body2'>
                Volume prélevé : {' '}
                {volumePreleveTotal === null
                  ? (
                    <>
                      <Box component='span' className='fr-icon-warning-fill' sx={{color: fr.colors.decisions.background.flat.warning.default}} />
                      Non renseigné
                    </>
                  )
                  : `${formatNumber(volumePreleveTotal)} m³`}
              </Typography>
            </Box>
          ) : (
            <Typography fontWeight='bold' className='flex gap-2'>
              <Box component='span' className='fr-icon-warning-fill' sx={{
                color: fr.colors.decisions.background.flat.warning.default
              }} />
              {idPoint
                ? `Le point de prélèvement ${idPoint} n’est pas reconnu`
                : 'Aucun point de prélèvement n’est renseigné pour ces prélèvements'}
            </Typography>
          )}
        </Box>

        <Badge severity={status}>
          {status === 'success' ? 'OK' : 'Anomalie'}
        </Badge>
      </Box>
    </AccordionSummary>
    <AccordionDetails>
      {children}
    </AccordionDetails>
  </Accordion>
)

export default PrelevementsAccordion
