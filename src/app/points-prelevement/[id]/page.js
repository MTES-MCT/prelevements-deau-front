import {notFound} from 'next/navigation'

import ExploitationsList from '@/components/exploitations/exploitations-list.js'
import PointIdentification from '@/components/points-prelevement/point-identification.js'
import PointLocalisation from '@/components/points-prelevement/point-localisation.js'
import SeriesExplorer from '@/components/points-prelevement/series-explorer.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getNewExploitationURL} from '@/lib/urls.js'
import {getPointPrelevementAction, getExploitationsByPointIdAction} from '@/server/actions/points-prelevement.js'
import {getAggregatedSeriesOptionsAction} from '@/server/actions/series.js'

const Page = async ({params}) => {
  const {id} = (await params)

  const pointResult = await getPointPrelevementAction(id)
  if (!pointResult.success || !pointResult.data) {
    notFound()
  }

  const pointPrelevement = pointResult.data

  const seriesResult = await getAggregatedSeriesOptionsAction({pointIds: [pointPrelevement.id]})
  const seriesOptions = seriesResult.data
  const exploitationsResult = await getExploitationsByPointIdAction(id)
  const exploitations = exploitationsResult.data || []

  return (
    <>
      <StartDsfrOnHydration />

      <div className='flex flex-col gap-8 mb-16'>
        <PointIdentification
          pointPrelevement={pointPrelevement}
          lienBss={pointPrelevement.bss?.lien || ''}
          lienBnpe={pointPrelevement.bnpe?.lien || ''}
        />
        <PointLocalisation
          pointPrelevement={pointPrelevement}
        />
        <SeriesExplorer
          pointIds={[pointPrelevement.id]}
          seriesOptions={seriesOptions}
        />
        <ExploitationsList
          exploitations={exploitations}
          preleveurs={pointPrelevement.preleveurs}
          createHref={getNewExploitationURL({idPoint: pointPrelevement.id})}
        />
      </div>
    </>
  )
}

export default Page
