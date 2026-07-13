'use client'

import Link from 'next/link'

import {getDeclarantTitleFromDeclarant} from '@/lib/declarants.js'
import {
  getDeclarationPointDisplayName,
  getDeclarationPointTechnicalReference
} from '@/lib/declaration-point-name.js'
import {getDeclarationTypeLabel} from '@/lib/declaration-types.js'
import {getPointFlowTypeLabel, POINT_FLOW_TYPES} from '@/lib/point-flow-types.js'
import {getPointPrelevementURL} from '@/lib/urls.js'
import {
  formatUsageReference,
  getUsageColor,
  getUsageReferenceLabel,
  getUsageTextColor
} from '@/lib/water-uses.js'
import {formatNumber, coerceNumericValue} from '@/utils/number.js'

const MAX_VISIBLE_VALUES = 20

const metricTypeLabels = {
  volume: 'Volume',
  'volume prélevé': 'Volume prélevé',
  'volume rejeté': 'Volume rejeté',
  débit: 'Débit',
  'débit prélevé': 'Débit prélevé',
  index: 'Index',
  'relevé d\'index': 'Relevé d’index'
}

const quickDeclarationIndexLabel = 'Relevé d\'index'

const indexMetricTypeCodes = new Set(['index', 'relevé d\'index'])
const volumeMetricTypeCodes = new Set(['volume', 'volume prélevé', 'volume rejeté'])

function isIndexMetricType(value) {
  return indexMetricTypeCodes.has(value)
}

function isVolumeMetricType(value) {
  return volumeMetricTypeCodes.has(value)
}

function isQuickDeclarationSource(source) {
  return source?.metadata?.manualQuickDeclaration === true
}

function parseDate(value) {
  if (!value) {
    return null
  }

  const stringValue = String(value)
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(stringValue)
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDate(value) {
  const date = parseDate(value)

  if (!date) {
    return null
  }

  return new Intl.DateTimeFormat('fr-FR', {timeZone: 'UTC'}).format(date)
}

function formatDateTime(value) {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date)
}

function formatReadingDate(value, shouldShowTime) {
  const formatter = shouldShowTime ? formatDateTime : formatDate
  return formatter(value) ?? 'Non renseignée'
}

function formatPeriod(start, end) {
  const startLabel = formatDate(start)
  const endLabel = formatDate(end)

  if (startLabel && endLabel) {
    return startLabel === endLabel ? startLabel : `${startLabel} au ${endLabel}`
  }

  return startLabel || endLabel || 'Non renseignée'
}

function getValueDate(value) {
  return parseDate(value?.periodEnd ?? value?.periodStart)
}

function sortValuesByDate(values) {
  return [...values].sort((a, b) => {
    const aDate = getValueDate(a)
    const bDate = getValueDate(b)

    if (!aDate && !bDate) {
      return 0
    }

    if (!aDate) {
      return -1
    }

    if (!bDate) {
      return 1
    }

    return aDate.getTime() - bDate.getTime()
  })
}

function formatMetricType(value, flowType) {
  if (value === 'volume' && flowType) {
    return flowType === POINT_FLOW_TYPES.REJET ? 'Volume rejeté' : 'Volume prélevé'
  }

  if (value === 'débit' && flowType) {
    return flowType === POINT_FLOW_TYPES.REJET ? 'Débit rejeté' : 'Débit prélevé'
  }

  return metricTypeLabels[value] ?? value ?? 'Donnée'
}

function getChunkFlowType(chunk) {
  if (chunk?.flowType || chunk?.pointPrelevement?.flowType) {
    return chunk.flowType ?? chunk.pointPrelevement.flowType
  }

  const metricType = getMetricType(chunk)
  if (metricType === 'volume rejeté') {
    return POINT_FLOW_TYPES.REJET
  }

  if (metricType === 'volume prélevé' || metricType === 'débit prélevé') {
    return POINT_FLOW_TYPES.PRELEVEMENT
  }

  return null
}

function simplifyDeclarationTypeLabel(value) {
  return value?.replace(/^extraction\s+/i, '') ?? null
}

function formatValue(value, unit) {
  const number = coerceNumericValue(value)

  if (number === null) {
    return 'Non renseignée'
  }

  return `${formatNumber(number, {maximumFractionDigits: 2})}${unit ? ` ${unit}` : ''}`
}

