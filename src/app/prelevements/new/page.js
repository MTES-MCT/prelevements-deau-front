import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import Link from 'next/link'

import {
  getBnpe,
  getBvBdcarthage,
  getMeContinentales,
  getMeso
} from '@/app/api/points-prelevement.js'
import PointCreationForm from '@/components/form/point-creation-form.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'

const Page = async () => {
  const bnpeList = await getBnpe()
  const mesoList = await getMeso()
  const meContinentalesBvList = await getMeContinentales()
  const bvBdCarthageList = await getBvBdcarthage()

  return (
    <>
      <StartDsfrOnHydration />

      <div className='p-5'>
        <ArrowBackIcon className='pr-1' />
        <Link href='/prelevements'>Retour</Link>
      </div>
      <PointCreationForm
        bnpeList={bnpeList}
        bvBdCarthageList={bvBdCarthageList}
        mesoList={mesoList}
        meContinentalesBvList={meContinentalesBvList}
      />
    </>
  )
}

export default Page
