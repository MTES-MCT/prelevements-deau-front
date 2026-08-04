'use client'

import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Skeleton} from '@mui/material'
import {Box} from '@mui/system'
import dynamic from 'next/dynamic'

import DeferredRender from '@/components/ui/deferred-render.js'
import SectionCard from '@/components/ui/SectionCard/index.js'

const PointsPrelevementsMap = dynamic(
  () => import('@/components/map/points-prelevements-map.js'),
  {
    loading: () => <Skeleton variant='rectangular' height={300} />,
    ssr: false
  }
)

const DeferredPointsPrelevementsMap = props => (
  <DeferredRender
    minHeight={300}
    placeholder={<Skeleton variant='rectangular' height={300} />}
    rootMargin='300px 0px'
  >
    <PointsPrelevementsMap {...props} />
  </DeferredRender>
)

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
                  <b>{pointsPrelevement.length}</b> point{pointsPrelevement.length > 1 ? 's' : ''} de prélèvement déjà identifié{pointsPrelevement.length > 1 ? 's' : ''}
                </>
              }
            />
            {pointsPrelevement.length > 0 && (
              <DeferredPointsPrelevementsMap
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
        <Alert severity='warning' description='Aucun point de prélèvement n’est pour l’instant identifié.' />
      )
    }
  </SectionCard>
)

export default PointsPrelevementDetails
