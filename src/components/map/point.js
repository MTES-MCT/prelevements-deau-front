
import {fr} from '@codegouvfr/react-dsfr'
import {
  Box, ListItem, Chip, Typography
} from '@mui/material'

import {getUsageColor, getTypeMilieuColor} from '@/lib/points-prelevement.js'

const Point = ({point, index, onSelect}) => (
  <ListItem
    key={point.id_point}
    sx={{
      backgroundColor: index % 2 === 0 ? fr.colors.decisions.background.default.grey.default : fr.colors.decisions.background.alt.blueFrance.default,
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 2,
      cursor: 'pointer'
    }}
    onClick={() => onSelect(point.id_point)}
  >
    <Typography variant='body1' component='div'>
      {point.id_point} - {point.nom}
    </Typography>
    <Box className='flex gap-1 flex-wrap justify-end'>
      {point.typeMilieu && (
        <Chip
          label={point.typeMilieu}
          sx={{
            backgroundColor: getTypeMilieuColor(point.typeMilieu).background,
            color: getTypeMilieuColor(point.typeMilieu).textColor
          }}
        />
      )}
      {point.usages && point.usages.map(usage => (
        <Chip
          key={`${point.id_point}-${usage}`}
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
