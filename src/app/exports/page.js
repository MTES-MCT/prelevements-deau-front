import {Box, Typography} from '@mui/material'

import ExportForm from '@/components/export/export-form.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getPointsPrelevementAction, getPreleveursAction} from '@/server/actions/index.js'

export const dynamic = 'force-dynamic'

const Page = async () => {
  const [pointsResult, preleveursResult] = await Promise.all([
    getPointsPrelevementAction(),
    getPreleveursAction()
  ])

  const points = pointsResult?.data || []
  const preleveurs = preleveursResult?.data || []

  return (
    <>
      <StartDsfrOnHydration />

      <Box className='flex flex-col fr-container h-full w-full'>
        <Typography variant='h4' className='fr-pt-3w'>Exports</Typography>

        <ExportForm
          points={points}
          preleveurs={preleveurs}
        />
      </Box>
    </>
  )
}

export default Page
