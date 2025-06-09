import {WaterDrop} from '@mui/icons-material'
import {Box, Typography, Chip} from '@mui/material'

import LabelValue from '@/components/ui/label-value.js'

const PointPrelevementDetails = ({pointPrelevement}) => {
  const {nom, id_point: id, usages} = pointPrelevement
  const typeMilieu = pointPrelevement.type_milieu

  return (
    <Box className='mt-2'>
      <Typography gutterBottom variant='h6' className='flex items-center gap-1'>
        <WaterDrop />
        Point de prélèvement
      </Typography>
      <Box className='flex flex-col gap-2'>
        <Typography variant='body1' color='text.secondary'>
          <strong>{nom}</strong> ({id})
        </Typography>

        <LabelValue label='Type de milieu'>
          <Chip label={typeMilieu} size='small' />
        </LabelValue>

        <LabelValue label='Usages'>
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
        </LabelValue>
      </Box>
    </Box>
  )
}

export default PointPrelevementDetails
