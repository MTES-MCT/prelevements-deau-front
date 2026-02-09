import {Box, Typography} from '@mui/material'

import LabelWithIcon from '@/components/ui/LabelWithIcon/index.js'
import SectionCard from '@/components/ui/SectionCard/index.js'
import {formatFullAddress, getPersonnePhysiqueFullName} from '@/lib/dossier.js'

const DeclarantDetails = ({declarant}) => (
  <SectionCard
    title='Déclarant'
    icon='fr-icon-user-line'
  >
    <Typography
      color='primary'
      variant='h4'
    >
      <Typography
        color='primary'
        variant='h4'
      >
        {declarant.declarantType === 'NATURAL_PERSON'
          ? getPersonnePhysiqueFullName(declarant)
          : declarant.socialReason}
      </Typography>
    </Typography>

    <Box className='flex flex-col gap-1 my-2'>
      <LabelWithIcon iconId='ri-at-line'>
        {declarant.user?.email && (
          <a href={`mailto:${declarant.user.email}`}>{declarant.user.email}</a>
        )}
      </LabelWithIcon>
      <LabelWithIcon iconId='fr-icon-phone-line'>
        {declarant.phoneNumber && (
          <a href={`tel:${declarant.phoneNumber}`}>{declarant.phoneNumber}</a>
        )}
      </LabelWithIcon>
      <LabelWithIcon iconId='fr-icon-home-4-line'>
        {formatFullAddress(declarant)}
      </LabelWithIcon>
    </Box>
  </SectionCard>
)

export default DeclarantDetails
