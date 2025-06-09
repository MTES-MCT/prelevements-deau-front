import {Button} from '@codegouvfr/react-dsfr/Button'
import {Typography} from '@mui/material'

import {getDossier} from '@/app/api/dossiers.js'
import DossierModal from '@/components/declarations/dossier-modal.js'
import {getDossierDSURL, getDossiersURL} from '@/lib/urls.js'

const DossierPage = async ({params}) => {
  const {dossierId} = await params
  const dossier = await getDossier(dossierId)

  return (
    <div className='fr-container mt-4'>
      <Button
        iconId='fr-icon-arrow-go-back-fill'
        linkProps={{
          href: getDossiersURL()
        }}
      >
        Retour à la liste des dossiers
      </Button>

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
        <DossierModal selectedDossier={dossier} />
      </div>
    </div>
  )
}

export default DossierPage

