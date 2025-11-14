'use client'

import {useCallback} from 'react'

import {Box} from '@mui/material'
import {useRouter} from 'next/navigation'

import Map from '@/components/map/index.js'
import {getPointPrelevementURL} from '@/lib/urls.js'

const PreleveurMap = ({points}) => {
  const router = useRouter()

  const handleSelectedPoint = useCallback(point => {
    router.push(getPointPrelevementURL(point))
  }, [router])

  return (
    <Box className='h-[360px]'>
      <Map
        points={points}
        filteredPoints={points.map(p => p.id_point)}
        handleSelectedPoint={handleSelectedPoint}
        mapStyle='plan-ign'
      />
    </Box>
  )
}

export default PreleveurMap
