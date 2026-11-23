import moment from 'moment'
import 'moment/locale/fr.js'
import {formatNumber} from '../utils/number.js'
import {getDeclaredIndexDate, isDeclaredIndexValue, isVolumeMetricType} from './declaration-index-readings.js'
import {getSynchronizationSourceLabel} from './meter-synchronization.js'
import {formatMeterCoveredPeriod, getMeterPeriod, isMeterPeriodSource} from './meter-period.js'

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

export function isMeterTelemetrySource(source) {
  return source?.type === 'API' && source?.metadata?.calculationStrategy === 'METER'
}

export function getDeclarationAdminCapabilities(source, role) {
  const canManage = role === 'ADMIN' && Boolean(source?.declaration?.id)
    && source?.readOnly !== true && !isMeterTelemetrySource(source)
  const historicalDn = source?.declaration?.importSourceId?.startsWith('reunion:DN:')
    || (source?.metadata?.provenance === 'DN' && source?.metadata?.historicalAccepted === true)
  return {
    canDelete: canManage && source?.canDelete !== false,
    canReplay: canManage && !historicalDn && source?.canReplay !== false && (source.declaration.files?.length ?? 0) > 0
  }
}

export function isPointReconciliationRelevant(declaration, source = declaration?.source) {
  return source?.type === 'DECLARATION' && declaration?.dataSourceType === 'SPREADSHEET'
}

export function shouldLoadAvailablePointsForDeclaration({currentRole, declaration, source}) {
  const canViewAvailablePoints = currentRole === 'ADMIN'
    || (source?.chunks?.some(chunk => chunk.canReconcile) ?? false)

  return canViewAvailablePoints
    && getDeclarationProcessingStatus(declaration, source) === 'COMPLETED'
    && isPointReconciliationRelevant(declaration, source)
}

export function getDeclarationMapPoints(chunks = [], availablePoints = []) {
  const pointsById = new Map()

  // Source points have already passed the declaration read permissions, not reconciliation permissions.
  for (const chunk of chunks) {
    const point = chunk.pointPrelevement
    if (point?.id && point.id === chunk.pointPrelevementId) {
      pointsById.set(point.id, {...point, canReconcile: false})
    }
  }

  for (const point of availablePoints) {
    pointsById.set(point.id, {...point, canReconcile: true})
  }

  return [...pointsById.values()]
}

export function getTelemetryConnectorName(source, declaration = source?.declaration) {
  const connector = source?.metadata?.connector
  return connector ? getSynchronizationSourceLabel(connector) : declaration?.declarationType?.name ?? null
}

