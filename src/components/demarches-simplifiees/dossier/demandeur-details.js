import {SupervisorAccount} from '@mui/icons-material'
import {Box, Typography, Grid2 as Grid} from '@mui/material'

const DemandeurDetails = ({nom, prenom}) => (
  <Box className='mt-2'>
    <Typography gutterBottom variant='h6' className='flex items-center gap-1'>
      <SupervisorAccount />
      Demandeur
    </Typography>
    <Grid container spacing={2}>
      <Grid xs={6}>
        <Typography variant='body1' color='text.secondary'>
          <strong>Nom:</strong>
        </Typography>
      </Grid>
      <Grid xs={6}>
        <Typography variant='body1'>{nom}</Typography>
      </Grid>

      <Grid xs={6}>
        <Typography variant='body1' color='text.secondary'>
          <strong>Prénom:</strong>
        </Typography>
      </Grid>
      <Grid xs={6}>
        <Typography variant='body1'>{prenom}</Typography>
      </Grid>
    </Grid>
  </Box>
)

export default DemandeurDetails
