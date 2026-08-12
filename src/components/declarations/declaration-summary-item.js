import Link from 'next/link'

import {getDeclarantTitleFromDeclarant} from '@/lib/declarants.js'
import {getDeclarationPointDisplayName} from '@/lib/declaration-point-name.js'
import {getDeclarationTypeLabel} from '@/lib/declaration-types.js'
import {
  dataSourceTypeLabels,
  getDeclarationDisplayStatus,
  getSourcePeriodLabel,
  getSourceReadingDateLabel,
  isDeclarationTreatmentPending,
  isManualQuickDeclarationSource,
  isTelemetrySource,
  sourceStateLabels
} from '@/lib/declaration.js'
import {pointFlowTypeColors} from '@/lib/point-flow-types.js'
import {formatNumber} from '@/utils/number.js'

const rowGridClassName = 'md:grid-cols-[minmax(8.5rem,0.75fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(6.5rem,6.5rem)]'
const rowGridWithActionsClassName = 'md:grid-cols-[minmax(8.5rem,0.75fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(11rem,11rem)]'

const sourceKindPresentation = {
  MANUAL: {
    label: 'Saisie rapide',
    chipClassName: 'bg-[#e6f4ea] text-[#18753c]',
    iconClassName: 'fr-icon-edit-line text-[#18753c]'
  },
  TELEMETRY: {
    label: 'Télérelève',
    chipClassName: 'bg-[#eeeeff] text-[#000091]',
    iconClassName: 'fr-icon-focus-3-line text-[#000091]'
  },
  SPREADSHEET: {
    label: 'Fichier déposé',
    chipClassName: 'bg-[#fff4f0] text-[#8d533e]',
    iconClassName: 'fr-icon-upload-line text-[#8d533e]'
  },
  NONE: {
    label: 'Déclaration',
    chipClassName: 'bg-gray-100 text-gray-700',
    iconClassName: 'fr-icon-file-line text-gray-600'
  }
}

const quickDeclarationMeasurementPresentation = {
  INDEX: {
    color: 'var(--app-color-blue-ecume, #3B87FF)',
    iconClassName: 'fr-icon-dashboard-3-line text-[#3B87FF]',
    label: 'Index'
  },
  VOLUME: {
    color: 'var(--app-color-blue-france, #000091)',
    iconClassName: 'fr-icon-drop-line text-[#000091]',
    label: 'Volume'
  },
  VOLUME_PRELEVE: {
    color: 'var(--app-color-blue-france, #000091)',
    iconClassName: 'fr-icon-drop-line text-[#000091]',
    label: 'Volume prélevé'
  },
  VOLUME_REJETE: {
    color: pointFlowTypeColors.REJET.accentColor,
    iconClassName: 'fr-icon-drop-line',
    label: 'Volume rejeté'
  }
}

const processingStatusCodes = new Set(['CREATED', 'UPLOADED', 'QUEUED', 'PENDING', 'PROCESSING', 'FAILED'])

function formatDate(value) {
  if (!value) {
    return 'Non renseignée'
  }

  return new Intl.DateTimeFormat('fr-FR', {dateStyle: 'short'}).format(new Date(value))
}

function formatShortDate(value) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
    year: 'numeric'
  }).format(value)
}

function formatShortDateWithoutYear(value) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC'
  }).format(value)
}

function joinDetails(values) {
  return values.filter(Boolean).join(' · ')
}

function formatNames(names, {emptyLabel = 'Non renseigné', limit = 2} = {}) {
  const visibleNames = [...new Set(names.filter(Boolean))]

  if (visibleNames.length === 0) {
    return emptyLabel
  }

  if (visibleNames.length <= limit) {
    return visibleNames.join(' · ')
  }

  const hiddenCount = visibleNames.length - limit
  return `${visibleNames.slice(0, limit).join(' · ')} + ${hiddenCount} autre${hiddenCount > 1 ? 's' : ''}`
}