function isOverwrittenValue(value) {
  return value?.isOverwritten === true || value?.valueStatus === 'OVERWRITTEN'
}

function getReplacementLabel(value) {
  const replacement = value?.overwrittenBy
  if (!replacement) {
    return null
  }

  return formatValue(replacement.value, replacement.unit ?? value.unit)
}

function getChunkPreleveurLabel(chunk) {
  if (chunk?.preleveur) {
    return getDeclarantTitleFromDeclarant(chunk.preleveur)
  }

  return chunk?.metadata?.externalDeclarant?.name ?? null
}

function getPointPrelevementLinkTarget(chunk) {
  if (chunk.pointPrelevement?.id) {
    return chunk.pointPrelevement
  }

  if (chunk.pointPrelevementId) {
    return {id: chunk.pointPrelevementId}
  }

  return null
}

function getLastValue(chunk) {
  const values = chunk.chunkValues ?? []
  return values.at(-1) ?? null
}

function getIndexValues(chunk) {
  return (chunk.chunkValues ?? []).filter(value => isIndexMetricType(value.metricTypeCode))
}

function getLatestIndexReadings(chunk) {
  return chunk.latestIndexReadings ?? []
}

function getLastIndexValue(chunk) {
  return getIndexValues(chunk).at(-1) ?? null
}

function getMetricType(chunk) {
  return getLastIndexValue(chunk)?.metricTypeCode
    ?? getLastValue(chunk)?.metricTypeCode
    ?? chunk.chunkValues?.[0]?.metricTypeCode
}

function getReadingDate(chunk, source) {
  return chunk?.metadata?.readingDate
    ?? source?.metadata?.readingDate
    ?? getLastIndexValue(chunk)?.periodEnd
    ?? getLastIndexValue(chunk)?.periodStart
    ?? getLastValue(chunk)?.periodEnd
    ?? getLastValue(chunk)?.periodStart
    ?? chunk?.maxDate
    ?? chunk?.minDate
}

function getDeclaredPeriodStart(chunk, source) {
  return chunk?.metadata?.periodStartDate
    ?? source?.metadata?.periodStartDate
    ?? chunk?.minDate
    ?? getLastValue(chunk)?.periodStart
}

function getDeclaredPeriodEnd(chunk, source) {
  return chunk?.metadata?.periodEndDate
    ?? source?.metadata?.periodEndDate
    ?? chunk?.maxDate
    ?? getLastValue(chunk)?.periodEnd
}

function getVisibleValues(chunk, source) {
  const values = chunk.chunkValues ?? []
  const latestIndexReadings = getLatestIndexReadings(chunk)
  const indexValues = getIndexValues(chunk)
  const displayAsIndex = isIndexMetricType(getMetricType(chunk))

  if (isQuickDeclarationSource(source) && displayAsIndex && latestIndexReadings.length > 0) {
    return latestIndexReadings
  }

  if (isQuickDeclarationSource(source) && displayAsIndex && indexValues.length > 0) {
    return indexValues
  }

  return values
}

function shouldShowValuesPreview(chunk, source) {
  return !isQuickDeclarationSource(source) || getVisibleValues(chunk, source).length > 0
}

function getSourceConnectorLabel(source) {
  const connector = source?.metadata?.connector
  return connector ? `Source ${connector}` : null
}

function getDeclarationDetailTypeLabel(declaration, source) {
  if (source?.type === 'API' || isQuickDeclarationSource(source)) {
    return null
  }

  const declarationType = declaration?.declarationType ?? source?.declaration?.declarationType
  const declarationCode = declaration?.type ?? source?.declaration?.type ?? source?.metadata?.declarationType
  return simplifyDeclarationTypeLabel(getDeclarationTypeLabel(declarationCode, declarationType))
}

function getFirstColumnDetails({declaration, flowType, metricType, source}) {
  if (source?.type === 'API') {
    return []
  }

  const metricTypeLabel = isQuickDeclarationSource(source) && isIndexMetricType(metricType)
    ? quickDeclarationIndexLabel
    : formatMetricType(metricType, flowType)

  return [
    getSourceConnectorLabel(source),
    getDeclarationDetailTypeLabel(declaration, source),
    metricTypeLabel
  ].filter(Boolean)
}

