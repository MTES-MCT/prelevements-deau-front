import {Suspense} from 'react'

import {notFound} from 'next/navigation'

import {buildPageTitle} from '@/app/metadata-utils.js'
import ResourceMutationHistory from '@/components/audit/resource-mutation-history.js'
import ExploitationsList from '@/components/exploitations/exploitations-list.js'
import PointIdentification from '@/components/points-prelevement/point-identification.js'
import PointLocalisation from '@/components/points-prelevement/point-localisation.js'
import SeriesOptionsLoader from '@/components/points-prelevement/series-options-loader.js'
import ResourceDeleteAction from '@/components/ui/resource-delete-action.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getNewExploitationURL} from '@/lib/urls.js'
import {getResourceAuditHistoryAction} from '@/server/actions/audit-events.js'
import {getPointPrelevementAction, getExploitationsByPointIdAction} from '@/server/actions/points-prelevement.js'
import {getCurrentSessionInfo} from '@/server/actions/user.js'
import {getPointPrelevementLabel} from '@/utils/point-prelevement.js'

const PointHistory = async ({historyPromise, pointId}) => {
  const historyResult = await historyPromise

  if (!historyResult.success) {
    return null
  }

  return (
    <ResourceMutationHistory
      initialData={historyResult.data?.data}
      resourceId={pointId}
      resourceType='POINT'
    />
  )
}

export async function generateMetadata({params}) {
  const {id} = await params
  const [result, userResult] = await Promise.all([
    getPointPrelevementAction(id),
    getCurrentSessionInfo()
  ])
  const preferUsageName = userResult?.data?.role === 'DECLARANT'

  return buildPageTitle([
    result.success && result.data
      ? getPointPrelevementLabel({pointPrelevement: result.data, preferUsageName})
      : null
  ], 'Point de prélèvement')
}

const Page = async ({params}) => {
  const {id} = await params
  const [userResult, pointResult] = await Promise.all([
    getCurrentSessionInfo(),
    getPointPrelevementAction(id)
  ])
  const role = userResult?.data?.role ?? null
  const preferUsageName = role === 'DECLARANT'

  if (!pointResult.success || !pointResult.data) {
    notFound()
  }

  const pointPrelevement = pointResult.data
  const permissions = new Set(pointPrelevement.right?.permissions || [])
  const can = permission => role === 'ADMIN'
    || (role === 'INSTRUCTOR' && permissions.has(permission))
  const isDeclarantViewer = role === 'DECLARANT'

  const exploitationsPromise = can('exploitation.list')
    ? getExploitationsByPointIdAction(id)
    : Promise.resolve({data: []})
  const historyPromise = can('pp.update')
    ? getResourceAuditHistoryAction('POINT', pointPrelevement.id)
    : null
  const exploitationsResult = await exploitationsPromise
  const exploitations = exploitationsResult.data || []

  return (
    <>
      <StartDsfrOnHydration />

      <div className='flex flex-col gap-8 mb-16'>
        <PointIdentification
          pointPrelevement={pointPrelevement}
          preferUsageName={preferUsageName}
        />
        <PointLocalisation
          pointPrelevement={pointPrelevement}
        />
        {(isDeclarantViewer || can('pp.volumes.read')) && (
          <SeriesOptionsLoader
            pointIds={[pointPrelevement.id]}
          />
        )}
        {can('exploitation.list') && (
          <ExploitationsList
            exploitations={exploitations}
            createHref={can('exploitation.create') ? getNewExploitationURL({idPoint: pointPrelevement.id}) : undefined}
            canCreate={can('exploitation.create')}
          />
        )}
        {historyPromise && (
          <Suspense fallback={null}>
            <PointHistory
              historyPromise={historyPromise}
              pointId={pointPrelevement.id}
            />
          </Suspense>
        )}
        {can('pp.delete') && !can('pp.update') && (
          <ResourceDeleteAction
            id={pointPrelevement.id}
            redirectHref='/points-prelevement'
            resource='point'
          />
        )}
      </div>
    </>
  )
}

export default Page
