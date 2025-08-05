import {Button} from '@codegouvfr/react-dsfr/Button'
import {Typography} from '@mui/material'
import {orderBy} from 'lodash-es'
import {notFound} from 'next/navigation'

import {
  getBnpe,
  getBss,
  getBvBdcarthage,
  getMeContinentales,
  getMeso,
  getPointPrelevement
} from '@/app/api/points-prelevement.js'
import PointEditionForm from '@/components/form/point-edition-form.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'

const Page = async ({params}) => {
  const {id} = await params
  const pointPrelevement = await getPointPrelevement(id)
  if (!pointPrelevement) {
    notFound()
  }

  const bnpeList = await getBnpe()
  const bssList = await getBss()
  const mesoList = await getMeso()
  const meContinentalesBvList = await getMeContinentales()
  const bvBdCarthageList = await getBvBdcarthage()
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
            href: `/prelevements/${id}`
          }}
        >
          Annuler
        </Button>
      </div>

      <PointEditionForm
        pointPrelevement={pointPrelevement}
        bnpeList={bnpeList}
        bssList={bssList}
        bvBdCarthageList={bvBdCarthageList}
        mesoList={orderedMesoList}
        meContinentalesBvList={orderedMeContinentaleBvList}
      />
    </>
  )
}

export default Page
