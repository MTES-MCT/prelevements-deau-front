import {Box, Checkbox} from '@mui/material'
import {useTheme} from '@mui/material/styles'

import {legendColors} from './legend-colors.js'

const Bubble = ({color, text, onChange}) => (
  <Box sx={{display: 'flex', justifyContent: 'space-between'}}>
    <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
      <Box
        sx={{
          height: 15,
          width: 15,
          backgroundColor: color,
          border: '1px solid black',
          borderRadius: '50%',
          mr: 1
        }}
      />
      {text}
    </Box>
    <Checkbox
      sx={{p: 0, pl: 1}}
      size='small'
      label={text}
      onChange={onChange}
    />
  </Box>
)

const Legend = ({legend, setFilters}) => {
  const theme = useTheme()
  const {usages, typesMilieu} = legendColors

  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 10,
        left: 10,
        px: 2,
        py: 1,
        borderRadius: 2,
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.primary
      }}
    >
      <Box>Légende :</Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'end',
          fontSize: '0.8rem',
          pb: 1
        }}
      >
        <i>Masquer :</i>
      </Box>
      <Box
        sx={{
          backgroundColor: theme.palette.background.default,
          color: theme.palette.text.primary
        }}
      >
        {legend === 'usages' && (
          usages.map(usage => (
            <Box key={usage.text}>
              <Bubble
                color={usage.color}
                text={usage.text}
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
              onChange={() => setFilters(type.text)}
            />
          ))
        )}
      </Box>
    </Box>
  )
}

export default Legend
