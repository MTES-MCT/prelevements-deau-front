import {notFound} from 'next/navigation'

import {getExploitationsByPointId, getPointPrelevement} from '@/app/api/points-prelevement.js'
import {getAggregatedSeriesOptions} from '@/app/api/series.js'
import ExploitationsList from '@/components/exploitations/exploitations-list.js'
import PointIdentification from '@/components/points-prelevement/point-identification.js'
import PointLocalisation from '@/components/points-prelevement/point-localisation.js'
import SeriesExplorer from '@/components/points-prelevement/series-explorer.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'

const Page = async ({params}) => {
  const {id} = (await params)

  const pointPrelevement = await getPointPrelevement(id)
  if (!pointPrelevement) {
    notFound()
  }

  const seriesOptions = await getAggregatedSeriesOptions({pointIds: [pointPrelevement._id]})
  const exploitations = await getExploitationsByPointId(id)

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
        <ExploitationsList exploitations={exploitations} preleveurs={pointPrelevement.preleveurs} />
        <SeriesExplorer
          pointIds={[pointPrelevement.id_point]}
          seriesOptions={seriesOptions}
        />
      </div>
    </>
  )
}

export default Page
