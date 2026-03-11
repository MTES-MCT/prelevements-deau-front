'use client'

import {useEffect} from 'react'

import {Box, CircularProgress, Typography} from '@mui/material'
import {useRouter} from 'next/navigation'

const Loading = () => {
  const router = useRouter()

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh()
    }, 3000)

    return () => clearInterval(interval)
  }, [router])

  return (
    <Box className='flex flex-col w-full h-full justify-center items-center gap-4'>
      <Typography>
        La déclaration est en cours d'importation...
      </Typography>

      <CircularProgress />
    </Box>
  )
}

export default Loading
