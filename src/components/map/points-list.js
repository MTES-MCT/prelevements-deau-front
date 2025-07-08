import {
  Box, CircularProgress, List, Typography
} from '@mui/material'
import {orderBy} from 'lodash-es'

import Point from '@/components/map/point.js'

const PointsList = ({points, isLoading, onSelect}) => {
  // Si points est null, afficher un indicateur de chargement centré
  if (isLoading) {
    return (
      <Box className='flex flex-col h-full items-center justify-center gap-2'>
        <CircularProgress />
        <Typography variant='body2' className='ml-2'>Chargement…</Typography>
      </Box>
    )
  }

  // Sinon, afficher la liste des points
  return (
    <div className='flex flex-col gap-2'>
      <List>
        {orderBy(points, 'nom').map((point, index) => (
          <Point
            key={point._id}
            point={point}
            index={index}
            onSelect={onSelect}
          />
        ))}
      </List>
    </div>
  )
}

export default PointsList
