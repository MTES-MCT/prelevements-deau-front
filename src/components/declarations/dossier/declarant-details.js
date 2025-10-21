import {Tag} from '@codegouvfr/react-dsfr/Tag'
import {Box, Typography} from '@mui/material'

import LabelWithIcon from '@/components/ui/LabelWithIcon/index.js'
import SectionCard from '@/components/ui/SectionCard/index.js'
import {getPersonnePhysiqueFullName} from '@/lib/dossier.js'

const DeclarantDetails = ({declarant, isMandataire = false}) => (
  <SectionCard
    title='Déclarant'
    icon='fr-icon-user-line'
  >
    <Typography
      color='primary'
      variant='h4'
    >
      <div className='flex gap-2 items-center'>
        {declarant.__typename === 'PersonnePhysique'
          ? getPersonnePhysiqueFullName(declarant)
          : declarant.raisonSociale}
        {isMandataire && (
          <Tag>
            Mandataire
          </Tag>
        )}
      </div>
    </Typography>

    <Box className='flex flex-col gap-1 my-2'>
      <LabelWithIcon iconId='fr-icon-user-fill'>
        {declarant.type ? (
          <Tag className='inline-block lowercase first-letter:uppercase'>
            {declarant.type.split('-').join(' ')}
          </Tag>
        ) : 'Non renseigné'}
      </LabelWithIcon>
      <LabelWithIcon iconId='ri-at-line'>
        {declarant.email && (
          <a href={`mailto:${declarant.email}`}>{declarant.email}</a>
        )}
      </LabelWithIcon>
      <LabelWithIcon iconId='fr-icon-phone-line'>
        {declarant.telephone && (
          <a href={`tel:${declarant.telephone}`}>{declarant.telephone}</a>
        )}
      </LabelWithIcon>
      <LabelWithIcon iconId='fr-icon-home-4-line'>
        {declarant.adresse}
      </LabelWithIcon>
    </Box>
  </SectionCard>
)

export default DeclarantDetails
