import {Person} from '@mui/icons-material'
import {
  Box,
  Chip,
  Typography,
  useTheme
} from '@mui/material'

import {getDeclarantTitleFromUser} from '@/lib/declarants.js'

const Popup = ({point}) => {
  const theme = useTheme()
  const {name, autresNoms, preleveurs, usages} = point

  return (
    // TODO : Utiliser le theme DSFR
    <Box className='flex flex-col gap-2' sx={{color: theme.palette.text.primary}}>
      <Typography variant='h6' sx={{color: theme.palette.text.primary}}>
        {name || 'Pas de nom renseigné'}
      </Typography>

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
              key={usage}
              label={usage}
              size='small'
              variant='outlined' />
          ))}
        </Box>
      </Box>
    </Box>
  )
}

export default Popup
