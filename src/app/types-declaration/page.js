import {CallOut} from '@codegouvfr/react-dsfr/CallOut'
import {Box, Typography} from '@mui/material'

import DeclarationTypesAdmin from '@/components/declaration-types/declaration-types-admin.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {listDeclarationTypesAction} from '@/server/actions/declaration-types.js'

export const dynamic = 'force-dynamic'

const Page = async () => {
  const result = await listDeclarationTypesAction()
  const payload = result.success ? result.data : {data: [], meta: {}}

  return (
    <>
      <StartDsfrOnHydration />

      <Box className='fr-container h-full w-full flex flex-col gap-5 mb-8'>
        <Box className='fr-mt-4w'>
          <Typography variant='h4'>Types de déclaration</Typography>
          <p className='fr-text--sm'>
            Gérez les types de déclaration disponibles sur la plateforme. Un type actif peut ensuite être autorisé
            sur un déclarant par un administrateur ou un agent ayant accès à sa fiche.
          </p>
        </Box>

        <CallOut
          iconId='ri-information-line'
          title='À quoi sert cette configuration ?'
        >
          Les déclarants ne peuvent déposer que les types qui sont à la fois actifs sur la plateforme et autorisés
          sur leur fiche déclarant. Désactiver un type bloque les nouveaux dépôts sans supprimer l’historique.
        </CallOut>

        <DeclarationTypesAdmin initialPayload={payload} />
      </Box>
    </>
  )
}

export default Page
