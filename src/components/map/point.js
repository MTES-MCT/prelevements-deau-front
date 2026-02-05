
import {fr} from '@codegouvfr/react-dsfr'
import {
  Box, ListItem, Chip, Typography
} from '@mui/material'

import {getUsageColor, getTypeMilieuColor} from '@/lib/points-prelevement.js'

const Point = ({point, index}) => (
  <ListItem
    key={point._id}
    sx={{
      backgroundColor: index % 2 === 0 ? fr.colors.decisions.background.default.grey.default : fr.colors.decisions.background.alt.blueFrance.default,
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 2,
      cursor: 'pointer'
    }}
  >
    <Typography variant='body1' component='div'>
      {point.name}
    </Typography>
    <Box className='flex gap-1 flex-wrap justify-end'>
      {point.waterBodyType && (
        <Chip
          label={point.waterBodyType}
          sx={{
            backgroundColor: getTypeMilieuColor(point.waterBodyType).background,
            color: getTypeMilieuColor(point.waterBodyType).textColor
          }}
        />
      )}
      {point.usages && point.usages.map(usage => (
        <Chip
          key={`${point._id}-${usage}`}
          label={usage}
          sx={{
            backgroundColor: getUsageColor(usage).background,
            color: getUsageColor(usage).textColor
          }}
        />
      ))}
    </Box>
  </ListItem>
)

export default Point
