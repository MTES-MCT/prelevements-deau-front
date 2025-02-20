import {fr} from '@codegouvfr/react-dsfr'
import {
  Box, CircularProgress, List, ListItem, Chip, Typography
} from '@mui/material'
import {orderBy} from 'lodash-es'

import {legendColors} from '@/components/map/legend-colors.js'

const PointsList = ({points, isLoading, onSelect}) => {
  // Fonction utilitaire pour récupérer la couleur associée à un usage
  const getUsageColor = usage => {
    const usageItem = legendColors.usages.find(u => u.text === usage)
    return usageItem ? usageItem.color : undefined
  }

  // Fonction utilitaire pour récupérer la couleur associée au type de milieu
  const getTypeMilieuColor = typeMilieu => {
    const typeItem = legendColors.typesMilieu.find(t => t.text === typeMilieu)
    return typeItem ? typeItem.color : undefined
  }

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
          <ListItem
            key={point.id_point}
            sx={{
              backgroundColor: index % 2 === 0 ? fr.colors.decisions.background.default.grey.default : fr.colors.decisions.background.alt.blueFrance.default,
              flexDirection: 'column',
              alignItems: 'flex-start',
              py: 1,
              cursor: 'pointer'
            }}
            onClick={() => onSelect(point.id_point)}
          >
            <Typography variant='body1' component='div'>
              {point.id_point} - {point.nom}
            </Typography>
            <Box className='flex gap-1 mt-1 flex-wrap'>
              {point.typeMilieu && (
                <Chip
                  label={point.typeMilieu}
                  sx={{
                    backgroundColor: getTypeMilieuColor(point.typeMilieu),
                    color: 'white'
                  }}
                />
              )}
              {point.usages
                && point.usages.map(usage => (
                  <Chip
                    key={`${point.id_point}-${usage}`}
                    label={usage}
                    sx={{
                      backgroundColor: getUsageColor(usage),
                      color: 'white'
                    }}
                  />
                ))}
            </Box>
          </ListItem>
        ))}
      </List>
    </div>
  )
}

export default PointsList
