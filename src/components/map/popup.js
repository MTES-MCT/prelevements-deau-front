import {Person, WaterDropOutlined} from '@mui/icons-material'
import {Box, Chip, Typography} from '@mui/material'

import {formatAutresNoms} from '@/lib/points-prelevement.js'

const Popup = ({point}) => {
  const {nom, autres_noms: autresNoms, beneficiaires, exploitations, usages, typeMilieu} = point
  return (
    <Box className='flex flex-col gap-2'>
      <Typography variant='h6'>{nom || 'Pas de nom renseigné'}</Typography>

      <Typography variant='caption'>
        {autresNoms ? formatAutresNoms(autresNoms) : 'Pas de nom renseigné'}
      </Typography>

      <Box>
        {beneficiaires.length > 0 ? (
          <Box className='flex items-center gap-1'>
            <Person /> {beneficiaires.length} bénéficiaire{beneficiaires.length > 1 ? 's' : ''}
          </Box>
        ) : (
          <Typography variant='caption'>Aucun bénéficiaire</Typography>
        )}
      </Box>

      <Box>
        {exploitations.length > 0 ? (
          <Box className='flex items-center gap-1'>
            <WaterDropOutlined /> {exploitations.length} exploitations{exploitations.length > 1 ? 's' : ''}
          </Box>
        ) : (
          <Typography variant='caption'>Aucun bénéficiaire</Typography>
        )}
      </Box>

      <Box className='flex flex-col gap-1'>
        <Box className='flex gap-1'>
          {usages.map(usage => (
            <Chip
              key={usage}
              label={usage}
              size='small'
              variant='outlined' />
          ))}
        </Box>
        <Chip label={typeMilieu} size='small' />
      </Box>
    </Box>
  )
}

export default Popup
