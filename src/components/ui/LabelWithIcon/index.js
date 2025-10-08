import {Box, Typography} from '@mui/material'

const LabelWithIcon = ({icon, children}) => (
  <Box className='flex flex-wrap items-center gap-2'>
    <Typography variant='body1' color='primary'>
      <Box component='span' className={icon} />
    </Typography>
    {children || (
      <Typography variant='body2'>
        <i>Non renseigné</i>
      </Typography>
    )}
  </Box>
)

export default LabelWithIcon
