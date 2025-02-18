import {WaterDrop} from '@mui/icons-material'
import {Box, Typography, Chip} from '@mui/material'

const PointPrelevementDetails = ({nom, id_point: id, typeMilieu, usages}) => (
  <Box className='mt-2'>
    <Typography gutterBottom variant='h6' className='flex items-center gap-1'>
      <WaterDrop />
      Point de prélèvement
    </Typography>
    <Box className='flex flex-col gap-2'>
      <Typography variant='body1' color='text.secondary'>
        <strong>{nom}</strong> ({id})
      </Typography>

      <Box className='flex flex-wrap gap-2'>
        <Typography variant='body1' color='text.secondary'>
          <strong>Type de milieu:</strong>
        </Typography>
        <Chip label={typeMilieu} size='small' />
      </Box>

      <Box className='flex flex-wrap gap-2'>
        <Typography variant='body1' color='text.secondary'>
          <strong>Usages:</strong>
        </Typography>
        {usages.some(Boolean).length > 0 ? (
          <Box className='flex gap-1'>
            {usages.map(usage => (
              <Chip
                key={usage}
                label={usage}
                size='small'
                variant='outlined' />
            ))}
          </Box>
        ) : (
          <Typography variant='body2'>
            <i>Aucun usage renseigné</i>
          </Typography>
        )}
      </Box>
    </Box>
  </Box>
)

export default PointPrelevementDetails
