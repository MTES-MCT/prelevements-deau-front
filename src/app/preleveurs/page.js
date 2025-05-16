import {Box, Typography} from '@mui/material'
import {orderBy} from 'lodash-es'

import {getPreleveurs} from '@/app/api/points-prelevement.js'
import PreleveursList from '@/components/preleveurs/preleveurs-list.js'

const Page = async () => {
  const preleveurs = await getPreleveurs()
  const orderedPreleveurs = orderBy(preleveurs, [p => Number.parseInt(p.id_preleveur, 10)])

  return (
    <Box className='flex flex-col fr-container h-full w-full'>
      <Typography variant='h4' className='fr-pt-3w'>Liste des préleveurs :</Typography>
      <PreleveursList preleveurs={orderedPreleveurs} />
    </Box>
  )
}

export default Page
