import {Box, Typography} from '@mui/material'

import LabelWithIcon from '@/components/ui/LabelWithIcon/index.js'
import SectionCard from '@/components/ui/SectionCard/index.js'
import {getPersonnePhysiqueFullName} from '@/lib/dossier.js'
import {getPreleveurURL} from '@/lib/urls.js'

const PreleveurDetails = ({preleveur}) => (
  <SectionCard
    title='Préleveur'
    icon='fr-icon-user-line'
    buttonProps={{
      priority: 'secondary',
      linkProps: {
        href: getPreleveurURL(preleveur),
        target: '_blank'
      },
      children: 'Consulter la fiche'
    }}
  >

    <Typography
      color='primary'
      variant='h4'
    >
      {preleveur.__typename === 'PersonnePhysique'
        ? getPersonnePhysiqueFullName(preleveur)
        : preleveur.raison_sociale}
    </Typography>

    <Box className='flex flex-col gap-1 my-2'>
      <LabelWithIcon icon='ri-at-line'>
        {preleveur.email && (
          <a href={`mailto:${preleveur.email}`}>{preleveur.email}</a>
        )}
      </LabelWithIcon>
      <LabelWithIcon icon='fr-icon-phone-line'>
        {preleveur.telephone && (
          <a href={`tel:${preleveur.telephone}`}>{preleveur.telephone}</a>
        )}
      </LabelWithIcon>
      <LabelWithIcon icon='fr-icon-home-4-line'>
        {preleveur.adresse}
      </LabelWithIcon>
    </Box>
  </SectionCard>
)

export default PreleveurDetails