function formatCount(count, singular, plural = `${singular}s`) {
  const safeCount = Number.isFinite(count) ? count : 0
  return `${formatNumber(safeCount)} ${safeCount > 1 ? plural : singular}`
}

function getStatus(declaration, source) {
  const displayStatus = getDeclarationDisplayStatus(declaration, source)
  return {
    code: displayStatus,
    ...(sourceStateLabels[displayStatus] ?? {label: 'Statut inconnu', severity: 'info'})
  }
}

function getSourceKind(source, declaration) {
  if (isManualQuickDeclarationSource(source)) {
    return 'MANUAL'
  }

  if (isTelemetrySource(source, declaration)) {
    return 'TELEMETRY'
  }

  if (declaration?.dataSourceType === 'SPREADSHEET') {
    return 'SPREADSHEET'
  }

  return declaration?.dataSourceType ?? 'NONE'
}

function getSourceKindPresentation(source, declaration) {
  const kind = getSourceKind(source, declaration)
  return sourceKindPresentation[kind] ?? {
    label: dataSourceTypeLabels[kind] ?? kind,
    chipClassName: 'bg-gray-100 text-gray-700',
    iconClassName: 'fr-icon-file-line text-gray-600'
  }
}

function getShortSourceCode(source) {
  const sourceId = source?.id

  if (!sourceId) {
    return null
  }

  const digits = String(sourceId).replaceAll(/\D/g, '')
  return digits.length >= 6 ? digits.slice(0, 6) : null
}

function getDeclarationCodeLabel(declaration, source, kind) {
  const code = declaration?.code ?? source?.declaration?.code

  if (code) {
    return `N° ${code}`
  }

  const sourceCode = kind === 'TELEMETRY' ? getShortSourceCode(source) : null
  return sourceCode ? `N° ${sourceCode}` : null
}

function getTelemetryConnectorName(source, declaration) {
  return source?.metadata?.connector ?? declaration?.declarationType?.name ?? null
}

function getTelemetryConnectorLabel(source, declaration) {
  const connector = getTelemetryConnectorName(source, declaration)
  return connector ? `Source ${connector}` : null
}

function getDeclarantId(declarant) {
  return declarant?.userId ?? declarant?.id ?? declarant?.user?.id ?? null
}

function getDeclarantName(declarant) {
  return declarant ? getDeclarantTitleFromDeclarant(declarant) : null
}

function isSameDeclarant(a, b) {
  const aId = getDeclarantId(a)
  const bId = getDeclarantId(b)

  return Boolean(aId && bId && aId === bId)
}

function getPointNames(source, {preferUsageName = false} = {}) {
  return (source?.chunks ?? [])
    .map(chunk => getDeclarationPointDisplayName(chunk, source, {
      fallback: '',
      preferUsageName
    }))
    .filter(Boolean)
}

function getPointCount(source) {
  const pointIds = new Set((source?.chunks ?? []).map(chunk => chunk.pointPrelevementId).filter(Boolean))

  return pointIds.size > 0
    ? pointIds.size
    : source?._count?.chunks ?? source?.chunks?.length ?? 0
}

function getPointSummary(source, options) {
  const names = getPointNames(source, options)

  if (names.length > 0) {
    return formatNames(names, {emptyLabel: null})
  }

  return formatCount(getPointCount(source), 'point de prélèvement', 'points de prélèvement')
}

function isSpreadsheetTreatmentPending(declaration, source) {
  return declaration?.dataSourceType === 'SPREADSHEET' && isDeclarationTreatmentPending(declaration, source)
}

function getVolumeLabel(source) {
  const withdrawn = source?.metadata?.totalWaterVolumeWithdrawn
  const discharged = source?.metadata?.totalWaterVolumeDischarged
  const labels = []

  if (typeof withdrawn === 'number' && withdrawn > 0) {
    labels.push(`${formatNumber(withdrawn)} m³ prélevés`)
  }

  if (typeof discharged === 'number' && discharged > 0) {
    labels.push(`${formatNumber(discharged)} m³ rejetés`)
  }

  return labels.join(' · ')
}