function getValueColumnLabel({displayAsIndex, displayAsVolume, isQuickDeclaration}) {
  if (displayAsIndex) {
    return 'Index relevé'
  }

  if (displayAsVolume) {
    return isQuickDeclaration ? 'Volume déclaré' : 'Volume'
  }

  return 'Valeur'
}

function getValueDetailsLabel({displayAsIndex, displayAsVolume, flowType, isQuickDeclaration, metricType}) {
  if (displayAsIndex) {
    return isQuickDeclaration ? 'Index déclaré' : 'Index relevé'
  }

  if (displayAsVolume) {
    const baseLabel = formatMetricType(metricType, flowType)
    return isQuickDeclaration ? `${baseLabel} déclaré` : baseLabel
  }

  return 'Dernière valeur'
}

function getValuesPreviewSummaryLabel({displayAsIndex, displayAsVolume, isQuickDeclaration}) {
  if (displayAsIndex) {
    return isQuickDeclaration ? 'Voir les derniers index connus' : 'Voir les index relevés'
  }

  if (displayAsVolume) {
    return isQuickDeclaration ? 'Voir les volumes déclarés' : 'Voir les volumes'
  }

  return 'Voir les dernières valeurs'
}

function getDateColumnLabel({displayAsIndex, displayAsVolume, isQuickDeclaration}) {
  if (displayAsIndex) {
    return 'Date de relevé'
  }

  if (displayAsVolume && isQuickDeclaration) {
    return 'Période déclarée'
  }

  return 'Date'
}

function getChunkDateLabel({displayAsIndex, displayAsVolume, isQuickDeclaration}) {
  if (displayAsIndex) {
    return 'Date de relevé'
  }

  return isQuickDeclaration && displayAsVolume ? 'Période déclarée' : 'Période'
}

function getChunkDateValue({chunk, displayAsIndex, displayAsVolume, isQuickDeclaration, shouldShowIndexTime, source}) {
  if (displayAsIndex) {
    return formatReadingDate(getReadingDate(chunk, source), shouldShowIndexTime)
  }

  const startDate = isQuickDeclaration && displayAsVolume
    ? getDeclaredPeriodStart(chunk, source)
    : chunk.minDate
  const endDate = isQuickDeclaration && displayAsVolume
    ? getDeclaredPeriodEnd(chunk, source)
    : chunk.maxDate

  return formatPeriod(startDate, endDate)
}

function getChunkCountLabel({displayAsIndex, displayAsVolume, isQuickDeclaration}) {
  if (displayAsIndex) {
    return 'Index connus'
  }

  return isQuickDeclaration && displayAsVolume ? 'Volumes déclarés' : 'Nb. valeurs'
}

function getChunkDisplayContext(chunk, source) {
  const isQuickDeclaration = isQuickDeclarationSource(source)
  const lastValue = getLastValue(chunk)
  const metricType = getMetricType(chunk)
  const flowType = getChunkFlowType(chunk)
  const displayAsIndex = isIndexMetricType(metricType)
  const displayAsVolume = isVolumeMetricType(metricType)
  const shouldShowIndexTime = displayAsIndex && !isQuickDeclaration
  const visibleValues = getVisibleValues(chunk, source)

  return {
    countLabel: getChunkCountLabel({displayAsIndex, displayAsVolume, isQuickDeclaration}),
    countValue: displayAsIndex || (isQuickDeclaration && displayAsVolume)
      ? visibleValues.length
      : chunk.chunkValues?.length ?? 0,
    dateLabel: getChunkDateLabel({displayAsIndex, displayAsVolume, isQuickDeclaration}),
    dateValue: getChunkDateValue({
      chunk,
      displayAsIndex,
      displayAsVolume,
      isQuickDeclaration,
      shouldShowIndexTime,
      source
    }),
    displayValue: displayAsIndex ? getLastIndexValue(chunk) ?? lastValue : lastValue,
    metricType,
    flowType,
    usageLabel: formatUsageReference(chunk.usage),
    valueLabel: getValueDetailsLabel({
      displayAsIndex,
      displayAsVolume,
      flowType,
      isQuickDeclaration,
      metricType
    })
  }
}

