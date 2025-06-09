import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import Link from 'next/link'

import {getBnpe, getMeContinentales, getMeso} from '@/app/api/points-prelevement.js'
import PointCreationForm from '@/components/form/point-creation-form.js'

const Page = async () => {
  const bnpeList = await getBnpe()
  const mesoList = await getMeso()
  const meContinentalesBvList = await getMeContinentales()

  return (
    <div>
      <div className='pt-5 pl-5'>
        <ArrowBackIcon className='pr-1' />
        <Link href='/prelevements'>Retour</Link>
      </div>
      <PointCreationForm
        bnpeList={bnpeList}
        mesoList={mesoList}
        meContinentalesBvList={meContinentalesBvList}
      />
    </div>
  )
}

export default Page