function getSourceExactPeriodLabel(source) {
  const dates = (source?.chunks ?? [])
    .flatMap(chunk => [chunk.minDate, chunk.maxDate])
    .filter(Boolean)
    .map(value => new Date(value))
    .filter(date => Number.isFinite(date.getTime()))

  if (dates.length === 0) {
    return null
  }

  const start = new Date(Math.min(...dates.map(date => date.getTime())))
  const end = new Date(Math.max(...dates.map(date => date.getTime())))

  if (start.toISOString().slice(0, 10) === end.toISOString().slice(0, 10)) {
    return `Le ${formatShortDate(start)}`
  }

  if (start.getUTCFullYear() === end.getUTCFullYear()) {
    return `Du ${formatShortDateWithoutYear(start)} au ${formatShortDate(end)}`
  }

  return `Du ${formatShortDate(start)} au ${formatShortDate(end)}`
}

function getQuickDeclarationEntriesCount(source) {
  const entriesCount = Number(source?.metadata?.entriesCount)
  const chunks = source?.chunks ?? []
  const chunkValuesCount = chunks.reduce((sum, chunk) => sum + (chunk.chunkValues?.length ?? 0), 0)

  if (Number.isFinite(entriesCount)) {
    return entriesCount
  }

  return chunkValuesCount > 0 ? chunkValuesCount : chunks.length
}

function getQuickDeclarationNature(source, periodLabel) {
  const measurementType = source?.metadata?.measurementType ?? 'INDEX'
  const count = getQuickDeclarationEntriesCount(source)
  const volumeLabel = getVolumeLabel(source)
  const presentation = quickDeclarationMeasurementPresentation[measurementType]
    ?? quickDeclarationMeasurementPresentation.INDEX

  return {
    iconClassName: null,
    primary: periodLabel,
    secondary: joinDetails([count > 0 ? formatCount(count, 'relevé') : null, volumeLabel]),
    tag: {
      color: presentation.color,
      iconClassName: presentation.iconClassName,
      label: presentation.label
    }
  }
}

function getManualQuickDeclarationPeriodLabel(source) {
  const readingDateLabel = getSourceReadingDateLabel(source)

  if (readingDateLabel) {
    return `Le ${readingDateLabel}`
  }

  return getSourceExactPeriodLabel(source) ?? getSourcePeriodLabel(source)
}

function getTelemetryReadingsLabel(source) {
  const chunks = source?.chunks ?? []
  const countedChunks = chunks.filter(chunk => Number.isFinite(Number(chunk?._count?.chunkValues)))

  if (countedChunks.length > 0) {
    const count = countedChunks.reduce((sum, chunk) => sum + Number(chunk._count.chunkValues), 0)
    return formatCount(count, 'relevé')
  }

  const visibleValuesCount = chunks.reduce((sum, chunk) => sum + (chunk.chunkValues?.length ?? 0), 0)

  if (visibleValuesCount > 0) {
    return formatCount(visibleValuesCount, 'relevé')
  }

  return formatCount(source?._count?.chunks ?? chunks.length, 'mesure télérelevée')
}

function getTelemetryPreleveurNames(source, declaration) {
  const names = []
  const directDeclarantName = getDeclarantName(source?.declarant ?? declaration?.declarant)

  if (directDeclarantName) {
    names.push(directDeclarantName)
  }

  for (const chunk of source?.chunks ?? []) {
    for (const link of chunk.pointPrelevement?.declarants ?? []) {
      const name = getDeclarantName(link.declarant)
      if (name) {
        names.push(name)
      }
    }
  }

  return names
}

function getDeclarationType(source, declaration) {
  if (isTelemetrySource(source, declaration)) {
    return source?.metadata?.connector ?? declaration?.declarationType?.name ?? 'Télérelève'
  }

  return getDeclarationTypeLabel(declaration?.type, declaration?.declarationType)
}

function isChunkToAssociate(chunk) {
  return !chunk?.pointPrelevementId
}

