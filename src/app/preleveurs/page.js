import {Box, Typography} from '@mui/material'

import DeclarantsList from '@/components/declarants/declarants-list.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getCollecteurPreleveursAction} from '@/server/actions/declarants.js'

export const dynamic = 'force-dynamic'

const Page = async () => {
  const result = await getCollecteurPreleveursAction()
  const preleveurs = result.data || []

  return (
    <>
      <StartDsfrOnHydration />

      <Box className='flex flex-col fr-container h-full w-full'>
        <div className='flex justify-between items-end'>
          <Typography variant='h4' className='fr-pt-3w'>Préleveurs</Typography>
        </div>
        <p className='fr-text--sm fr-mt-2w'>
          Ces préleveurs sont accessibles car votre compte collecteur est rattaché à leurs exploitations.
        </p>
        <DeclarantsList declarants={preleveurs} basePath='/preleveurs' />
      </Box>
    </>
  )
}

export default Page
