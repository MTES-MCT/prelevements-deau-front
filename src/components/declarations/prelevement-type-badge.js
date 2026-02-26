import {Badge} from '@codegouvfr/react-dsfr/Badge'

// @TODO: review labels
const labels = {
  'aep-zre': {severity: 'new', label: 'AEP ou en ZRE'},
  'icpe-hors-zre': {severity: 'info', label: 'ICPE hors ZRE'},
  'camion-citerne': {severity: 'warning', label: 'Camion citerne'},
  'template-file': {severity: 'info', label: 'Fichier type'},
  'extract-aquasys': {severity: 'info', label: 'Extraction Aquasys'},
  gidaf: {severity: 'info', label: 'Extraction Gidaf'},
  unknown: {severity: 'success', label: 'Autre'}
}

const PrelevementTypeBadge = ({value}) => {
  const label = labels[value]
  return <Badge noIcon severity={label?.severity}>{label?.label}</Badge>
}

export default PrelevementTypeBadge
