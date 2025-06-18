import {Button} from '@codegouvfr/react-dsfr/Button'
import {Typography} from '@mui/material'
import {Box} from '@mui/system'

import DossierStateBadge from '@/components/declarations/dossier-state-badge.js'

const DossierHeader = ({numero, status, dateDepot, moisDeclaration, dsUrl}) => (
  <Box className='flex flex-col gap-2'>
    <Box className='flex justify-between gap-4 flex-wrap'>
      <Box className='flex gap-4 items-center flex-wrap'>
        <Typography variant='h3' className='pb-0'>Dossier n°{numero}</Typography>
        <DossierStateBadge value={status} />
      </Box>

      <Button
        priority='secondary'
        linkProps={{
          href: dsUrl,
          target: '_blank'
        }}
      >
        Voir sur Démarches Simplifiees
      </Button>
    </Box>

    <Box className='flex flex-wrap gap-4'>
      <Box className='flex flex-wrap gap-2'>
        <Box component='span' className='ri-inbox-2-line' />
        <Typography variant='body1'>
          Date de dépôt : {new Intl.DateTimeFormat('fr-FR', {dateStyle: 'short'}).format(new Date(dateDepot))}
        </Typography>
      </Box>

      <Box className='flex flex-wrap gap-2'>
        <Box component='span' className='fr-icon-calendar-event-fill' />
        <Typography variant='body1'>
          Mois déclaré : {moisDeclaration ? new Intl.DateTimeFormat('fr-FR', {month: 'long', year: 'numeric'}).format(new Date(moisDeclaration)) : 'Non renseigné'}
        </Typography>
      </Box>
    </Box>
  </Box>
)

export default DossierHeader
