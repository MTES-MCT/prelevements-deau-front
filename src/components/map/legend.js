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
      <Box>
        {usages.map(usage => (
          <Box key={usage.text}>
            <Bubble
              color={usage.color}
              text={usage.text}
            />
          </Box>
        ))}
      </Box>
    </Box>
  )
}

export default Legend
