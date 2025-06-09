import {Button} from '@codegouvfr/react-dsfr/Button'
import {Typography} from '@mui/material'

import {getDossier} from '@/app/api/dossiers.js'
import {getPointPrelevement} from '@/app/api/points-prelevement.js'
import DossierDetails from '@/components/declarations/dossier-details.js'
import BackButton from '@/components/ui/back-button.js'
import {getDossierDSURL, getDossiersURL} from '@/lib/urls.js'

const DossierPage = async ({params}) => {
  const {dossierId} = await params

  const dossier = await getDossier(dossierId)

  let pointPrelevement
  if (dossier.pointPrelevement) {
    pointPrelevement = await getPointPrelevement(dossier.pointPrelevement)
  }

  return (
    <div className='fr-container mt-4'>
      <BackButton
        label='Retour à la liste des dossiers'
        href={getDossiersURL()}
      />

      <div className='flex items-end justify-between flex-wrap'>
        <Typography className='text-center pt-10' variant='h3'>Dossier n°{dossier.numero}</Typography>
        <Button
          linkProps={{
            href: getDossierDSURL(dossier),
            target: '_blank'
          }}
        >
          Voir sur Démarches Simplifiees
        </Button>
      </div>

      <div className='my-4'>
        <DossierDetails
          dossier={dossier}
          pointPrelevement={pointPrelevement}
        />
      </div>
    </div>
  )
}

export default DossierPage

