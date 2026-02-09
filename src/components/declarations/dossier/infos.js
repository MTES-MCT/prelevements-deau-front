import {Notice} from '@codegouvfr/react-dsfr/Notice'
import {Tag} from '@codegouvfr/react-dsfr/Tag'
import {Box} from '@mui/material'

import PrelevementTypeBadge from '@/components/declarations/prelevement-type-badge.js'
import TypeSaisieBadge from '@/components/declarations/type-saisie-badge.js'
import LabelValue from '@/components/ui/LabelValue/index.js'

const DossierInfos = ({aotDecreeNumber, waterWithdrawalType, dataSourceType, comment}) => (
  <Box className='flex flex-col gap-2 my-4'>
    <LabelValue label='Numéro AOT'>
      {aotDecreeNumber ? (
        <Tag>{aotDecreeNumber}</Tag>
      ) : (
        <i>Non renseigné</i>
      )}
    </LabelValue>
    <LabelValue label='Type de prélèvement'>
      <PrelevementTypeBadge value={waterWithdrawalType} />
    </LabelValue>
    <LabelValue label='Type de saisie'>
      <TypeSaisieBadge value={dataSourceType} />
    </LabelValue>

    {comment && (
      <Notice
        description={comment}
        severity='info'
      />
    )}
  </Box>
)

export default DossierInfos
