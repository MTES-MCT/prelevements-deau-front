'use client'

import {Notice} from '@codegouvfr/react-dsfr/Notice'
import {Tag} from '@codegouvfr/react-dsfr/Tag'
import Link from 'next/link'

import {getDeclarantTitleFromDeclarant} from '@/lib/declarants.js'
import {getDeclarationPointDisplayName} from '@/lib/declaration-point-name.js'
import {getDeclarationTypeLabel} from '@/lib/declaration-types.js'
import {
  dataSourceTypeLabels,
  formatFullAddress,
  getSourcePeriodLabel,
  getSourceReadingDateLabel,
  isDeclarationTreatmentPending,
  isManualQuickDeclarationSource,
  isTelemetrySource,
  sourceStateLabels
} from '@/lib/declaration.js'
import {getDeclarantURL} from '@/lib/urls.js'
import {formatNumber} from '@/utils/number.js'

const formatDepositDate = value => {
  if (!value) {
    return 'Non renseignée'
  }

  const date = new Date(value)

  if (!Number.isFinite(date.getTime())) {
    return 'Non renseignée'
  }

  return new Intl.DateTimeFormat('fr-FR', {dateStyle: 'short'}).format(date)
}

const getDeclarantId = declarant => declarant?.userId || declarant?.id || declarant?.user?.id

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
    color: '#3B87FF',
    iconClassName: 'fr-icon-dashboard-3-line text-[#3B87FF]',
    label: 'Relevé d\'index'
  },
  VOLUME_PRELEVE: {
    color: '#000091',
    iconClassName: 'fr-icon-drop-line text-[#000091]',
    label: 'Volume prélevé'
  },
  VOLUME_REJETE: {
    color: '#CE614A',
    iconClassName: 'fr-icon-drop-line text-[#CE614A]',
    label: 'Volume rejeté'
  }
}

const statusChipClassNames = {
  action: 'bg-[#ffe9e9] text-[#ce0500]',
  error: 'bg-[#ffe9e9] text-[#ce0500]',
  info: 'bg-[#eeeeff] text-[#000091]',
  success: 'bg-[#e6f4ea] text-[#18753c]',
  warning: 'bg-[#fff4f0] text-[#8d533e]'
}

const associationActionStatusCodes = new Set(['TO_INSTRUCT', 'INSTRUCTION_IN_PROGRESS', 'PARTIALLY_VALIDATED'])

