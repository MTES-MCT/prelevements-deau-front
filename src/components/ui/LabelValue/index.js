import {Box, Typography} from '@mui/material'

const LabelValue = ({label, children}) => {
  if (children) {
    return (
      <Box className='flex flex-wrap items-center gap-2'>
        <Typography variant='body1' color='text.secondary'>
          <strong>{label} : </strong>
        </Typography>
        {children}
      </Box>
    )
  }

  return null
}

export default LabelValue
