import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import {orderBy} from 'lodash-es'
import Link from 'next/link'

import PointCreationForm from '@/components/form/point-creation-form.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getPointsPrelevementURL} from '@/lib/urls.js'
import {
  getBnpeAction,
  getBssAction,
  getBvBdcarthageAction,
  getMeContinentalesAction,
  getMesoAction
} from '@/server/actions/points-prelevement.js'

export const dynamic = 'force-dynamic'

const Page = async () => {
  const [bnpeResult, bssResult, mesoResult, meContinentalesResult, bvBdcarthageResult] = await Promise.all([
    getBnpeAction(),
    getBssAction(),
    getMesoAction(),
    getMeContinentalesAction(),
    getBvBdcarthageAction()
  ])
  const bnpeList = bnpeResult.data || []
  const bssList = bssResult.data || []
  const mesoList = mesoResult.data || []
  const meContinentalesBvList = meContinentalesResult.data || []
  const bvBdCarthageList = bvBdcarthageResult.data || []
  const orderedBnpeList = orderBy(bnpeList, 'nom_ouvrage')
  const orderedMesoList = orderBy(mesoList, ['nom_provis'])
  const orderedMeContinentaleBvList = orderBy(meContinentalesBvList, 'nom')

  return (
    <>
      <StartDsfrOnHydration />

      <div className='p-5'>
        <ArrowBackIcon className='pr-1' />
        <Link href={getPointsPrelevementURL()}>Retour</Link>
      </div>
      <PointCreationForm
        bnpeList={orderedBnpeList}
        bssList={bssList}
        bvBdCarthageList={bvBdCarthageList}
        mesoList={orderedMesoList}
        meContinentalesBvList={orderedMeContinentaleBvList}
      />
    </>
  )
}

export default Page
