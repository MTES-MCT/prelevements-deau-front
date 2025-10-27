import {Box, Typography} from '@mui/material'

import Icon from '@/components/ui/Icon/index.js'

const LabelWithIcon = ({icon, iconId, children}) => (
  <Box className='flex flex-wrap items-center gap-2'>
    {(icon || iconId) && (
      <Typography variant='body2' color='primary'>
        <Icon iconElement={icon} iconId={iconId} />
      </Typography>
    )}
    {children || (
      <Typography variant='body2'>
        <i>Non renseigné</i>
      </Typography>
    )}
  </Box>
)

export default LabelWithIcon
