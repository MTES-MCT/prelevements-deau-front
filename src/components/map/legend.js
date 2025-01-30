import {Box, Checkbox} from '@mui/material'

import {legendColors} from './legend-colors.js'

const Bubble = ({color, text, isActive, onChange}) => (
  <Box className='flex items-center justify-between gap-2'>
    <Box className='flex items-center gap-2'>
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

    <Checkbox checked={isActive} onChange={onChange} />
  </Box>
)

const Legend = ({legend, activeFilters, setFilters}) => {
  const {usages, typesMilieu} = legendColors

  return (
    <Box>
      <Box>
        {legend === 'usages' && (
          usages.map(usage => (
            <Box key={usage.text}>
              <Bubble
                color={usage.color}
                text={usage.text}
                isActive={!activeFilters.includes(usage.text)}
                onChange={() => setFilters(usage.text)}
              />
            </Box>
          ))
        )}

        {legend === 'typesMilieu' && (
          typesMilieu.map(type => (
            <Bubble
              key={type.text}
              color={type.color}
              text={type.text}
              isActive={!activeFilters.includes(type.text)}
              onChange={() => setFilters(type.text)}
            />
          ))
        )}
      </Box>
    </Box>
  )
}

export default Legend
