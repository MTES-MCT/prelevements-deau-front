
import {fr} from '@codegouvfr/react-dsfr'
import {
  Box, ListItem, Chip, Typography
} from '@mui/material'

import {getTypeMilieuColor} from '@/lib/points-prelevement.js'
import {
  getUsageColor,
  getUsageKey,
  getUsageLabel,
  getUsageTextColor
} from '@/lib/water-uses.js'
import {
  getPointPrelevementDisplayName,
  getPointPrelevementTechnicalReference
} from '@/utils/point-prelevement.js'

const Point = ({point, index, preferUsageName = false}) => {
  const displayName = getPointPrelevementDisplayName(point, {
    fallback: 'Point de prélèvement',
    preferUsageName
  })
  const technicalReference = getPointPrelevementTechnicalReference(point, {preferUsageName})

  return (
    <ListItem
      key={point.id}
      sx={{
        backgroundColor: index % 2 === 0 ? fr.colors.decisions.background.default.grey.default : fr.colors.decisions.background.alt.blueFrance.default,
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 2,
        cursor: 'pointer'
      }}
    >
      <div className='min-w-0'>
        <Typography variant='body1' component='div' className='break-words'>
          {displayName}
        </Typography>
        {technicalReference && (
          <Typography variant='caption' component='div' className='break-all text-gray-600'>
            Référence : {technicalReference}
          </Typography>
        )}
      </div>
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
            key={`${point.id}-${getUsageKey(usage)}`}
            label={getUsageLabel(usage)}
            sx={{
              backgroundColor: getUsageColor(usage),
              color: getUsageTextColor(usage)
            }}
          />
        ))}
      </Box>
    </ListItem>
  )
}

export default Point
