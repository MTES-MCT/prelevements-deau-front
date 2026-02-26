import {Notice} from '@codegouvfr/react-dsfr/Notice'
import {Tag} from '@codegouvfr/react-dsfr/Tag'
import {Box} from '@mui/material'
import Link from 'next/link.d.ts'

import PrelevementTypeBadge from '@/components/declarations/prelevement-type-badge.js'
import TypeSaisieBadge from '@/components/declarations/type-saisie-badge.js'
import LabelValue from '@/components/ui/LabelValue/index.js'

const DossierInfos = ({aotDecreeNumber, type, dataSourceType, comment, files}) => (
  <Box className='flex flex-col gap-2 my-4'>
    <LabelValue label='Numéro AOT'>
      {aotDecreeNumber ? (
        <Tag>{aotDecreeNumber}</Tag>
      ) : (
        <i>Non renseigné</i>
      )}
    </LabelValue>
    <LabelValue label='Type de déclaration'>
      <PrelevementTypeBadge value={type} />
    </LabelValue>
    <LabelValue label='Type de saisie'>
      <TypeSaisieBadge value={dataSourceType} />
    </LabelValue>
    <LabelValue label='Fichiers'>
      {files && files.length > 0 ? (
        files.map(file => (
          <Link
            key={file.id}
            download
            href={file.url}
          >
            {file.type}
          </Link>
        ))
      ) : 'Aucun fichier associé'}
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
