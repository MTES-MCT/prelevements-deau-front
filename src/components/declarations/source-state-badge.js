import {Badge} from '@codegouvfr/react-dsfr/Badge'

import {sourceStateLabels} from '@/lib/declaration.js'

const SourceStateBadge = ({value}) => {
  const label = sourceStateLabels[value]
  return <Badge severity={label?.severity}>{label?.label}</Badge>
}

export default SourceStateBadge
