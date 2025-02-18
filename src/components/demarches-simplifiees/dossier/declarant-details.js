import {Person} from '@mui/icons-material'
import {Box, Typography} from '@mui/material'

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

      <Box className='flex flex-wrap gap-2'>
        <Typography variant='body1' color='text.secondary'>
          <strong>Email:</strong>
        </Typography>
        <Typography variant='body1'>{email}</Typography>
      </Box>

      <Box className='flex flex-wrap gap-2'>
        <Typography variant='body1' color='text.secondary'>
          <strong>Téléphone:</strong>
        </Typography>
        <Typography variant='body1'>{telephone}</Typography>
      </Box>
    </Box>
  </Box>
)

export default DeclarantDetails
