import {Button} from '@codegouvfr/react-dsfr/Button'
import {Typography} from '@mui/material'
import {orderBy} from 'lodash-es'
import {notFound} from 'next/navigation'

import PointEditionForm from '@/components/form/point-edition-form.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {
  getBnpeAction,
  getBssAction,
  getBvBdcarthageAction,
  getMeContinentalesAction,
  getMesoAction,
  getPointPrelevementAction
} from '@/server/actions/points-prelevement.js'

const Page = async ({params}) => {
  const {id} = await params
  const result = await getPointPrelevementAction(id)
  if (!result.success || !result.data) {
    notFound()
  }

  const pointPrelevement = result.data

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

      <div className='flex justify-between gap-4 items-center mb-4'>
        <Typography variant='h3'>
          Édition du point de prélèvement {pointPrelevement.nom}
        </Typography>

        <Button
          priority='secondary'
          iconId='fr-icon-close-line'
          linkProps={{
            href: `/points-prelevement/${id}`
          }}
        >
          Annuler
        </Button>
      </div>

      <PointEditionForm
        pointPrelevement={pointPrelevement}
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
