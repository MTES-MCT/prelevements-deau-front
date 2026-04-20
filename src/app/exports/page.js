import {Box, Typography} from '@mui/material'

import ExportForm from '@/components/export/export-form.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getPointsPrelevementAction, getDeclarantsAction} from '@/server/actions/index.js'

export const dynamic = 'force-dynamic'

const Page = async () => {
  const [pointsResult, declarantsResults] = await Promise.all([
    getPointsPrelevementAction(),
    getDeclarantsAction()
  ])

  const points = pointsResult?.data || []
  const declarants = declarantsResults?.data || []

  return (
    <>
      <StartDsfrOnHydration />

      <Box className='flex flex-col fr-container h-full w-full'>
        <Typography variant='h4' className='fr-pt-3w'>Exports</Typography>

        <ExportForm
          points={points}
          declarants={declarants}
        />
      </Box>
    </>
  )
}

export default Page
