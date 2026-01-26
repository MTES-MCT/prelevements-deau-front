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
import {getPointPrelevementLabel} from '@/utils/point-prelevement.js'

const PrelevementsAccordion = ({idPoint, pointPrelevement, volumePreleveTotal = null, volumeRejeteTotal = null, status, isOpen, handleSelect, typePrelevement, children}) => {
  const isVolumeDefined = typeof volumePreleveTotal === 'number' && !Number.isNaN(volumePreleveTotal)
  const isRejetDefined = typeof volumeRejeteTotal === 'number' && !Number.isNaN(volumeRejeteTotal)
  const hasAnyVolume = isVolumeDefined || isRejetDefined
  const hasPointId = idPoint !== null && idPoint !== undefined && idPoint !== ''

  // Ne pas afficher de warning pour les types qui ne vérifient pas l'existence des points
  const skipPointCheck = ['template-file', 'extract-aquasys', 'gidaf'].includes(typePrelevement)

  const pointLabel = getPointPrelevementLabel({idPoint, pointPrelevement})

  return (
    <Accordion
      expanded={isOpen}
      onChange={handleSelect}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box className='flex justify-between w-full items-center'>
          <Box>
            {pointPrelevement || skipPointCheck ? (
              <Box>
                <Typography fontWeight='bold' className='flex gap-2'>
                  {pointLabel}
                </Typography>
                {isVolumeDefined && (
                  <Typography variant='body2'>
                    Volume prélevé : {formatNumber(volumePreleveTotal)} m³
                  </Typography>
                )}
                {isRejetDefined && (
                  <Typography variant='body2'>
                    Volume rejeté : {formatNumber(volumeRejeteTotal)} m³
                  </Typography>
                )}
                {!hasAnyVolume && (
                  <Typography variant='body2'>
                    <Box component='span' className='fr-icon-warning-fill' sx={{color: fr.colors.decisions.background.flat.warning.default}} />
                    Non renseigné
                  </Typography>
                )}
              </Box>
            ) : (
              <Typography fontWeight='bold' className='flex gap-2'>
                <Box component='span' className='fr-icon-warning-fill' sx={{
                  color: fr.colors.decisions.background.flat.warning.default
                }} />
                {hasPointId
                  ? `Le point de prélèvement ${idPoint} n'est pas reconnu`
                  : 'Aucun point de prélèvement n\'est renseigné pour ces prélèvements'}
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
