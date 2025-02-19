import {Box, Typography} from '@mui/material'

const LabelValue = ({label, children}) => (
  <Box className='flex flex-wrap items-center gap-2'>
    <Typography variant='body1' color='text.secondary'>
      <strong>{label}: </strong>
    </Typography>
    {children}
  </Box>
)

export default LabelValue
