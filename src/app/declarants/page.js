import {Button} from '@codegouvfr/react-dsfr/Button'
import {Box, Typography} from '@mui/material'

import DeclarantsList from '@/components/declarants/declarants-list.js'
import {RequireEditor} from '@/components/permissions/index.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getDeclarantsAction} from '@/server/actions/declarants.js'

export const metadata = {
  title: 'Déclarants'
}

export const dynamic = 'force-dynamic'

const Page = async () => {
  const result = await getDeclarantsAction()
  const declarants = result.data || []

  return (
    <>
      <StartDsfrOnHydration />

      <Box className='flex flex-col fr-container h-full w-full'>
        <div className='flex flex-col md:flex-row md:justify-between md:items-end gap-3'>
          <div>
            <Typography variant='h4' className='fr-pt-3w'>Déclarants</Typography>
            <p className='fr-text--sm fr-mb-0'>
              Retrouvez les préleveurs et les collecteurs. Les préleveurs peuvent être sans email ; les collecteurs doivent avoir un compte connecté.
            </p>
          </div>
          <RequireEditor>
            <Button
              priority='secondary'
              iconId='fr-icon-add-line'
              size='small'
              linkProps={{href: '/declarants/new'}}
              title='Ajouter un nouveau déclarant'
            >
              Ajouter un nouveau déclarant
            </Button>
          </RequireEditor>
        </div>
        <DeclarantsList declarants={declarants} />
      </Box>
    </>
  )
}

export default Page
