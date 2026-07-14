import {notFound} from 'next/navigation'

import {buildPageTitle} from '@/app/metadata-utils.js'
import ExploitationsList from '@/components/exploitations/exploitations-list.js'
import PointIdentification from '@/components/points-prelevement/point-identification.js'
import PointLocalisation from '@/components/points-prelevement/point-localisation.js'
import SeriesExplorer from '@/components/points-prelevement/series-explorer.js'
import ResourceDeleteAction from '@/components/ui/resource-delete-action.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getNewExploitationURL} from '@/lib/urls.js'
import {getPointPrelevementAction, getExploitationsByPointIdAction} from '@/server/actions/points-prelevement.js'
import {getAggregatedSeriesOptionsAction} from '@/server/actions/series.js'
import {getCurrentUser} from '@/server/actions/user.js'
import {getPointPrelevementLabel} from '@/utils/point-prelevement.js'

export async function generateMetadata({params}) {
  const {id} = await params
  const [result, userResult] = await Promise.all([
    getPointPrelevementAction(id),
    getCurrentUser()
  ])
  const preferUsageName = userResult?.data?.role === 'DECLARANT'

  return buildPageTitle([
    result.success && result.data
      ? getPointPrelevementLabel({pointPrelevement: result.data, preferUsageName})
      : null
  ], 'Point de prélèvement')
}

const Page = async ({params}) => {
  const userResult = await getCurrentUser()
  const role = userResult?.data?.role ?? null
  const preferUsageName = role === 'DECLARANT'

  const {id} = (await params)

  const pointResult = await getPointPrelevementAction(id)
  if (!pointResult.success || !pointResult.data) {
    notFound()
  }

  const pointPrelevement = pointResult.data
  const permissions = new Set(pointPrelevement.right?.permissions || [])
  const can = permission => role === 'ADMIN'
    || (role === 'INSTRUCTOR' && permissions.has(permission))
  const isDeclarantViewer = role === 'DECLARANT'

  const seriesResult = isDeclarantViewer || can('pp.volumes.read')
    ? await getAggregatedSeriesOptionsAction({pointIds: [pointPrelevement.id]})
    : {data: null}
  const seriesOptions = seriesResult.data
  const exploitationsResult = can('exploitation.list')
    ? await getExploitationsByPointIdAction(id)
    : {data: []}
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
          <SeriesExplorer
            pointIds={[pointPrelevement.id]}
            seriesOptions={seriesOptions}
          />
        )}
        {can('exploitation.list') && (
          <ExploitationsList
            exploitations={exploitations}
            createHref={can('exploitation.create') ? getNewExploitationURL({idPoint: pointPrelevement.id}) : undefined}
            canCreate={can('exploitation.create')}
          />
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
