import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Box, Typography} from '@mui/material'

import LabelWithIcon from '@/components/ui/LabelWithIcon/index.js'
import SectionCard from '@/components/ui/section-card.js'
import {getPersonnePhysiqueFullName} from '@/lib/dossier.js'
import {getNewPreleveurURL} from '@/lib/urls.js'

const DemandeurDetails = ({demandeur}) => (
  <SectionCard
    title='Demandeur'
    icon='fr-icon-user-line'
    buttonProps={{
      priority: 'secondary',
      linkProps: {
        href: getNewPreleveurURL(demandeur),
        target: '_blank'
      },
      children: 'Ajouter le préleveur'
    }}
  >
    <Typography
      color='primary'
      variant='h4'
    >
      {demandeur.__typename === 'PersonnePhysique'
        ? getPersonnePhysiqueFullName(demandeur)
        : demandeur.raisonSociale}
    </Typography>

    <Box className='flex flex-col gap-1 my-2'>
      <LabelWithIcon icon='ri-at-line'>
        {demandeur.email && (
          <a href={`mailto:${demandeur.email}`}>{demandeur.email}</a>
        )}
      </LabelWithIcon>
      <LabelWithIcon icon='fr-icon-phone-line'>
        {demandeur.telephone && (
          <a href={`tel:${demandeur.telephone}`}>{demandeur.telephone}</a>
        )}
      </LabelWithIcon>
      <LabelWithIcon icon='fr-icon-home-4-line'>
        {demandeur.adresse}
      </LabelWithIcon>
    </Box>

    <Alert severity='warning' description='Ce demandeur n’a pas pu être identifié comme préleveur.' />
  </SectionCard>
)

export default DemandeurDetails
