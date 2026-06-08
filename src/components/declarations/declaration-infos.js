import {Notice} from '@codegouvfr/react-dsfr/Notice'
import {Tag} from '@codegouvfr/react-dsfr/Tag'
import {Box} from '@mui/material'
import Link from 'next/link'

import PrelevementTypeBadge from '@/components/declarations/prelevement-type-badge.js'
import TypeSaisieBadge from '@/components/declarations/type-saisie-badge.js'
import LabelValue from '@/components/ui/LabelValue/index.js'
import {getDeclarantTitleFromDeclarant} from '@/lib/declarants.js'
import {getDeclarationTypeLabel} from '@/lib/declaration-types.js'
import {getDeclarantURL} from '@/lib/urls.js'

const fileLabel = (file, declarationType) => {
  if (file.filename) {
    return file.filename
  }

  return getDeclarationTypeLabel(file.type, declarationType)
}

const getDeclarantId = declarant => declarant?.userId || declarant?.id || declarant?.user?.id

const DeclarantLink = ({declarant}) => {
  if (!declarant) {
    return 'Non renseigné'
  }

  const id = getDeclarantId(declarant)
  const label = getDeclarantTitleFromDeclarant(declarant)

  if (!id) {
    return label
  }

  return <Link href={getDeclarantURL({userId: id})}>{label}</Link>
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
  numeroArreteAot,
  type,
  declarationType,
  dataSourceType,
  comment,
  files = [],
  declarant,
  createdByDeclarant
}) => {
  const declarantId = getDeclarantId(declarant)
  const createdByDeclarantId = getDeclarantId(createdByDeclarant)
  const showCreatedBy = createdByDeclarant && createdByDeclarantId !== declarantId

  const displayedAotDecreeNumber = aotDecreeNumber || numeroArreteAot

  return (
    <Box className='flex flex-col gap-2 my-4'>
      { displayedAotDecreeNumber && (
        <LabelValue label='Numéro AOT'>
          <Tag>{displayedAotDecreeNumber}</Tag>
        </LabelValue>
      )}
      <LabelValue label='Type de déclaration'>
        <PrelevementTypeBadge value={type} declarationType={declarationType} />
      </LabelValue>
      <LabelValue label='Type de saisie'>
        <TypeSaisieBadge value={dataSourceType} />
      </LabelValue>
      <LabelValue label='Préleveur concerné'>
        <DeclarantLink declarant={declarant} />
      </LabelValue>
      {showCreatedBy && (
        <LabelValue label='Déposée par'>
          <DeclarantLink declarant={createdByDeclarant} />
        </LabelValue>
      )}
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
}

export default DeclarationInfos