function formatValueDate({chunk, displayAsIndex, displayAsVolume, isQuickDeclaration, shouldShowIndexTime, source, value}) {
  if (displayAsIndex) {
    return formatReadingDate(value.periodEnd ?? value.periodStart, shouldShowIndexTime)
  }

  if (displayAsVolume && isQuickDeclaration) {
    return formatPeriod(getDeclaredPeriodStart(chunk, source), getDeclaredPeriodEnd(chunk, source))
  }

  return formatDateTime(value.periodEnd ?? value.periodStart) ?? 'Non renseignée'
}

const OverwrittenBadge = () => (
  <span className='inline-flex rounded-sm border border-red-200 bg-red-50 px-1.5 py-0.5 text-[0.7rem] font-semibold uppercase leading-none text-red-700'>
    Écrasée
  </span>
)

const UsageReference = ({label, usage}) => (
  <p className='fr-text--sm fr-mb-0 flex min-w-0 items-center gap-1.5 text-gray-700' title={label}>
    <span className='shrink-0 text-gray-600'>{getUsageReferenceLabel(usage)} :</span>
    <span
      className='inline-flex min-w-0 max-w-full items-center truncate px-1.5 py-0.5 text-[0.68rem] font-semibold leading-none'
      style={{
        backgroundColor: getUsageColor(usage),
        color: getUsageTextColor(usage)
      }}
    >
      {label}
    </span>
  </p>
)

const PointTitle = ({chunk, preferUsageName = false, source}) => {
  const pointName = getDeclarationPointDisplayName(chunk, source, {preferUsageName})
  const technicalReference = getDeclarationPointTechnicalReference(chunk, source, {preferUsageName})
  const pointLinkTarget = getPointPrelevementLinkTarget(chunk)
  const preleveurLabel = getChunkPreleveurLabel(chunk)
  const flowType = getChunkFlowType(chunk)

  return (
    <>
      <h3 className='fr-text--md fr-mb-0 truncate font-bold'>
        {pointLinkTarget ? (
          <Link
            className='fr-link inline-flex max-w-full items-center gap-1 truncate'
            href={getPointPrelevementURL(pointLinkTarget)}
          >
            <span className='truncate'>{pointName}</span>
            <span className='fr-icon-arrow-right-up-line text-xs' aria-hidden='true' />
          </Link>
        ) : pointName}
      </h3>
      {technicalReference && (
        <p className='fr-text--xs fr-mb-0 truncate text-gray-500' title={technicalReference}>
          Référence : {technicalReference}
        </p>
      )}
      {flowType && (
        <p className='fr-text--xs fr-mb-0 text-gray-600'>
          Type de point : {getPointFlowTypeLabel(flowType)}
        </p>
      )}
      {preleveurLabel && (
        <p className='fr-text--sm fr-mb-0 truncate text-gray-700' title={preleveurLabel}>
          Préleveur : {preleveurLabel}
        </p>
      )}
    </>
  )
}

const DeclaredValueDisplay = ({value, align = 'left'}) => {
  if (!value) {
    return 'Non renseignée'
  }

  const isOverwritten = isOverwrittenValue(value)
  const replacementLabel = getReplacementLabel(value)
  const alignmentClass = align === 'right' ? 'items-end text-right' : 'items-start'

  return (
    <div className={`flex flex-col gap-1 ${alignmentClass}`}>
      <div className='flex flex-wrap items-center gap-2'>
        <span className={isOverwritten ? 'font-medium text-gray-500 line-through decoration-2' : 'font-medium'}>
          {formatValue(value.value, value.unit)}
        </span>
        {isOverwritten && <OverwrittenBadge />}
      </div>
      {isOverwritten && replacementLabel && (
        <div className='text-xs font-normal text-gray-600'>
          Remplacée par {replacementLabel}
        </div>
      )}
    </div>
  )
}

