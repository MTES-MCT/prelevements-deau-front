import {Person} from '@mui/icons-material'
import {
  Box,
  Chip,
  Typography,
  useTheme
} from '@mui/material'

import {getDeclarantTitleFromUser} from '@/lib/declarants.js'
import {getUsageKey, getUsageLabel} from '@/lib/water-uses.js'
import {
  getPointPrelevementDisplayName,
  getPointPrelevementTechnicalReference
} from '@/utils/point-prelevement.js'

const Popup = ({point, preferUsageName = false}) => {
  const theme = useTheme()
  const {autresNoms, preleveurs, usages} = point
  const displayName = getPointPrelevementDisplayName(point, {
    fallback: 'Pas de nom renseigné',
    preferUsageName
  })
  const technicalReference = getPointPrelevementTechnicalReference(point, {preferUsageName})

  return (
    // Note: migrate this popup to the DSFR theme when the map UI is aligned.
    <Box className='flex flex-col gap-2' sx={{color: theme.palette.text.primary}}>
      <Typography variant='h6' sx={{color: theme.palette.text.primary}}>
        {displayName}
      </Typography>

      {technicalReference && (
        <Typography variant='caption'>Référence : {technicalReference}</Typography>
      )}

      <Typography variant='caption'>
        {autresNoms}
      </Typography>

      <Box>
        {preleveurs.length > 0 ? (
          preleveurs.length < 4 ? (
            preleveurs.map(preleveur => (
              <Box key={preleveur.id} className='flex items-center gap-1'>
                <Person /> { getDeclarantTitleFromUser(preleveur) }
              </Box>
            ))
          ) : (
            <Box className='flex items-center gap-1'>
              <Person /> {preleveurs.length} préleveurs
            </Box>
          )
        ) : (
          <Typography variant='caption'>Aucun préleveur</Typography>
        )}
      </Box>

      <Box className='flex flex-col gap-1'>
        <Box className='flex flex-wrap gap-1'>
          {usages.map(usage => (
            <Chip
              key={getUsageKey(usage)}
              label={getUsageLabel(usage)}
              size='small'
              variant='outlined' />
          ))}
        </Box>
      </Box>
    </Box>
  )
}

export default Popup
