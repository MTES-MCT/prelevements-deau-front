import moment from 'moment'
import 'moment/locale/fr'

import {getFileAction, getFileSeriesAction, getFileIntegrationsAction} from '@/server/actions/index.js'

moment.locale('fr')

export const sourceStateLabels = {
  TO_INSTRUCT: {
    label: 'À instruire',
    severity: 'info'
  },
  VALIDATED: {
    label: 'Validée',
    severity: 'success'
  },
  REJECTED: {
    label: 'Rejetée',
    severity: 'error'
  },
  PARTIALLY_VALIDATED: {
    label: 'Partiellement validée',
    severity: 'warning'
  },
  INSTRUCTION_IN_PROGRESS: {
    label: 'Instruction en cours',
    severity: 'info'
  }
}

function parseMonth(value) {
  if (!value) {
    return null
  }

  const m = moment.utc(value)
  return m.isValid() ? m.startOf('month') : null
}

export function getDeclarationPeriod({startMonth, endMonth} = {}) {
  const start = parseMonth(startMonth)
  const end = parseMonth(endMonth)

  if (!start && !end) {
    return {start: null, end: null}
  }

  if (!start) {
    return {start: end.toDate(), end: end.toDate()}
  }

  if (!end) {
    return {start: start.toDate(), end: start.toDate()}
  }

  const [from, to] = start.isSameOrBefore(end) ? [start, end] : [end, start]
  return {start: from.toDate(), end: to.toDate()}
}

export function getDeclarationPeriodLabel(declaration) {
  const {start, end} = getDeclarationPeriod(declaration)
  if (!start && !end) {
    return null
  }

  const from = moment.utc(start ?? end)
  const to = moment.utc(end ?? start)

  const fromLabel = from.format('MMMM YYYY')
  const toLabel = to.format('MMMM YYYY')

  return from.isSame(to, 'month') ? fromLabel : `${fromLabel} à ${toLabel}`
}

export function getPointsPrelevementIdsFromDeclaration(declaration) {
  const {source} = declaration

  return getPointsPrelevementIdsFromSource(source)
}

export function getPointsPrelevementIdsFromSource(source) {
  const chunks = source?.chunks || []
  return chunks.map(chunk => chunk.pointPrelevementId).filter(Boolean)
}

export function formatFullAddress({addressLine1, addressLine2, poBox, postalCode, city} = {}) {
  const parts = [
    addressLine1,
    addressLine2,
    poBox,
    [postalCode, city].filter(Boolean).join(' ')
  ]

  return parts.filter(Boolean).join(', ')
}
