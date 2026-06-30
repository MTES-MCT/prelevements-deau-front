import {useState} from 'react'

import {AddCircleOutline, Cancel} from '@mui/icons-material'
import {
  alpha,
  Box,
  useTheme
} from '@mui/material'

import {legendColors, usageColors, usageLabels} from '@/components/map/legend-colors.js'

const Bubble = ({color, text, textColor}) => (
  <Box className='flex items-center justify-between gap-2'>
    <Box
      sx={{
        backgroundColor: color,
        color: textColor || 'black',
        px: 1,
        mt: 1,
        borderRadius: '5px',
        whiteSpace: 'normal',
        lineHeight: 1.2
      }}
    >
      <b><small>{text.toUpperCase()}</small></b>
    </Box>
  </Box>
)

const Legend = () => {
  const theme = useTheme()
  const [isOpen, setIsOpen] = useState(false)

  const usages = legendColors.usages.filter(usage => usage.key !== '0' && usage.key !== '1')

  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        p: 1,
        maxWidth: {xs: 'calc(100% - 16px)', sm: 320},
        maxHeight: '45%',
        overflow: 'hidden',
        backgroundColor: alpha(theme.palette.background.default, 0.88),
        borderTopRightRadius: 1
      }}
    >
      {isOpen && (
        <Box
          sx={{
            p: 1,
            pr: 0.5,
            borderBottom: '1px solid grey',
            maxHeight: {xs: 180, sm: 260},
            overflowY: 'auto'
          }}
        >
          {usages.map(usage => (
            <Box key={usage.key}>
              <Bubble
                color={usageColors[usage.key].color}
                text={usageLabels[usage.key]}
                textColor={usageColors[usage.key].textColor}
              />
            </Box>
          ))}
        </Box>
      )}

      <Box
        sx={{cursor: 'pointer', pt: isOpen ? 1 : 0}}
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
