import {Badge} from '@codegouvfr/react-dsfr/Badge'
import Link from 'next/link'

import {getDeclarantTitleFromDeclarant} from '@/lib/declarants.js'
import {getDeclarationTypeLabel} from '@/lib/declaration-types.js'
import {getSourcePeriodLabel, sourceStateLabels} from '@/lib/declaration.js'
import {formatNumber} from '@/utils/number.js'

const dataSourceTypeLabels = {
  MANUAL: 'Saisie rapide',
  SPREADSHEET: 'Dépôt de fichier',
  API: 'API',
  NONE: 'Aucun fichier'
}

const sourceTypeLabels = {
  DECLARATION: 'Déclaration',
  API: 'API',
  BATCH: 'Import'
}
const rowGridClassName = 'md:grid-cols-[minmax(0,1fr)_12rem_9rem_10rem_7rem]'

function formatDate(value) {
  if (!value) {
    return 'Non renseignée'
  }

  return new Intl.DateTimeFormat('fr-FR').format(new Date(value))
}

function getStatus(source) {
  if (!source) {
    return {label: 'Traitement en cours', severity: 'info'}
  }

  if (source.status && source.status !== 'COMPLETED') {
    return sourceStateLabels[source.status] ?? {label: 'Traitement en cours', severity: 'info'}
  }

  return sourceStateLabels[source.globalInstructionStatus] ?? {label: 'Statut inconnu', severity: 'info'}
}

function getApiTitle(source) {
  const connector = source?.metadata?.connector

  if (!connector) {
    return 'Synchronisation API'
  }

  return `Synchronisation ${connector}`
}

function getDeclarationTitle({declaration, source}) {
  if (source?.type === 'API') {
    return getApiTitle(source)
  }

  if (!declaration) {
    return 'Déclaration'
  }

  return `Déclaration n°${declaration.code}`
}

function getDeclarantLabel(declaration) {
  if (!declaration?.declarant) {
    return 'Déclarant non renseigné'
  }

  return getDeclarantTitleFromDeclarant(declaration.declarant)
}

function getPointCountLabel(source) {
  const count = source?._count?.chunks ?? source?.chunks?.length ?? 0

  return `${count} point${count > 1 ? 's' : ''}`
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

function getDeclarationType(source, declaration) {
  if (source?.type === 'API') {
    return source.metadata?.connector ?? 'Connecteur API'
  }

  return getDeclarationTypeLabel(declaration?.type, declaration?.declarationType)
}

function getSourceKind(source, declaration) {
  if (source?.type === 'API') {
    return sourceTypeLabels.API
  }

  return dataSourceTypeLabels[declaration?.dataSourceType] ?? declaration?.dataSourceType ?? sourceTypeLabels[source?.type] ?? 'Déclaration'
}

function getSummaryMetas({declaration, source, showDeclarant}) {
  const metas = [
    {label: 'Format', value: getSourceKind(source, declaration)}
  ]

  if (showDeclarant) {
    metas.unshift({label: 'Déclarant', value: getDeclarantLabel(declaration)})
  }

  const declarationType = getDeclarationType(source, declaration)

  if (declarationType) {
    metas.push({label: 'Type', value: declarationType})
  }

  const volume = getVolumeLabel(source)

  if (volume) {
    metas.push({label: 'Volume', value: volume})
  }

  return metas
}

const InlineMetas = ({metas}) => {
  const visibleMetas = metas.filter(meta => meta.value)

  if (visibleMetas.length === 0) {
    return null
  }

  return (
    <div className='mt-1 flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-sm text-gray-600'>
      {visibleMetas.map(meta => (
        <span key={`${meta.label}-${meta.value}`} className='min-w-0 truncate'>
          <span className='text-gray-500'>{meta.label} :</span>{' '}
          <span className='font-medium text-gray-700'>{meta.value}</span>
        </span>
      ))}
    </div>
  )
}

const DeclarationSummaryListHeader = () => (
  <div className={`hidden bg-gray-50 px-4 py-2 text-xs font-medium uppercase text-gray-500 md:grid ${rowGridClassName}`}>
    <div>Déclaration</div>
    <div>Période</div>
    <div>Dépôt</div>
    <div className='text-right'>Points</div>
    <div />
  </div>
)

const CompactMeta = ({align = 'left', label, secondaryValue = null, value}) => (
  <div className='min-w-0'>
    <div className='text-xs text-gray-500 md:hidden'>{label}</div>
    <div
      className={align === 'right'
        ? 'truncate text-sm font-medium text-gray-900 md:text-right'
        : 'truncate text-sm font-medium text-gray-900'}
      title={value}
    >
      {value}
    </div>
    {secondaryValue && (
      <div
        className={align === 'right'
          ? 'truncate text-xs text-gray-600 md:text-right'
          : 'truncate text-xs text-gray-600'}
        title={secondaryValue}
      >
        {secondaryValue}
      </div>
    )}
  </div>
)

const DeclarationSummaryContent = ({
  actionLabel,
  declaration,
  showDeclarant,
  source
}) => {
  const status = getStatus(source)
  const metas = getSummaryMetas({declaration, source, showDeclarant})
  const periodLabel = getSourcePeriodLabel(source) ?? 'Non renseignée'
  const depositDateLabel = formatDate(declaration?.createdAt ?? source?.createdAt)
  const pointCountLabel = getPointCountLabel(source)
  const volumeLabel = getVolumeLabel(source)

  return (
    <article className={`group grid gap-x-4 gap-y-3 bg-white px-4 py-3 transition-colors hover:bg-[#f7f7ff] md:items-center ${rowGridClassName}`}>
      <div className='min-w-0'>
        <div className='flex flex-wrap items-center gap-2'>
          <h3 className='fr-text--md fr-mb-0 truncate font-bold text-gray-900'>
            {getDeclarationTitle({declaration, source})}
          </h3>
          <Badge severity={status.severity}>{status.label}</Badge>
        </div>

        <InlineMetas metas={metas} />
      </div>

      <CompactMeta label='Période' value={periodLabel} />
      <CompactMeta label='Dépôt' value={depositDateLabel} />
      <CompactMeta
        align='right'
        label='Points'
        secondaryValue={volumeLabel}
        value={pointCountLabel}
      />

      <div className='flex items-center justify-end'>
        {actionLabel && (
          <span className='fr-link fr-icon-arrow-right-line fr-link--icon-right shrink-0 text-sm font-medium'>
            {actionLabel}
          </span>
        )}
      </div>
    </article>
  )
}

const DeclarationSummaryItem = ({
  actionLabel = 'Consulter',
  declaration,
  showDeclarant = true,
  source,
  url
}) => {
  const content = (
    <DeclarationSummaryContent
      actionLabel={url ? actionLabel : null}
      declaration={declaration}
      showDeclarant={showDeclarant}
      source={source}
    />
  )

  if (!url) {
    return content
  }

  return (
    <Link href={url} className='block no-underline'>
      {content}
    </Link>
  )
}

export {DeclarationSummaryListHeader}

export default DeclarationSummaryItem