function joinDetails(values) {
  return values.filter(Boolean).join(' · ')
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

function formatCount(count, singular, plural = `${singular}s`) {
  const safeCount = Number.isFinite(count) ? count : 0
  return `${formatNumber(safeCount)} ${safeCount > 1 ? plural : singular}`
}

function formatNames(names, {emptyLabel = 'Non renseigné', limit = 3} = {}) {
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

function getProcessingAwareOverviewLabels({declaration, periodLabel, preferUsageName, source}) {
  if (isSpreadsheetTreatmentPending(declaration, source)) {
    return {
      pointSummary: 'Analyse des points en cours',
      periodLabel: 'Analyse du fichier en cours'
    }
  }

  return {
    pointSummary: getPointSummary(source, {preferUsageName}),
    periodLabel: getOverviewPeriodLabel(source, periodLabel)
  }
}

function getTelemetryPreleveurNames(source, declaration) {
  const names = []
  const directDeclarantName = declaration?.declarant ? getDeclarantTitleFromDeclarant(declaration.declarant) : null

  if (directDeclarantName) {
    names.push(directDeclarantName)
  }

  for (const chunk of source?.chunks ?? []) {
    for (const link of chunk.pointPrelevement?.declarants ?? []) {
      const name = link.declarant ? getDeclarantTitleFromDeclarant(link.declarant) : null
      if (name) {
        names.push(name)
      }
    }
  }

  return names
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

function getOverviewPeriodLabel(source, fallbackLabel) {
  const readingDateLabel = getSourceReadingDateLabel(source)

  if (readingDateLabel) {
    return `Le ${readingDateLabel}`
  }

  return getSourceExactPeriodLabel(source) ?? fallbackLabel ?? getSourcePeriodLabel(source) ?? 'Période non renseignée'
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

function getQuickDeclarationMeasurementPresentation(source) {
  const measurementType = source?.metadata?.measurementType ?? 'INDEX'

  return quickDeclarationMeasurementPresentation[measurementType]
    ?? quickDeclarationMeasurementPresentation.INDEX
}

function getTelemetryDepositDetail(source, declaration) {
  const connector = source?.metadata?.connector ?? declaration?.declarationType?.name

  return connector ? `Source ${connector}` : null
}

function getDepositDetail({declaration, kind, source}) {
  if (kind === 'MANUAL') {
    return getQuickDeclarationMeasurementPresentation(source).label
  }

  if (kind === 'TELEMETRY') {
    return getTelemetryDepositDetail(source, declaration)
  }

  return getDeclarationTypeLabel(declaration.type, declaration.declarationType)
}

function getNatureDetails({declaration, kind, source}) {
  const declarationType = getDeclarationTypeLabel(declaration?.type, declaration?.declarationType)
  const volumeLabel = getVolumeLabel(source)

  if (kind === 'MANUAL') {
    const count = getQuickDeclarationEntriesCount(source)

    return {
      detail: joinDetails([count > 0 ? formatCount(count, 'relevé') : null, volumeLabel]),
      iconClassName: null,
      label: null,
      style: null
    }
  }

  if (kind === 'TELEMETRY') {
    return {
      detail: getTelemetryReadingsLabel(source),
      iconClassName: null,
      label: null,
      style: null
    }
  }

  return {
    detail: volumeLabel,
    iconClassName: 'fr-icon-file-text-line',
    label: declarationType,
    style: {color: '#8d533e'}
  }
}

function getDeclarationTitle(declaration) {
  if (declaration?.code) {
    return `Déclaration n°${declaration.code}`
  }

  return declaration?.title ?? 'Déclaration'
}

function hasSeparateDepositor(declaration) {
  const declarantId = getDeclarantId(declaration?.declarant)
  const createdByDeclarantId = getDeclarantId(declaration?.createdByDeclarant)

  return Boolean(declaration?.createdByDeclarant && createdByDeclarantId !== declarantId)
}

function getReceivedDateLabel({declaration, source}) {
  const prefix = source?.type === 'API' ? 'Reçue' : 'Déclarée'
  return `${prefix} le ${formatDepositDate(declaration?.createdAt ?? source?.createdAt)}`
}

function getContextSummary({
  declarantName,
  declaration,
  isTelemetry,
  pointSummary,
  showDeclarant,
  source
}) {
  if (!showDeclarant) {
    return {
      primary: pointSummary,
      secondary: null
    }
  }

  return {
    primary: declarantName ?? formatNames(getTelemetryPreleveurNames(source, declaration), {
      emptyLabel: isTelemetry ? 'Préleveur non renseigné' : 'Déclarant non renseigné'
    }),
    secondary: pointSummary
  }
}

function getFooterGridClassName({hasFiles, showContacts}) {
  return hasFiles && showContacts
    ? 'grid gap-4 border-t border-gray-100 pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]'
    : 'grid gap-4 border-t border-gray-100 pt-4'
}

function getContextTitle({kind, showDeclarant}) {
  if (!showDeclarant) {
    return 'Points'
  }

  if (kind === 'TELEMETRY') {
    return 'Préleveur / points'
  }

  return 'Déclarant concerné / points'
}

function shouldShowStatusBadge({kind, status}) {
  return !(status === 'VALIDATED' && kind !== 'SPREADSHEET')
}

const getContactRows = declarant => [
  declarant?.user?.email
    ? {
      icon: 'ri-at-line',
      content: <a href={`mailto:${declarant.user.email}`}>{declarant.user.email}</a>
    }
    : null,
  declarant?.phoneNumber
    ? {
      icon: 'fr-icon-phone-line',
      content: <a href={`tel:${declarant.phoneNumber}`}>{declarant.phoneNumber}</a>
    }
    : null,
  formatFullAddress(declarant)
    ? {
      icon: 'fr-icon-home-4-line',
      content: formatFullAddress(declarant)
    }
    : null
].filter(Boolean)

const fileLabel = (file, declarationType) => file.filename || getDeclarationTypeLabel(file.type, declarationType)

const DeclarantLink = ({declarant}) => {
  if (!declarant) {
    return 'Non renseigné'
  }

  const id = getDeclarantId(declarant)
  const label = getDeclarantTitleFromDeclarant(declarant)

  if (!id) {
    return label
  }

  return <Link href={getDeclarantURL({userId: id})}>{label}</Link>
}

const KindChip = ({className, iconClassName, label}) => (
  <span className={`inline-flex w-fit items-center gap-1 px-2 py-1 text-[0.62rem] font-semibold uppercase leading-none ${className}`}>
    <span className={`text-[0.56rem] [&::after]:![--icon-size:0.65rem] [&::before]:![--icon-size:0.65rem] ${iconClassName}`} aria-hidden='true' />
    {label}
  </span>
)

const StatusChip = ({value}) => {
  const status = sourceStateLabels[value] ?? {
    label: 'Statut inconnu',
    severity: 'info'
  }
  const className = associationActionStatusCodes.has(value)
    ? statusChipClassNames.action
    : statusChipClassNames[status.severity] ?? statusChipClassNames.info

  return (
    <span className={`inline-flex w-fit items-center px-2 py-1 text-[0.62rem] font-semibold uppercase leading-none ${className}`}>
      {status.label}
    </span>
  )
}

const MetricKind = ({iconClassName, label, style}) => (
  <span className='inline-flex max-w-full items-center gap-1 text-[0.8rem] font-semibold leading-snug' style={style}>
    <span
      className={`shrink-0 text-[0.7rem] [&::after]:![--icon-size:0.75rem] [&::before]:![--icon-size:0.75rem] ${iconClassName}`}
      aria-hidden='true'
    />
    <span className='min-w-0 break-words'>{label}</span>
  </span>
)

const FileList = ({files = [], declarationType}) => {
  if (files.length === 0) {
    return null
  }

  return (
    <ul className='fr-raw-list flex flex-col gap-1'>
      {files.map(file => (
        <li key={file.id} className='min-w-0'>
          {file.url ? (
            <Link download className='break-all' href={file.url}>
              {fileLabel(file, declarationType)}
            </Link>
          ) : (
            <span className='break-all'>{fileLabel(file, declarationType)}</span>
          )}
          <span className='fr-hint-text fr-mb-0'>
            {getDeclarationTypeLabel(file.type, declarationType)}
          </span>
        </li>
      ))}
    </ul>
  )
}

const ContactSummary = ({declarant, label}) => {
  const rows = getContactRows(declarant)

  if (!declarant) {
    return null
  }

  return (
    <div className='min-w-0'>
      <div className='fr-text--xs fr-mb-0 text-gray-500'>{label}</div>
      <div className='fr-text--sm fr-mb-1v font-bold text-gray-900'>
        <DeclarantLink declarant={declarant} />
      </div>

      {rows.length > 0 && (
        <div className='flex flex-col gap-1'>
          {rows.map(row => (
            <div key={`${row.icon}-${String(row.content)}`} className='fr-text--xs fr-mb-0 flex min-w-0 gap-2 text-gray-700'>
              <span className={`${row.icon} shrink-0`} aria-hidden='true' />
              <span className='min-w-0 break-words'>{row.content}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const DeclarationOverview = ({
  actions = null,
  declarantName,
  declaration,
  periodLabel,
  preferUsageName = false,
  showDeclarant = Boolean(declarantName),
  source: sourceFromProps,
  status
}) => {
  const source = sourceFromProps ?? declaration?.source
  const kind = getSourceKind(source, declaration)
  const presentation = getSourceKindPresentation(source, declaration)
  const hasSeparateDepositorValue = hasSeparateDepositor(declaration)
  const displayedAotDecreeNumber = declaration.aotDecreeNumber || declaration.numeroArreteAot
  const title = getDeclarationTitle(declaration)
  const overviewLabels = getProcessingAwareOverviewLabels({
    declaration,
    periodLabel,
    preferUsageName,
    source
  })
  const nature = getNatureDetails({declaration, kind, source})
  const receivedDateLabel = getReceivedDateLabel({declaration, source})
  const depositDetail = getDepositDetail({declaration, kind, source})
  const context = getContextSummary({
    declarantName,
    declaration,
    isTelemetry: kind === 'TELEMETRY',
    pointSummary: overviewLabels.pointSummary,
    showDeclarant,
    source
  })
  const showContacts = Boolean(showDeclarant && (declaration.declarant || hasSeparateDepositorValue))
  const hasFiles = (declaration.files?.length ?? 0) > 0
  const showFooter = hasFiles || showContacts
  const footerGridClassName = getFooterGridClassName({hasFiles, showContacts})
  const showStatusBadge = shouldShowStatusBadge({kind, status})
  const contextTitle = getContextTitle({kind, showDeclarant})

  return (
    <section className='fr-mb-5w border border-gray-200 bg-white p-5 md:p-6'>
      <div className='flex flex-col gap-4'>
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div className='min-w-0'>
            <div className='mb-2 flex flex-wrap items-center gap-2'>
              <KindChip
                className={presentation.chipClassName}
                iconClassName={presentation.iconClassName}
                label={presentation.label}
              />
              {showStatusBadge && <StatusChip value={status} />}
              {displayedAotDecreeNumber && <Tag> AOT {displayedAotDecreeNumber}</Tag>}
            </div>
            <h1 className='fr-h3 fr-mb-1v'>{title}</h1>
          </div>
          {actions && (
            <div className='shrink-0'>
              {actions}
            </div>
          )}
        </div>

        <div className='grid gap-4 border-t border-gray-100 pt-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)_minmax(0,1fr)]'>
          <section className='min-w-0'>
            <h2 className='fr-text--xs fr-mb-2v font-semibold uppercase text-gray-500'>Dépôt</h2>
            <div className='break-words text-base font-semibold leading-snug text-gray-900'>
              {receivedDateLabel}
            </div>
            {depositDetail && (
              <p className='fr-text--sm fr-mb-0 mt-1 break-words text-gray-600'>
                {depositDetail}
              </p>
            )}
          </section>

          <section className='min-w-0'>
            <h2 className='fr-text--xs fr-mb-2v font-semibold uppercase text-gray-500'>
              {contextTitle}
            </h2>
            <div className='break-words text-base font-semibold leading-snug text-gray-900'>
              {context.primary}
            </div>
            {context.secondary && (
              <p className='fr-text--sm fr-mb-0 mt-1 break-words text-gray-600'>
                {context.secondary}
              </p>
            )}
          </section>

          <section className='min-w-0'>
            <h2 className='fr-text--xs fr-mb-2v font-semibold uppercase text-gray-500'>Index / Volumes</h2>
            <div className='break-words text-base font-semibold leading-snug text-gray-900'>
              {overviewLabels.periodLabel}
            </div>
            {nature.label && (
              <div className='mt-1'>
                <MetricKind
                  iconClassName={nature.iconClassName}
                  label={nature.label}
                  style={nature.style}
                />
              </div>
            )}
            {nature.detail && (
              <p className='fr-text--sm fr-mb-0 mt-1 break-words text-gray-600'>
                {nature.detail}
              </p>
            )}
          </section>
        </div>

        {showFooter && (
          <div className={footerGridClassName}>
            {hasFiles && (
              <section className='min-w-0'>
                <h2 className='fr-text--xs fr-mb-2v font-semibold uppercase text-gray-500'>Fichiers</h2>
                <FileList
                  files={declaration.files}
                  declarationType={declaration.declarationType}
                />
              </section>
            )}

            {showContacts && (
              <section className='grid min-w-0 gap-3'>
                <ContactSummary declarant={declaration.declarant} label='Déclarant concerné' />
                {hasSeparateDepositorValue && (
                  <ContactSummary declarant={declaration.createdByDeclarant} label='Déposée par' />
                )}
              </section>
            )}
          </div>
        )}

        {declaration.comment && (
          <div className='border-t border-gray-100 pt-4'>
            <Notice
              description={declaration.comment}
              severity='info'
              title='Commentaire du déclarant'
            />
          </div>
        )}
      </div>
    </section>
  )
}

export default DeclarationOverview