export function getTelemetrySourceTitle(source) {
  return source?.metadata?.connector ? `Télérelève ${getTelemetryConnectorName(source)}` : 'Données télérelevées'
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
      name: getTelemetryConnectorName(source) ?? 'Télérelève'
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

export function getDeclarationProcessingStatus(declaration, source = declaration?.source) {
  const processingStatus = declaration?.processingStatus

  // The source may still describe a previous attempt, or a failed preparation.
  if (processingStatus === 'FAILED') {
    return 'FAILED'
  }

  if (pendingDeclarationProcessingStatuses.has(processingStatus)) {
    return source?.status === 'PROCESSING' ? 'PROCESSING' : processingStatus
  }

  return source?.status ?? processingStatus ?? 'PROCESSING'
}

export function getDeclarationDisplayStatus(declaration, source = declaration?.source) {
  const status = getDeclarationProcessingStatus(declaration, source)
  if (status === 'COMPLETED') {
    return source?.globalInstructionStatus ?? status
  }

  return status
}

export function isDeclarationTreatmentPending(declaration, source = declaration?.source) {
  return pendingDeclarationProcessingStatuses.has(getDeclarationProcessingStatus(declaration, source))
}

// Legacy telemetry chunks can be dated on the day their closing reading arrived.
// The receipt also covers the actual interval of each computed volume it contains.
const telemetryDay = new Intl.DateTimeFormat('en-CA', {timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit'})

export function getSourceDisplayDates(source) {
  return (source?.chunks ?? []).flatMap(chunk => {
    const dates = [chunk?.minDate, chunk?.maxDate].filter(Boolean)
    if (source.type !== 'API' || chunk?.metadata?.nativeTemporal) return dates
    for (const value of chunk?.chunkValues ?? []) {
      if (value.valueKind !== 'COMPUTED' || !isVolumeMetricType(value.metricTypeCode) || value.isOverwritten || value.valueStatus === 'OVERWRITTEN') continue
      const start = Date.parse(value.periodStart)
      const end = Date.parse(value.periodEnd)
      if (end > start) dates.push(telemetryDay.format(start), telemetryDay.format(end - 1))
    }
    return dates
  })
}

export function getSourcePeriod(source) {
  if (isMeterPeriodSource(source)) return getMeterPeriod(source) ?? {start: null, end: null}
  const dates = getSourceDisplayDates(source)

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

export function getQuickDeclarationEntriesCount(source) {
  const entriesCount = source?.metadata?.entriesCount
  if (entriesCount != null && Number.isInteger(Number(entriesCount))) return Number(entriesCount)

  const isIndex = (source?.metadata?.measurementType ?? 'INDEX') === 'INDEX'
  return (source?.chunks ?? []).reduce((sum, chunk) => {
    if (!Array.isArray(chunk.chunkValues)) return sum + 1
    return sum + chunk.chunkValues.filter(value => isIndex ? isDeclaredIndexValue(value) : value.valueKind !== 'COMPUTED').length
  }, 0)
}

export function isOnlineDeclaration(declaration, source = declaration?.source) {
  return declaration?.dataSourceType === 'MANUAL'
    && source?.metadata?.manualQuickDeclaration === true
    && !source.metadata.collectionCampaignId && !source.metadata.collectionResponseId
}

export function isQuickDeclarationWithdrawn(source) {
  return Boolean(source?.metadata?.quickModifiedAt) && source.metadata.entriesCount === 0
}

export function getQuickDeclarationEntriesLabel(source) {
  const count = getQuickDeclarationEntriesCount(source)
  if (count < 1) return null

  const {measurementType, collectionCampaignId, collectionResponseId} = source.metadata ?? {}
  const directVolume = !collectionCampaignId && !collectionResponseId
    && ['VOLUME', 'VOLUME_PRELEVE', 'VOLUME_REJETE'].includes(measurementType)
  if (directVolume) return `${formatNumber(count)} ${count === 1 ? 'volume saisi' : 'volumes saisis'}`
  return `${formatNumber(count)} ${count === 1 ? 'relevé' : 'relevés'}`
}

function getDeclaredVolumePeriodLabel(source) {
  if (source.metadata?.measurementType === 'INDEX') return null
  const metadata = source.metadata?.periodStartDate && source.metadata?.periodEndDate
    ? [source.metadata]
    : (source.chunks ?? []).map(chunk => chunk.metadata)
  const periods = metadata.filter(value => value?.periodStartDate && value?.periodEndDate).map(value => ({
    start: moment.utc(value.periodStartDate, 'YYYY-MM-DD', true),
    end: moment.utc(value.periodEndDate, 'YYYY-MM-DD', true)
  })).filter(({start, end}) => start.isValid() && end.isValid() && !end.isBefore(start))
  if (!periods.length) return null
  const start = moment.min(periods.map(period => period.start))
  const end = moment.max(periods.map(period => period.end))
  return start.isSame(end, 'day') ? `Le ${start.format('L')}` : `Du ${start.format('L')} au ${end.format('L')}`
}

function getQuickReadingDates(source) {
  const chunks = source.chunks ?? []
  const readingDate = source.metadata?.readingDate
  if (source.metadata?.measurementType && source.metadata.measurementType !== 'INDEX') {
    const chunkWithDates = chunks.find(chunk => chunk?.maxDate || chunk?.minDate)
    return [readingDate ?? chunks.find(chunk => chunk?.metadata?.readingDate)?.metadata.readingDate
      ?? chunkWithDates?.maxDate ?? chunkWithDates?.minDate]
  }

  const dates = chunks.flatMap(chunk => {
    const indexValues = (chunk.chunkValues ?? []).filter(isDeclaredIndexValue)
    if (indexValues.length) return indexValues.map(value => getDeclaredIndexDate(value, chunk, source, indexValues.length))
    // List responses contain chunk metadata and bounds but omit individual readings.
    if (chunk.metadata?.readingDate) return [chunk.metadata.readingDate]
    if (chunk.chunkValues?.length) return []
    return readingDate ? [readingDate] : [chunk.minDate, chunk.maxDate]
  }).filter(Boolean)
  return dates.length ? dates : [readingDate]
}

export function getSourceReadingDateLabel(source, {singleDatePrefix = '', rangePrefix = 'Du '} = {}) {
  if (!isManualQuickDeclarationSource(source)) return null
  const volumePeriod = getDeclaredVolumePeriodLabel(source)
  if (volumePeriod) return volumePeriod
  const dates = getQuickReadingDates(source).filter(Boolean)
    .map(value => moment.utc(value, moment.ISO_8601, true))
    .filter(date => date.isValid())
  if (!dates.length) return null

  const start = moment.min(dates)
  const end = moment.max(dates)
  if (start.isSame(end, 'day')) return `${singleDatePrefix}${start.format('L')}`
  return `${rangePrefix}${start.format('L')} au ${end.format('L')}`
}

export function getSourcePeriodLabel(source) {
  if (isQuickDeclarationWithdrawn(source)) return 'Sans mesure active'
  if (isMeterPeriodSource(source)) return formatMeterCoveredPeriod(getMeterPeriod(source))
  const readingDateLabel = getSourceReadingDateLabel(source, {singleDatePrefix: 'Relevé du ', rangePrefix: 'Relevés du '})
  if (readingDateLabel) return readingDateLabel

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