const ValuesPreview = ({chunk, source}) => {
  const values = getVisibleValues(chunk, source)
  const visibleValues = sortValuesByDate(values).slice(-MAX_VISIBLE_VALUES).reverse()
  const metricType = getMetricType(chunk)
  const isQuickDeclaration = isQuickDeclarationSource(source)
  const displayAsIndex = isIndexMetricType(metricType)
  const displayAsVolume = isVolumeMetricType(metricType)
  const shouldShowIndexTime = displayAsIndex && !isQuickDeclaration
  const summaryLabel = getValuesPreviewSummaryLabel({displayAsIndex, displayAsVolume, isQuickDeclaration})

  if (values.length === 0) {
    return (
      <p className='fr-hint-text fr-mb-0'>
        Aucune valeur détaillée disponible.
      </p>
    )
  }

  return (
    <details className='mt-2'>
      <summary className='cursor-pointer text-sm font-medium text-[#000091]'>
        {summaryLabel}
      </summary>
      <div className='mt-2 overflow-x-auto border border-gray-200'>
        <table className='w-full min-w-[520px] text-sm'>
          <thead className='bg-gray-50 text-left text-xs uppercase text-gray-500'>
            <tr>
              <th className='px-3 py-2 font-medium'>
                {getDateColumnLabel({displayAsIndex, displayAsVolume, isQuickDeclaration})}
              </th>
              <th className='px-3 py-2 text-right font-medium'>
                {getValueColumnLabel({displayAsIndex, displayAsVolume, isQuickDeclaration})}
              </th>
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-100'>
            {visibleValues.map(value => {
              const rowIsOverwritten = isOverwrittenValue(value)
              return (
                <tr key={value.id} className={rowIsOverwritten ? 'bg-red-50/50' : undefined}>
                  <td className='px-3 py-2'>
                    {formatValueDate({
                      chunk,
                      displayAsIndex,
                      displayAsVolume,
                      isQuickDeclaration,
                      shouldShowIndexTime,
                      source,
                      value
                    })}
                  </td>
                  <td className='px-3 py-2 text-right'>
                    <DeclaredValueDisplay value={value} align='right' />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {values.length > MAX_VISIBLE_VALUES && (
        <p className='fr-hint-text fr-mt-1w fr-mb-0'>
          {MAX_VISIBLE_VALUES} dernières valeurs affichées sur {values.length}.
        </p>
      )}
    </details>
  )
}

const SourceDataDetails = ({declaration, preferUsageName = false, source}) => {
  const chunks = source?.chunks ?? []
  const isTelemetry = source?.type === 'API'

  if (chunks.length === 0) {
    return (
      <div className='border border-dashed border-gray-300 bg-white p-4 text-center text-sm text-gray-600'>
        Aucune donnée détaillée disponible pour cette déclaration.
      </div>
    )
  }

  return (
    <section className='fr-mt-3w'>
      <div className='mb-3 flex flex-col gap-1'>
        <h2 className='fr-h5 fr-mb-0'>
          {isTelemetry ? 'Données télérelevées' : 'Données déclarées'}
        </h2>
      </div>

      <div className='divide-y divide-gray-200 border border-gray-300 bg-white'>
        {chunks.map(chunk => {
          const {
            countLabel,
            countValue,
            dateLabel,
            dateValue,
            displayValue,
            flowType,
            metricType,
            usageLabel,
            valueLabel
          } = getChunkDisplayContext(chunk, source)
          const firstColumnDetails = getFirstColumnDetails({
            declaration,
            flowType,
            metricType,
            source
          })

          return (
            <article key={chunk.id} className='p-4'>
              <div className='grid gap-3 lg:grid-cols-[minmax(0,1fr)_11rem_12rem_11rem] lg:items-start'>
                <div className='min-w-0'>
                  <PointTitle
                    chunk={chunk}
                    preferUsageName={preferUsageName}
                    source={source}
                  />
                  {firstColumnDetails.map(detail => (
                    <p key={detail} className='fr-text--sm fr-mb-0'>
                      {detail}
                    </p>
                  ))}
                  {usageLabel && <UsageReference label={usageLabel} usage={chunk.usage} />}
                </div>

                <div>
                  <div className='text-xs text-gray-500'>{dateLabel}</div>
                  <div className='text-sm font-medium'>
                    {dateValue}
                  </div>
                </div>

                <div>
                  <div className='text-xs text-gray-500'>{valueLabel}</div>
                  <div className='text-sm'>
                    <DeclaredValueDisplay value={displayValue} />
                  </div>
                </div>

                <div className='lg:text-right'>
                  <div className='text-xs text-gray-500'>{countLabel}</div>
                  <div className='text-sm font-medium'>
                    {countValue}
                  </div>
                </div>
              </div>

              {shouldShowValuesPreview(chunk, source) && (
                <ValuesPreview chunk={chunk} source={source} />
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default SourceDataDetails
