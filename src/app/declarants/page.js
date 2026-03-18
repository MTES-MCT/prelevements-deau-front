import {Button} from '@codegouvfr/react-dsfr/Button'
import {Box, Typography} from '@mui/material'

import DeclarantsList from '@/components/declarants/declarants-list.js'
import {RequireEditor} from '@/components/permissions/index.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getDeclarantsAction} from '@/server/actions/declarants.js'

export const dynamic = 'force-dynamic'

const Page = async () => {
  const result = await getDeclarantsAction()
  const declarants = result.data || []

  return (
    <>
      <StartDsfrOnHydration />

      <Box className='flex flex-col fr-container h-full w-full'>
        <div className='flex justify-between items-end'>
          <Typography variant='h4' className='fr-pt-3w'>Déclarants</Typography>
          <RequireEditor>
            <Button
              priority='secondary'
              iconId='fr-icon-add-line'
              size='small'
              linkProps={{
                href: '/declarants/new'
              }}
              title='Ajouter un nouveau préleveur'
            >
              Ajouter un nouveau préleveur
            </Button>
          </RequireEditor>
        </div>
        <DeclarantsList declarants={declarants} />
      </Box>
    </>
  )
}

export default Page