function getPointsToAssociateCount(source) {
  const chunks = source?.chunks ?? []

  if (chunks.length > 0) {
    return chunks.filter(chunk => isChunkToAssociate(chunk)).length
  }

  return source?._count?.chunks ?? 0
}

function getStatusHint({kind, source, status}) {
  if (status.code === 'VALIDATED') {
    return null
  }

  if (kind === 'SPREADSHEET' && ['TO_INSTRUCT', 'INSTRUCTION_IN_PROGRESS', 'PARTIALLY_VALIDATED'].includes(status.code)) {
    const count = getPointsToAssociateCount(source)
    return count > 0
      ? {
        label: formatCount(count, 'point à associer', 'points à associer'),
        variant: 'action'
      }
      : null
  }

  return processingStatusCodes.has(status.code)
    ? {
      label: status.label,
      variant: 'processing'
    }
    : null
}

function getTypeSection({declaration, kind, presentation, source, status}) {
  const declarationCodeLabel = getDeclarationCodeLabel(declaration, source, kind)

  return {
    date: `${source?.type === 'API' ? 'Reçue' : 'Déclarée'} le ${formatDate(declaration?.createdAt ?? source?.createdAt)}`,
    iconClassName: presentation.iconClassName,
    label: presentation.label,
    reference: declarationCodeLabel,
    secondaryReference: null,
    statusHint: getStatusHint({kind, source, status})
  }
}

function getContextSection({
  declaration,
  isTelemetry,
  pointSummary: pointSummaryOverride,
  preferUsageName,
  showDeclarant,
  source
}) {
  const pointSummary = pointSummaryOverride ?? getPointSummary(source, {preferUsageName})

  if (isTelemetry && showDeclarant) {
    return {
      iconClassName: 'fr-icon-user-line text-[#000091]',
      label: 'Préleveur / points',
      primary: formatNames(getTelemetryPreleveurNames(source, declaration), {emptyLabel: 'Préleveur non renseigné'}),
      secondary: pointSummary
    }
  }

  if (showDeclarant) {
    const createdBy = declaration?.createdByDeclarant && !isSameDeclarant(declaration.createdByDeclarant, declaration.declarant)
      ? `Déposée par ${getDeclarantName(declaration.createdByDeclarant)}`
      : null

    return {
      iconClassName: 'fr-icon-user-line text-gray-600',
      label: 'Déclarant concerné / points',
      primary: getDeclarantName(declaration?.declarant) ?? 'Déclarant non renseigné',
      secondary: joinDetails([pointSummary, createdBy])
    }
  }

  return {
    iconClassName: 'fr-icon-map-pin-2-line text-gray-600',
    label: 'Points',
    primary: pointSummary,
    secondary: null
  }
}

function getNatureSection({declaration, isManual, isTelemetry, kind, periodLabel, source}) {
  const declarationType = getDeclarationType(source, declaration)

  if (isTelemetry) {
    const connectorLabel = getTelemetryConnectorLabel(source, declaration)

    return {
      iconClassName: null,
      label: 'Données',
      primary: periodLabel,
      secondary: getTelemetryReadingsLabel(source),
      tag: connectorLabel
        ? {
          color: 'var(--app-color-blue-france, #000091)',
          iconClassName: 'fr-icon-focus-3-line text-[#000091]',
          label: connectorLabel
        }
        : null
    }
  }

  if (isManual) {
    return {
      label: 'Déclaré',
      ...getQuickDeclarationNature(source, periodLabel)
    }
  }

  if (kind === 'SPREADSHEET') {
    return {
      iconClassName: null,
      label: 'Déclaré',
      primary: periodLabel,
      tag: declarationType
        ? {
          color: 'var(--app-color-warning, #8d533e)',
          iconClassName: 'fr-icon-file-text-line text-[#8d533e]',
          label: declarationType
        }
        : null,
      tertiary: getVolumeLabel(source)
    }
  }

  return {
    iconClassName: 'fr-icon-file-text-line text-[#8d533e]',
    label: 'Déclaré',
    primary: periodLabel,
    secondary: declarationType,
    tertiary: getVolumeLabel(source)
  }
}

