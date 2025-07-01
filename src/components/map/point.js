
import {fr} from '@codegouvfr/react-dsfr'
import {
  Box, ListItem, Chip, Typography
} from '@mui/material'

import {legendColors} from '@/components/map/legend-colors.js'

// Fonction utilitaire pour récupérer la couleur associée à un usage
const getUsageColor = usage => {
  const {color: background, textColor} = legendColors.usages.find(u => u.text === usage) || {}
  return {background, textColor}
}

// Fonction utilitaire pour récupérer la couleur associée au type de milieu
const getTypeMilieuColor = typeMilieu => {
  const typeItem = legendColors.typesMilieu.find(t => t.text === typeMilieu)
  return typeItem ? typeItem.color : undefined
}

const Point = ({point, index, onSelect}) => (
  <ListItem
    key={point.id_point}
    sx={{
      backgroundColor: index % 2 === 0 ? fr.colors.decisions.background.default.grey.default : fr.colors.decisions.background.alt.blueFrance.default,
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      py: 2,
      cursor: 'pointer'
    }}
    onClick={() => onSelect(point.id_point)}
  >
    <Typography variant='body1' component='div'>
      {point.id_point} - {point.nom}
    </Typography>
    <Box className='flex gap-1 flex-wrap'>
      {point.typeMilieu && (
        <Chip
          label={point.typeMilieu}
          sx={{
            backgroundColor: getTypeMilieuColor(point.typeMilieu),
            color: 'white'
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
