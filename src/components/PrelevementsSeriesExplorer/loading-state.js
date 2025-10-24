/**
 * LoadingState Component
 *
 * Displays loading indicator with message
 */

'use client'

import {CircularProgress, Stack, Typography} from '@mui/material'

const LoadingState = ({message}) => (
  <Stack alignItems='center' paddingY={4}>
    <CircularProgress size={40} />
    <Typography className='mt-2' color='text.secondary' variant='body2'>
      {message}
    </Typography>
  </Stack>
)

export default LoadingState