function getSummarySections({
  declaration,
  presentation,
  preferUsageName,
  showDeclarant,
  source,
  status
}) {
  const isManual = isManualQuickDeclarationSource(source)
  const isTelemetry = isTelemetrySource(source, declaration)
  const kind = getSourceKind(source, declaration)
  const isWaitingForFileProcessing = isSpreadsheetTreatmentPending(declaration, source)
  const periodLabel = (isManual
    ? getManualQuickDeclarationPeriodLabel(source)
    : getSourceExactPeriodLabel(source) ?? getSourcePeriodLabel(source))
    ?? 'Période non renseignée'
  const displayedPeriodLabel = isWaitingForFileProcessing ? 'Analyse du fichier en cours' : periodLabel

  return [
    getTypeSection({
      declaration,
      kind,
      presentation,
      source,
      status
    }),
    getContextSection({
      declaration,
      isTelemetry,
      pointSummary: isWaitingForFileProcessing ? 'Analyse des points en cours' : null,
      preferUsageName,
      showDeclarant,
      source
    }),
    getNatureSection({
      declaration,
      isManual,
      isTelemetry,
      kind,
      periodLabel: displayedPeriodLabel,
      source
    })
  ]
}

const KindChip = ({className, iconClassName, label}) => (
  <span className={`inline-flex w-fit items-center gap-0.5 px-1.5 py-0.5 text-[0.58rem] font-semibold uppercase leading-none ${className}`}>
    <span className={`text-[0.5rem] [&::after]:![--icon-size:0.58rem] [&::before]:![--icon-size:0.58rem] ${iconClassName}`} aria-hidden='true' />
    {label}
  </span>
)

const ReferenceLabel = ({children}) => (
  <div className='text-[0.72rem] font-semibold leading-snug text-gray-800'>
    {children}
  </div>
)

const DeclarationBlock = ({
  chipClassName,
  date,
  iconClassName,
  label,
  reference,
  secondaryReference,
  statusHint
}) => (
  <section className='min-w-0'>
    <div className='mb-1 flex flex-wrap items-center gap-1.5'>
      <KindChip className={chipClassName} iconClassName={iconClassName} label={label} />
      {statusHint && (
        <span className={statusHint.variant === 'action'
          ? 'inline-flex items-center bg-[#ffe9e9] px-1.5 py-0.5 text-[0.68rem] font-bold leading-none text-[#ce0500]'
          : 'text-[0.66rem] font-medium leading-none text-gray-600'}
        >
          {statusHint.label}
        </span>
      )}
    </div>
    {reference && <ReferenceLabel>{reference}</ReferenceLabel>}
    {secondaryReference && (
      <div className='mt-0.5 text-[0.68rem] font-medium leading-snug text-gray-500'>
        {secondaryReference}
      </div>
    )}
    <div className='mt-0.5 text-[0.7rem] leading-snug text-gray-500'>
      {date}
    </div>
  </section>
)

const TextBlock = ({primary, secondary}) => (
  <section className='min-w-0'>
    <div className='break-words text-[0.86rem] font-semibold leading-snug text-gray-900'>
      {primary}
    </div>
    {secondary && (
      <div className='mt-0.5 break-words text-xs leading-snug text-gray-600'>
        {secondary}
      </div>
    )}
  </section>
)

const MetricKind = ({color, iconClassName, label}) => (
  <span className='inline-flex max-w-full items-center gap-1 text-[0.68rem] font-semibold leading-none' style={{color}}>
    {iconClassName
      ? (
        <span
          className={`shrink-0 text-[0.58rem] [&::after]:![--icon-size:0.6rem] [&::before]:![--icon-size:0.6rem] ${iconClassName}`}
          aria-hidden='true'
        />
      )
      : (
        <span
          className='h-1.5 w-1.5 shrink-0 rounded-full'
          style={{backgroundColor: color}}
          aria-hidden='true'
        />
      )}
    <span className='min-w-0 break-words leading-none'>{label}</span>
  </span>
)

