import {notFound} from 'next/navigation'

import {getExploitationsByPointId, getPointPrelevement} from '@/app/api/points-prelevement.js'
import PointExploitations from '@/components/prelevements/point-exploitations.js'
import PointIdentification from '@/components/prelevements/point-identification.js'
import PointLocalisation from '@/components/prelevements/point-localisation.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {parseHttpError} from '@/lib/http-error.js'

const Page = async ({params}) => {
  const {id} = (await params)

  let pointPrelevement
  try {
    pointPrelevement = await getPointPrelevement(id)
  } catch (error) {
    const {code} = parseHttpError(error)
    if (code === 404) {
      notFound()
    }
  }

  const exploitations = await getExploitationsByPointId(id)

  return (
    <>
      <StartDsfrOnHydration />

      <PointIdentification
        pointPrelevement={pointPrelevement}
        lienBss={pointPrelevement.bss?.lien || ''}
        lienBnpe={pointPrelevement.bnpe?.lien || ''}
      />
      <PointLocalisation
        pointPrelevement={pointPrelevement}
      />
      <PointExploitations
        pointPrelevement={pointPrelevement}
        exploitations={exploitations}
      />
    </>
  )
}

export default Page
