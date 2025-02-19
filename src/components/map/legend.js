import {useState} from 'react'

import AddCircleOutline from '@mui/icons-material/AddCircleOutline'
import Cancel from '@mui/icons-material/Cancel'
import {Box, useTheme} from '@mui/material'

import {legendColors} from './legend-colors.js'

const Bubble = ({color, text}) => (
  <Box className='flex items-center justify-between gap-2'>
    <Box
      sx={{
        height: 15,
        width: 15,
        backgroundColor: color,
        border: '1px solid black',
        borderRadius: '50%'
      }}
    />
    {text}
  </Box>
)

const Legend = () => {
  const {usages} = legendColors
  const theme = useTheme()
  const [isOpen, setIsOpen] = useState(true)

  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        p: 2,
        backgroundColor: theme.palette.background.default
      }}
    >
      {isOpen && (
        <Box sx={{p: 1, borderBottom: '1px solid grey'}}>
          {usages.map(usage => (
            <Box key={usage.text}>
              <Bubble
                color={usage.color}
                text={usage.text}
              />
            </Box>
          ))}
        </Box>
      )}
      <Box
        sx={{
          cursor: 'pointer',
          pt: isOpen ? 1 : 0
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen
          ? <Cancel className='align-bottom' />
          : <AddCircleOutline className='align-bottom' />}
        <span className='pl-2'>
          {isOpen ? 'Fermer' : 'Afficher la légende'}
        </span>
      </Box>
    </Box>
  )
}

export default Legend
