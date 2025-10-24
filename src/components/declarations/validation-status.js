import {Badge} from '@codegouvfr/react-dsfr/Badge'

import {validationStatus} from '@/lib/dossier.js'

const DossierValidationStatus = ({value}) => {
  const label = validationStatus[value]
  return <Badge severity={value}>{label || 'Non vérifié'}</Badge>
}

export default DossierValidationStatus
