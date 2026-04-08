import moment from 'moment'
import 'moment/locale/fr'

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
    label: 'Validation en cours',
    severity: 'info'
  }
}

export function getSourcePeriod(source) {
  const chunks = source?.chunks ?? []

  const dates = chunks.flatMap(c => [c?.minDate, c?.maxDate].filter(Boolean))

  if (dates.length === 0) {
    return {start: null, end: null}
  }

  const moments = dates.map(d => moment(d))

  return {
    start: moment.min(moments).toDate(),
    end: moment.max(moments).toDate()
  }
}

export function getSourcePeriodLabel(source) {
  const {start, end} = getSourcePeriod(source)
  if (!start && !end) {
    return null
  }

  const from = moment.utc(start ?? end)
  const to = moment.utc(end ?? start)

  const fromLabel = from.format('MMM YYYY')
  const toLabel = to.format('MMM YYYY')

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
