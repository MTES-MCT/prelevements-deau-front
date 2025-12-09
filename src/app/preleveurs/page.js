import {Button} from '@codegouvfr/react-dsfr/Button'
import {Box, Typography} from '@mui/material'
import {orderBy} from 'lodash-es'

import {getPreleveurs} from '@/app/api/points-prelevement.js'
import {RequireEditor} from '@/components/permissions/index.js'
import PreleveursList from '@/components/preleveurs/preleveurs-list.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'

export const dynamic = 'force-dynamic'

const Page = async () => {
  const preleveurs = await getPreleveurs()
  const orderedPreleveurs = orderBy(preleveurs, [p => Number.parseInt(p.id_preleveur, 10)])

  return (
    <>
      <StartDsfrOnHydration />

      <Box className='flex flex-col fr-container h-full w-full'>
        <div className='flex justify-between items-end'>
          <Typography variant='h4' className='fr-pt-3w'>Préleveurs</Typography>
          <RequireEditor>
            <Button
              priority='secondary'
              iconId='fr-icon-add-line'
              size='small'
              linkProps={{
                href: '/preleveurs/new'
              }}
              title='Ajouter un nouveau préleveur'
            >
              Ajouter un nouveau préleveur
            </Button>
          </RequireEditor>
        </div>
        <PreleveursList preleveurs={orderedPreleveurs} />
      </Box>
    </>
  )
}

export default Page
