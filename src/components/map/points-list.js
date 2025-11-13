import {
  Box, CircularProgress, List, Typography
} from '@mui/material'
import {orderBy} from 'lodash-es'
import Link from 'next/link'

import Icon from '@/components/ui/Icon/index.js'
import ListItem from '@/components/ui/ListItem/index.js'
import {formatFullDateFr} from '@/lib/format-date.js'
import {usageIcons} from '@/lib/points-prelevement.js'
import {getPointPrelevementURL} from '@/lib/urls.js'

const PointsList = ({points, isLoading}) => {
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
        {orderBy(points, 'nom').map((point, index) =>
          (
            <Link key={point._id} href={getPointPrelevementURL(point)}>
              <ListItem
                border
                title={`${point.id_point} - ${point.nom}`}
                subtitle={<><Icon iconId='fr-icon-map-pin-2-line'
                  className='fr-icon--sm' />{point.commune.nom}, {point.commune.code}</>}
                tags={[{label: point.type_milieu, severity: 'info', hasIcon: false}]}
                rightIcons={point.usages.map(usage => (
                  {label: usage, icon: usageIcons[usage]}
                ))}
                metas={[{
                  content: `${point.preleveurs.length} préleveur(s)`,
                  iconId: 'fr-icon-user-line'
                }, {
                  content: `Exploité depuis le ${formatFullDateFr(point.exploitationsStartDate)}`,
                  iconId: 'fr-icon-calendar-2-line'
                }]}
                background={index % 2 ? 'secondary' : 'primary'}
              />
            </Link>
          ))}
      </List>
    </div>
  )
}

export default PointsList
