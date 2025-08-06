import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import {orderBy} from 'lodash-es'
import Link from 'next/link'

import {
  getBnpe,
  getBss,
  getBvBdcarthage,
  getMeContinentales,
  getMeso
} from '@/app/api/points-prelevement.js'
import PointCreationForm from '@/components/form/point-creation-form.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'

export const dynamic = 'force-dynamic'

const Page = async () => {
  const bnpeList = await getBnpe()
  const bssList = await getBss()
  const mesoList = await getMeso()
  const meContinentalesBvList = await getMeContinentales()
  const bvBdCarthageList = await getBvBdcarthage()
  const orderedBnpeList = orderBy(bnpeList, 'nom_ouvrage')
  const orderedMesoList = orderBy(mesoList, ['nom_provis'])
  const orderedMeContinentaleBvList = orderBy(meContinentalesBvList, 'nom')

  return (
    <>
      <StartDsfrOnHydration />

      <div className='p-5'>
        <ArrowBackIcon className='pr-1' />
        <Link href='/prelevements'>Retour</Link>
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
