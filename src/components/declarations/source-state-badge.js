import {Badge} from '@codegouvfr/react-dsfr/Badge'

import {sourceStateLabels} from '@/lib/declaration.js'

const fallbackLabel = {
  label: 'Statut inconnu',
  severity: 'info'
}

const SourceStateBadge = ({value}) => {
  const label = sourceStateLabels[value] ?? fallbackLabel

  return <Badge severity={label.severity}>{label.label}</Badge>
}

export default SourceStateBadge
