import {Notice} from '@codegouvfr/react-dsfr/Notice'
import {Tag} from '@codegouvfr/react-dsfr/Tag'
import {Box} from '@mui/material'
import Link from 'next/link'

import PrelevementTypeBadge from '@/components/declarations/prelevement-type-badge.js'
import TypeSaisieBadge from '@/components/declarations/type-saisie-badge.js'
import LabelValue from '@/components/ui/LabelValue/index.js'
import {getDeclarationTypeLabel} from '@/lib/declaration-types.js'

const fileLabel = (file, declarationType) => {
  if (file.filename) {
    return file.filename
  }

  return getDeclarationTypeLabel(file.type, declarationType)
}

const FileList = ({files, declarationType}) => {
  if (!files || files.length === 0) {
    return 'Aucun fichier associé'
  }

  return (
    <ul className='fr-raw-list'>
      {files.map(file => (
        <li key={file.id}>
          {file.url ? (
            <Link
              download
              href={file.url}
            >
              {fileLabel(file, declarationType)}
            </Link>
          ) : fileLabel(file, declarationType)}

          <span className='fr-hint-text fr-mb-0'>
            {getDeclarationTypeLabel(file.type, declarationType)}
          </span>
        </li>
      ))}
    </ul>
  )
}

const DeclarationInfos = ({
  aotDecreeNumber,
  type,
  declarationType,
  dataSourceType,
  comment,
  files = []
}) => (
  <Box className='flex flex-col gap-2 my-4'>
    { aotDecreeNumber && (
      <LabelValue label='Numéro AOT'>
        <Tag>{aotDecreeNumber}</Tag>
      </LabelValue>
    )}
    <LabelValue label='Type de déclaration'>
      <PrelevementTypeBadge value={type} declarationType={declarationType} />
    </LabelValue>
    <LabelValue label='Type de saisie'>
      <TypeSaisieBadge value={dataSourceType} />
    </LabelValue>
    <LabelValue label='Fichiers'>
      <FileList files={files} declarationType={declarationType} />
    </LabelValue>

    {comment && (
      <Notice
        description={comment}
        severity='info'
        title='Commentaire du déclarant'
      />
    )}
  </Box>
)

export default DeclarationInfos
