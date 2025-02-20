import {Box, Typography} from '@mui/material'

import DossierStateBadge from '@/components/demarches-simplifiees/dossier-state-badge.js'

const DossierInfos = ({dateDepot, status}) => (
  <Box className='flex justify-between mt-2'>
    <Box className='flex flex-wrap gap-2'>
      <Typography variant='body1' color='text.secondary'>
        <strong>Date de dépôt:</strong>
      </Typography>
      <Typography variant='body1'>
        {new Intl.DateTimeFormat('fr-FR', {dateStyle: 'short'}).format(new Date(dateDepot))}
      </Typography>
    </Box>

    <Box className='flex gap-2 mb-2'>
      <DossierStateBadge value={status} />
    </Box>
  </Box>
)

export default DossierInfos
