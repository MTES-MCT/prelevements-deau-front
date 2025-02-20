import {Badge} from '@codegouvfr/react-dsfr/Badge'

const labels = {
  'aep-zre': {severity: 'new', label: 'AEP ou en ZRE'},
  'icpe-hors-zre': {severity: 'info', label: 'ICPE hors ZRE'},
  'camion-citerne': {severity: 'warning', label: 'Camion citerne'},
  autre: {severity: 'success', label: 'Autre'}
}

const PrelevementTypeBadge = ({value}) => {
  const label = labels[value]
  return <Badge noIcon severity={label?.severity}>{label?.label}</Badge>
}

export default PrelevementTypeBadge
