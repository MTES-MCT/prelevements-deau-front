/* eslint-disable react/function-component-definition */
import {Badge} from '@codegouvfr/react-dsfr/Badge'

const labels = {
  tableur: {severity: 'success', label: 'Tableur'},
  'saisie-manuelle': {severity: 'new', label: 'Manuelle'},
  vide: {severity: 'info', label: 'Vide'}
}

export default function TypeSaisieBadge({value}) {
  const label = labels[value]
  return <Badge noIcon severity={label?.severity}>{label?.label}</Badge>
}