const MetricBlock = ({iconClassName, primary, secondary, tag = null, tertiary = null}) => (
  <section className='min-w-0'>
    <div className='flex min-w-0 items-start gap-1.5'>
      {iconClassName && (
        <span className={`mt-0.5 shrink-0 text-[0.6rem] [&::after]:![--icon-size:0.62rem] [&::before]:![--icon-size:0.62rem] ${iconClassName}`} aria-hidden='true' />
      )}
      <div className='min-w-0'>
        <div className='break-words text-[0.86rem] font-semibold leading-tight text-gray-900'>
          {primary}
        </div>
        {tag && (
          <div className='min-w-0'>
            <MetricKind color={tag.color} iconClassName={tag.iconClassName} label={tag.label} />
          </div>
        )}
        {secondary && (
          <div className='mt-0.5 break-words text-xs leading-snug text-gray-600'>
            {secondary}
          </div>
        )}
        {tertiary && (
          <div className='mt-0.5 break-words text-xs leading-snug text-gray-600'>
            {tertiary}
          </div>
        )}
      </div>
    </div>
  </section>
)

const DeclarationSummaryContent = ({
  actionLabel,
  actions,
  declaration,
  preferUsageName,
  showDeclarant,
  source
}) => {
  const status = getStatus(declaration, source)
  const presentation = getSourceKindPresentation(source, declaration)
  const sections = getSummarySections({
    declaration,
    presentation,
    preferUsageName,
    showDeclarant,
    source,
    status
  })
  const gridClassName = actions ? rowGridWithActionsClassName : rowGridClassName

  return (
    <article className='group bg-white px-3 py-2.5 transition-colors hover:bg-[#f7f7ff]'>
      <div className={`grid gap-2.5 ${gridClassName} md:items-center`}>
        <DeclarationBlock
          chipClassName={presentation.chipClassName}
          date={sections[0].date}
          iconClassName={sections[0].iconClassName}
          label={sections[0].label}
          reference={sections[0].reference}
          secondaryReference={sections[0].secondaryReference}
          statusHint={sections[0].statusHint}
        />

        <TextBlock
          primary={sections[1].primary}
          secondary={sections[1].secondary}
        />

        <MetricBlock
          iconClassName={sections[2].iconClassName}
          primary={sections[2].primary}
          secondary={sections[2].secondary}
          tag={sections[2].tag}
          tertiary={sections[2].tertiary}
        />

        <div className='flex min-w-0 items-center justify-end md:min-h-8'>
          {actions || (actionLabel && (
            <span className='fr-link fr-icon-arrow-right-line fr-link--icon-right shrink-0 whitespace-nowrap text-sm font-medium'>
              {actionLabel}
            </span>
          ))}
        </div>
      </div>
    </article>
  )
}

const DeclarationSummaryItem = ({
  actionLabel = 'Consulter',
  actions = null,
  declaration,
  preferUsageName = false,
  showDeclarant = true,
  source,
  url
}) => {
  const content = (
    <DeclarationSummaryContent
      actionLabel={url ? actionLabel : null}
      actions={actions}
      declaration={declaration}
      preferUsageName={preferUsageName}
      showDeclarant={showDeclarant}
      source={source}
    />
  )

  if (!url || actions) {
    return content
  }

  return (
    <Link href={url} className='block no-underline'>
      {content}
    </Link>
  )
}

const DeclarationSummaryListHeader = ({showDeclarant = true}) => (
  <div className={`hidden gap-2.5 border-b border-gray-200 bg-white px-3 py-1.5 text-[0.74rem] font-semibold leading-none text-gray-600 md:grid ${rowGridClassName} md:items-center`}>
    <div>Déclaration</div>
    <div>{showDeclarant ? 'Déclarant concerné / points' : 'Points'}</div>
    <div>Index et volumes</div>
    <div aria-hidden='true' />
  </div>
)

export {DeclarationSummaryListHeader}

export default DeclarationSummaryItem
