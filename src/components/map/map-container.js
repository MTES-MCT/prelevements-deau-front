'use client'

import {useState} from 'react'

import {Box} from '@mui/material'

import Map from '@/components/map/index.js'
import SidePanel from '@/components/map/side-panel.js'

const MapContainer = ({points}) => {
  const [selectedPoint, setSelectedPoint] = useState(null)

  function handleSelectedPoint(point) {
    setSelectedPoint(point)
  }

  return (
    <Box
      sx={{
        display: 'flex',
        height: 'calc(100vh - 411.17px)',
        width: '100%'
      }}
    >
      <SidePanel selectedPoint={selectedPoint} />
      <Map points={points} handleSelectedPoint={p => handleSelectedPoint(p)} />
    </Box>
  )
}

export default MapContainer
