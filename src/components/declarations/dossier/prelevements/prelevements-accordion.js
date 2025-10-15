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

const PrelevementsAccordion = ({idPoint, pointPrelevement, volumePreleveTotal = null, status, isOpen, handleSelect, children}) => {
  const pointName = pointPrelevement?.nom || pointPrelevement?.name || pointPrelevement?.label
  const isVolumeDefined = typeof volumePreleveTotal === 'number' && !Number.isNaN(volumePreleveTotal)
  const hasPointId = idPoint !== null && idPoint !== undefined && idPoint !== ''

  const pointLabel = (() => {
    if (pointName && hasPointId) {
      return `${idPoint} - ${pointName}`
    }

    if (pointName) {
      return pointName
    }

    if (hasPointId) {
      return `Point ${idPoint}`
    }

    return 'Point de prélèvement'
  })()

  return (
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
                  {pointLabel}
                </Typography>
                <Typography variant='body2'>
                  Volume prélevé : {' '}
                  {isVolumeDefined
                    ? `${formatNumber(volumePreleveTotal)} m³`
                    : (
                      <>
                        <Box component='span' className='fr-icon-warning-fill' sx={{color: fr.colors.decisions.background.flat.warning.default}} />
                        Non renseigné
                      </>
                    )}
                </Typography>
              </Box>
            ) : (
              <Typography fontWeight='bold' className='flex gap-2'>
                <Box component='span' className='fr-icon-warning-fill' sx={{
                  color: fr.colors.decisions.background.flat.warning.default
                }} />
                {hasPointId
                  ? `Le point de prélèvement ${idPoint} n’est pas reconnu`
                  : 'Aucun point de prélèvement n’est renseigné pour ces prélèvements'}
              </Typography>
            )}
          </Box>

          <Badge severity={status}>
            {status === 'success' ? 'OK' : (status === 'warning' ? 'Avertissement' : 'Erreur')}
          </Badge>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        {children}
      </AccordionDetails>
    </Accordion>
  )
}

export default PrelevementsAccordion
