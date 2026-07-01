import moment from 'moment'
import 'moment/locale/fr.js'

moment.locale('fr')

export const sourceStateLabels = {
  CREATED: {
    label: 'Déclaration créée',
    severity: 'info'
  },
  UPLOADED: {
    label: 'Fichier reçu',
    severity: 'info'
  },
  QUEUED: {
    label: 'Traitement planifié',
    severity: 'info'
  },
  PENDING: {
    label: 'Traitement en attente',
    severity: 'info'
  },
  PROCESSING: {
    label: 'Traitement en cours',
    severity: 'info'
  },
  FAILED: {
    label: 'Traitement en erreur',
    severity: 'error'
  },
  TO_INSTRUCT: {
    label: 'Points à associer',
    severity: 'warning'
  },
  VALIDATED: {
    label: 'Points associés',
    severity: 'success'
  },
  REJECTED: {
    label: 'Remplacée',
    severity: 'info'
  },
  PARTIALLY_VALIDATED: {
    label: 'Partiellement associée',
    severity: 'warning'
  },
  INSTRUCTION_IN_PROGRESS: {
    label: 'Association en cours',
    severity: 'warning'
  }
}

export const pendingDeclarationProcessingStatuses = new Set([
  'CREATED',
  'UPLOADED',
  'QUEUED',
  'PROCESSING',
  'PENDING'
])

export const dataSourceTypeLabels = {
  MANUAL: 'Saisie rapide',
  SPREADSHEET: 'Fichier',
  API: 'Télérelève',
  NONE: 'Aucun fichier'
}

export const declarationEntryKindLabels = {
  ALL: 'Toutes',
  TELEMETRY: 'Télérelève',
  MANUAL: 'Saisie rapide',
  SPREADSHEET: 'Fichier',
  API: 'API',
  NONE: 'Autres'
}

export function isTelemetrySource(source, declaration = source?.declaration) {
  return source?.type === 'API' || declaration?.dataSourceType === 'API'
}

export function isPointReconciliationRelevant(declaration, source = declaration?.source) {
  return source?.type === 'DECLARATION' && declaration?.dataSourceType === 'SPREADSHEET'
}

export function getTelemetrySourceTitle(source) {
  const connector = source?.metadata?.connector
  return connector ? `Télérelève ${connector}` : 'Données télérelevées'
}

export function buildDeclarationViewFromSource(source) {
  if (source?.declaration) {
    return source.declaration
  }

  return {
    id: source?.id,
    code: null,
    title: getTelemetrySourceTitle(source),
    type: 'telemetry',
    declarationType: {
      name: source?.metadata?.connector ?? 'Télérelève'
    },
    dataSourceType: 'API',
    createdAt: source?.createdAt,
    files: [],
    declarant: source?.declarant ?? null,
    createdByDeclarant: null,
    comment: null
  }
}

export function getDeclarationEntryKind(declaration, source = declaration?.source) {
  if (isTelemetrySource(source, declaration)) {
    return 'TELEMETRY'
  }

  return declaration?.dataSourceType ?? 'NONE'
}

export function getDeclarationDisplayStatus(declaration, source = declaration?.source) {
  if (source?.status === 'COMPLETED') {
    return source.globalInstructionStatus
  }

  if (source?.status) {
    return source.status
  }

  return declaration?.processingStatus ?? 'PROCESSING'
}

export function isDeclarationTreatmentPending(declaration, source = declaration?.source) {
  if (source) {
    return source.status === 'PENDING' || source.status === 'PROCESSING'
  }

  return pendingDeclarationProcessingStatuses.has(declaration?.processingStatus ?? 'PROCESSING')
}

export function getSourcePeriod(source) {
  const chunks = source?.chunks ?? []

  const dates = chunks.flatMap(c => [c?.minDate, c?.maxDate].filter(Boolean))

  if (dates.length === 0) {
    return {start: null, end: null}
  }

  const moments = dates.map(d => moment.utc(d))

  return {
    start: moment.min(moments).toDate(),
    end: moment.max(moments).toDate()
  }
}

export function isManualQuickDeclarationSource(source) {
  return source?.declaration?.dataSourceType === 'MANUAL'
    || source?.metadata?.manualQuickDeclaration === true
}

function formatDateLabel(value) {
  if (!value) {
    return null
  }

  const date = moment.utc(value)

  if (!date.isValid()) {
    return null
  }

  return date.format('L')
}

export function getSourceReadingDateLabel(source) {
  if (!isManualQuickDeclarationSource(source)) {
    return null
  }

  const readingDate = source?.metadata?.readingDate
    ?? source?.chunks?.find(chunk => chunk?.metadata?.readingDate)?.metadata?.readingDate
    ?? source?.chunks?.find(chunk => chunk?.maxDate || chunk?.minDate)?.maxDate
    ?? source?.chunks?.find(chunk => chunk?.maxDate || chunk?.minDate)?.minDate

  return formatDateLabel(readingDate)
}

export function getSourcePeriodLabel(source) {
  const readingDateLabel = getSourceReadingDateLabel(source)
  if (readingDateLabel) {
    return `Relevé du ${readingDateLabel}`
  }

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

export function formatFullAddress(value = {}) {
  const {
    addressLine1,
    addressLine2,
    poBox,
    postalCode,
    city
  } = value ?? {}

  const parts = [
    addressLine1,
    addressLine2,
    poBox,
    [postalCode, city].filter(Boolean).join(' ')
  ]

  return parts.filter(Boolean).join(', ')
}
