import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Skeleton} from '@mui/material'
import {Box} from '@mui/system'

import PointsPrelevementsMap from '@/components/map/points-prelevements-map.js'
import SectionCard from '@/components/ui/SectionCard/index.js'

const PointsPrelevementDetails = ({pointsPrelevementId, pointsPrelevement, handleClick, pointsStatus}) => (
  <SectionCard title='Points de prélèvement' icon='fr-icon-map-pin-2-line'>
    {
      pointsPrelevementId.length > 0 ? (
        pointsPrelevement ? (
          <Box className='flex flex-col gap-2'>
            <Alert
              severity='info'
              description={
                <>
                  <b>{pointsPrelevement.length}</b> point{pointsPrelevement.length > 1 ? 's' : ''} de prélèvement identifié{pointsPrelevement.length > 1 ? 's' : ''}
                </>
              }
            />
            {pointsPrelevement.length > 0 && (
              <PointsPrelevementsMap
                pointsPrelevement={pointsPrelevement}
                handleClick={handleClick}
                pointsStatus={pointsStatus}
              />
            )}
          </Box>
        ) : (
          <Skeleton variant='rectangular' height={300} />
        )
      ) : (
        <Alert severity='warning' description='Aucun point de prélèvement n’a pu être identifié.' />
      )
    }
  </SectionCard>
)

export default PointsPrelevementDetails
