/* eslint-disable react/function-component-definition */
import {Badge} from '@codegouvfr/react-dsfr/Badge'

const labels = {
  SPREADSHEET: {severity: 'success', label: 'Tableur'},
  MANUAL: {severity: 'new', label: 'Manuelle'},
  API: {severity: 'warning', label: 'API'},
  vide: {severity: 'info', label: 'Vide'}
}

export default function TypeSaisieBadge({value}) {
  const label = labels[value]
  return <Badge noIcon severity={label?.severity}>{label?.label}</Badge>
}
