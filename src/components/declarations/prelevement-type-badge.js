import {Badge} from '@codegouvfr/react-dsfr/Badge'

import {getDeclarationTypeLabel} from '@/lib/declaration-types.js'

const badgeMetadata = {
  'aep-zre': {severity: 'new'},
  'icpe-hors-zre': {severity: 'info'},
  'camion-citerne': {severity: 'warning'},
  'quick-declaration': {severity: 'info'},
  'template-file': {severity: 'info'},
  'extract-aquasys': {severity: 'info'},
  gidaf: {severity: 'info'},
  unknown: {severity: 'success'}
}

const PrelevementTypeBadge = ({value, declarationType}) => {
  const metadata = badgeMetadata[value] ?? badgeMetadata.unknown

  return (
    <Badge noIcon severity={metadata.severity}>
      {getDeclarationTypeLabel(value, declarationType)}
    </Badge>
  )
}

export default PrelevementTypeBadge
