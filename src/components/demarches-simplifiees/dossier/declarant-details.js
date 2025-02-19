import {Person} from '@mui/icons-material'
import {Box, Typography} from '@mui/material'

import LabelValue from '@/components/ui/label-value.js'

const DeclarantDetails = ({raisonSociale, email, telephone}) => (
  <Box className='mt-2'>
    <Typography gutterBottom variant='h6' className='flex items-center gap-1'>
      <Person />
      Déclarant
    </Typography>
    <Box className='flex flex-col gap-2'>
      <Typography variant='body1' color='text.secondary'>
        <strong>{raisonSociale}</strong>
      </Typography>

      <LabelValue label='Email'>
        <Typography variant='body1'>{email}</Typography>
      </LabelValue>

      <LabelValue label='Téléphone'>
        <Typography variant='body1'>{telephone}</Typography>
      </LabelValue>
    </Box>
  </Box>
)

export default DeclarantDetails
