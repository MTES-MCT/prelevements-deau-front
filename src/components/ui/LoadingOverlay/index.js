'use client'

import {Box, CircularProgress} from '@mui/material'

const LoadingOverlay = () => (
  <Box
    sx={{
      position: 'absolute',
      zIndex: 100,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(255, 255, 255, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}
  >
    <CircularProgress />
  </Box>
)

export default LoadingOverlay
