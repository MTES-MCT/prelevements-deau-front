import {Box} from '@mui/system'
import {notFound} from 'next/navigation'

import {getExploitationsByPointId, getPointPrelevement} from '@/app/api/points-prelevement.js'
import ExploitationsSection from '@/components/exploitations/exploitations-section.js'
import PointIdentification from '@/components/prelevements/point-identification.js'
import PointLocalisation from '@/components/prelevements/point-localisation.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'

const Page = async ({params}) => {
  const {id} = (await params)

  const pointPrelevement = await getPointPrelevement(id)
  if (!pointPrelevement) {
    notFound()
  }

  const exploitations = await getExploitationsByPointId(id)

  return (
    <>
      <StartDsfrOnHydration />

      <Box className='mb-5'>
        <PointIdentification
          pointPrelevement={pointPrelevement}
          lienBss={pointPrelevement.bss?.lien || ''}
          lienBnpe={pointPrelevement.bnpe?.lien || ''}
        />
        <PointLocalisation
          pointPrelevement={pointPrelevement}
        />
        <ExploitationsSection
          isPreleveurDisplayed
          exploitations={exploitations}
        />
      </Box>
    </>
  )
}

export default Page
