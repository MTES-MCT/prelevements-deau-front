import {Badge} from '@codegouvfr/react-dsfr/Badge'

const labels = {
  SUBMITTED: {severity: 'info', label: 'Soumise'},
  IN_INSTRUCTION: {severity: 'warning', label: 'En instruction'},
  VALIDATED: {severity: 'sucess', label: 'En instruction'},
  REJECTED: {severity: 'warning', label: 'Rejetée'}
}

const DossierStateBadge = ({value}) => {
  const label = labels[value]
  return <Badge severity={label?.severity}>{label?.label}</Badge>
}

export default DossierStateBadge
