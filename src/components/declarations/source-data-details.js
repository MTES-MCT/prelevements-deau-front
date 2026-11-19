'use client'

import Link from 'next/link'
import {Alert} from '@codegouvfr/react-dsfr/Alert'

import QuickReadingChart from '@/components/declarations/quick-reading-chart.js'
import TelemetryReadings from '@/components/declarations/telemetry-reading-chart.js'
import NativeValuesPreview from '@/components/declarations/native-values-preview.js'
import {campaignResponseHref} from '@/lib/campaigns.js'
import {getDeclarantTitleFromDeclarant} from '@/lib/declarants.js'
import {getDeclarationDetailItems, isIndexMetricType, isVolumeMetricType} from '@/lib/declaration-index-readings.js'
import {
  getDeclarationPointDisplayName,
  getDeclarationPointTechnicalReference
} from '@/lib/declaration-point-name.js'
import {getDeclarationTypeLabel} from '@/lib/declaration-types.js'
import {isMeterTelemetrySource, isTelemetrySource} from '@/lib/declaration.js'
import {formatMeterExactPeriod, getMeterPeriod, getMeterValuePeriod, isMeterPeriodSource} from '@/lib/meter-period.js'
import {formatNativeReadingDate, getNativeAssociationWarnings} from '@/lib/native-declaration.js'
import {getPointFlowTypeLabel, POINT_FLOW_TYPES} from '@/lib/point-flow-types.js'
import {getPointPrelevementURL} from '@/lib/urls.js'
import {
  formatUsageReference,
  getUsageColor,
  getUsageKey,
  getUsageReferenceLabel,
  getUsageTextColor
} from '@/lib/water-uses.js'
import {formatNumber, coerceNumericValue} from '@/utils/number.js'
import {formatFrequencyLabel} from '@/utils/frequency.js'

const MAX_VISIBLE_VALUES = 20
const indexNumberFormat = new Intl.NumberFormat('fr-FR', {maximumFractionDigits: 20})

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

function formatValue(value, unit, preservePrecision) {
  const number = coerceNumericValue(value)

  if (number === null) {
    return 'Non renseignée'
  }

  const formatted = preservePrecision
    ? indexNumberFormat.format(typeof value === 'string' ? value.replaceAll(/\s/g, '').replace(',', '.') : number)
    : formatNumber(number, {maximumFractionDigits: 2})
  return `${formatted}${unit ? ` ${unit}` : ''}`
}

function isOverwrittenValue(value) {
  return value?.isOverwritten === true || value?.valueStatus === 'OVERWRITTEN'
}

function getReplacementLabel(value, preservePrecision) {
  const replacement = value?.overwrittenBy
  if (!replacement) {
    return null
  }

  return formatValue(replacement.value, replacement.unit ?? value.unit, preservePrecision)
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
    ?? chunk.metadata?.parameter
}

function getExactReadingDate(chunk, source) {
  return chunk?.metadata?.readingDate
    ?? source?.metadata?.readingDate
    ?? getLastIndexValue(chunk)?.periodEnd
    ?? getLastIndexValue(chunk)?.periodStart
    ?? getLastValue(chunk)?.periodEnd
    ?? getLastValue(chunk)?.periodStart
}

function getReadingDate(chunk, source) {
  return getExactReadingDate(chunk, source)
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
  if (isMeterPeriodSource(source, chunk)) return formatMeterExactPeriod(getMeterPeriod(source, chunk))
  if (displayAsIndex) {
    if (chunk.metadata?.nativeTemporal) {
      return formatNativeReadingDate(getExactReadingDate(chunk, source), chunk.maxDate ?? chunk.minDate)
    }
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
    countValue: chunk.metadata?.nativeTemporal ? chunk._count?.chunkValues ?? 0 : displayAsIndex || (isQuickDeclaration && displayAsVolume)
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
    valueLabel: chunk.metadata?.nativeTemporal ? 'Fréquence' : getValueDetailsLabel({
      displayAsIndex,
      displayAsVolume,
      flowType,
      isQuickDeclaration,
      metricType
    })
  }
}

function formatValueDate({chunk, displayAsIndex, displayAsVolume, isQuickDeclaration, shouldShowIndexTime, source, value}) {
  if (isMeterPeriodSource(source, chunk)) return formatMeterExactPeriod(getMeterValuePeriod(value))
  if (displayAsIndex) {
    return formatReadingDate(value.periodEnd ?? value.periodStart, shouldShowIndexTime)
  }

  if (displayAsVolume && isQuickDeclaration) {
    return formatPeriod(getDeclaredPeriodStart(chunk, source), getDeclaredPeriodEnd(chunk, source))
  }

  return formatDateTime(value.periodEnd ?? value.periodStart) ?? 'Non renseignée'
}

const OverwrittenBadge = () => (
  <span className='inline-flex rounded-xs border border-red-200 bg-red-50 px-1.5 py-0.5 text-[0.7rem] font-semibold uppercase leading-none text-red-700'>
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

const PointTitle = ({chunk, headingId, preferUsageName = false, source, wrap = false}) => {
  const pointName = getDeclarationPointDisplayName(chunk, source, {preferUsageName})
  const technicalReference = getDeclarationPointTechnicalReference(chunk, source, {preferUsageName})
  const pointLinkTarget = getPointPrelevementLinkTarget(chunk)
  const preleveurLabel = getChunkPreleveurLabel(chunk)
  const flowType = getChunkFlowType(chunk)
  const meterNumber = chunk.compteur?.serialNumber || chunk.serialNumber || chunk.metadata?.serialNumber
  const textLayout = wrap ? 'min-w-0 max-w-full break-words' : 'truncate'

  return (
    <>
      <h3 id={headingId} className={`fr-text--md fr-mb-0 font-bold ${textLayout}`}>
        {pointLinkTarget ? (
          <Link
            className={`fr-link inline-flex max-w-full items-center gap-1 ${textLayout}`}
            href={getPointPrelevementURL(pointLinkTarget)}
          >
            <span className={textLayout}>{pointName}</span>
            <span className='fr-icon-arrow-right-up-line text-xs' aria-hidden='true' />
          </Link>
        ) : pointName}
      </h3>
      {technicalReference && (
        <p className={`fr-text--xs fr-mb-0 text-gray-500 ${textLayout}`} title={technicalReference}>
          Référence : {technicalReference}
        </p>
      )}
      {meterNumber && <p className='fr-text--sm fr-mb-0 text-gray-700'>Compteur : {meterNumber}</p>}
      {flowType && (
        <p className='fr-text--xs fr-mb-0 text-gray-600'>
          Type de point : {getPointFlowTypeLabel(flowType)}
        </p>
      )}
      {preleveurLabel && (
        <p className={`fr-text--sm fr-mb-0 text-gray-700 ${textLayout}`} title={preleveurLabel}>
          Préleveur : {preleveurLabel}
        </p>
      )}
    </>
  )
}

const PointDataArticle = ({chunk, source, preferUsageName, usageLabel, measureCount, children}) => (
  <article id={`donnees-${chunk.id}`} aria-labelledby={`titre-point-${chunk.id}`} className='min-w-0 scroll-mt-4'>
    <header className='flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-[var(--border-default-grey)] bg-[var(--background-alt-grey)] px-4 py-3 md:px-5 [&>h3]:basis-full [&>p]:max-w-full [&>p]:break-words'>
      <PointTitle chunk={chunk} headingId={`titre-point-${chunk.id}`} preferUsageName={preferUsageName} source={source} wrap />
      {usageLabel && <UsageReference label={usageLabel} usage={chunk.usage} />}
      {measureCount != null && <span className='text-xs text-[var(--text-mention-grey)]'>{formatNumber(measureCount)} {measureCount > 1 ? 'mesures' : 'mesure'}</span>}
    </header>
    <div className='min-w-0 p-4 md:px-5'>{children}</div>
  </article>
)

const DeclaredValueDisplay = ({value, align = 'left', preservePrecision = false}) => {
  if (!value) {
    return 'Non renseignée'
  }

  const isOverwritten = isOverwrittenValue(value)
  const replacementLabel = getReplacementLabel(value, preservePrecision)
  const alignmentClass = align === 'right' ? 'items-end text-right' : 'items-start'

  return (
    <div className={`flex flex-col gap-1 ${alignmentClass}`}>
      <div className='flex flex-wrap items-center gap-2'>
        <span className={isOverwritten ? 'font-medium text-gray-500 line-through decoration-2' : 'font-medium'}>
          {formatValue(value.value, value.unit, preservePrecision)}
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

function getReadingsCaption(readings) {
  if (readings.length === 1) return '1 relevé déclaré'
  const start = formatDate(readings[0].date)
  const end = formatDate(readings.at(-1).date)
  const count = `${readings.length} relevés déclarés`
  return start && end && start !== end ? `${count} du ${start} au ${end}` : count
}

const IndexReadingsTable = ({caption, history = false, readings, showUsage = false}) => (
  <table className='w-full border-collapse text-left text-sm'>
    <caption className={history ? 'sr-only' : 'pb-2 text-left font-semibold'}>{caption}</caption>
    <thead className='border-b-2 border-gray-300 bg-gray-50'>
      <tr>
        <th scope='col' className='px-2 py-2 font-medium sm:px-3'>Date du relevé</th>
        {showUsage && <th scope='col' className='px-2 py-2 font-medium sm:px-3'>Usage</th>}
        <th scope='col' className='px-2 py-2 text-right font-medium sm:px-3'>{history ? 'Index' : 'Index déclaré'}</th>
      </tr>
    </thead>
    <tbody className='divide-y divide-gray-200 border-b border-gray-200'>
      {readings.map(({date, key, usage, value}) => (
        <tr key={key} className={isOverwrittenValue(value) ? 'bg-red-50/50' : undefined}>
          <td className='px-2 py-2 tabular-nums sm:px-3'>{formatReadingDate(date, false)}</td>
          {showUsage && <td className='break-words px-2 py-2 sm:px-3'>{formatUsageReference(usage) || 'Non renseigné'}</td>}
          <td className='px-2 py-2 text-right tabular-nums sm:px-3'><DeclaredValueDisplay value={value} align='right' preservePrecision /></td>
        </tr>
      ))}
    </tbody>
  </table>
)

function getQuickVolumeLabel(chunk, values, declared = false) {
  const metric = values.find(row => isVolumeMetricType(row.metricTypeCode))?.metricTypeCode ?? 'volume'
  return `${formatMetricType(metric, getChunkFlowType(chunk))} ${declared ? 'déclaré' : 'calculé'}`
}

const DeclaredIndexGroup = ({chunk, readings, history, calculatedVolumes, volumeHistory, following, replaced, preferUsageName, source}) => {
  const showUsage = new Set(readings.map(row => getUsageKey(row.usage))).size > 1
  const usageLabel = formatUsageReference(chunk.usage)
  if (calculatedVolumes) {
    return (
      <PointDataArticle chunk={chunk} source={source} preferUsageName={preferUsageName} usageLabel={!showUsage && usageLabel}>
        <QuickReadingChart readings={readings} history={history} volumes={calculatedVolumes} volumeHistory={volumeHistory} following={following} replaced={replaced} volumeLabel={getQuickVolumeLabel(chunk, calculatedVolumes)} />
      </PointDataArticle>
    )
  }
  const table = readings.length > 0
    ? <IndexReadingsTable caption={getReadingsCaption(readings)} readings={readings} showUsage={showUsage} />
    : <p className='fr-mb-0 text-sm'>Aucun relevé déclaré disponible.</p>
  const previous = history.length > 0 && <IndexReadingsTable caption='Autres relevés connus' readings={history} history />
  return (
    <article className='grid gap-4 p-4 md:grid-cols-[minmax(12rem,1fr)_minmax(0,2fr)]'>
      <div className='min-w-0'>
        <PointTitle chunk={chunk} preferUsageName={preferUsageName} source={source} />
        {!showUsage && usageLabel && <UsageReference label={usageLabel} usage={chunk.usage} />}
      </div>
      <div className='min-w-0'>
        {table}
        {previous && <details className='mt-3'>
          <summary className='cursor-pointer text-sm font-medium text-[#000091]'>Autres relevés connus ({history.length})</summary>
          {previous}
        </details>}
      </div>
    </article>
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
  const showMeter = visibleValues.some(value => value.serialNumber || value.compteurId)

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
              {showMeter && <th className='px-3 py-2 font-medium'>Compteur</th>}
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
                  {showMeter && <td className='px-3 py-2'>{value.serialNumber || 'Numéro non renseigné'}</td>}
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

const SourceDataDetails = ({currentRole = null, declaration, preferUsageName = false, source}) => {
  const chunks = source?.chunks ?? []
  const isTelemetry = isTelemetrySource(source, declaration ?? source?.declaration)
  const campaignHref = campaignResponseHref(source, currentRole)
  const associationWarnings = getNativeAssociationWarnings(chunks)

  if (chunks.length === 0) {
    return (
      <div className='border border-dashed border-gray-300 bg-white p-4 text-center text-sm text-gray-600'>
        Aucune donnée détaillée disponible pour cette déclaration.
      </div>
    )
  }

  const items = isTelemetry ? chunks.map(chunk => ({chunk})) : getDeclarationDetailItems(source)
  const hasQuickPoint = items.some(item => item.calculatedVolumes || item.declaredVolumes)

  return (
    <section className='fr-mt-3w'>
      <div className='mb-3 flex flex-col gap-1'>
        <h2 className='fr-h5 fr-mb-0'>
          {isTelemetry ? 'Données télérelevées' : 'Données déclarées'}
        </h2>
        {isMeterTelemetrySource(source) && (
          <p className='fr-text--sm fr-mb-0 text-gray-600'>
            Ces volumes sont calculés à partir des index des compteurs et mis à jour automatiquement. Ils ne sont pas modifiables ici.
          </p>
        )}
      </div>

      {associationWarnings.length > 0 && (
        <Alert
          severity='warning'
          title='Points reconnus, données à vérifier'
          className='fr-mb-3w'
          description={(
            <ul className='fr-mb-0'>
              {associationWarnings.map(warning => (
                <li key={warning.key}><strong>{warning.pointName}</strong> : {warning.message}</li>
              ))}
            </ul>
          )}
        />
      )}

      <div className={isTelemetry || hasQuickPoint
        ? 'grid gap-5 md:gap-6 [&>article]:border [&>article]:border-[var(--border-default-grey)] [&>article]:bg-[var(--background-default-grey)]'
        : 'divide-y divide-gray-200 border border-gray-300 bg-white'}>
        {items.map(({chunk, readings, history, calculatedVolumes, volumeHistory, declaredVolumes, following, replaced}) => {
          if (isTelemetry && !chunk.metadata?.nativeTemporal) {
            const measureCount = chunk._count?.chunkValues ?? chunk.chunkValues?.length ?? 0
            return (
              <PointDataArticle key={chunk.id} chunk={chunk} source={source} preferUsageName={preferUsageName}
                usageLabel={formatUsageReference(chunk.usage)} measureCount={measureCount}>
                <TelemetryReadings chunk={chunk} source={source} />
              </PointDataArticle>
            )
          }
          if (readings) {
            return <DeclaredIndexGroup key={chunk.id} chunk={chunk} readings={readings} history={history} calculatedVolumes={calculatedVolumes} volumeHistory={volumeHistory} following={following} replaced={replaced} preferUsageName={preferUsageName} source={source} />
          }
          if (declaredVolumes) {
            const usageLabel = formatUsageReference(chunk.usage)
            return (
              <PointDataArticle key={chunk.id} chunk={chunk} source={source} preferUsageName={preferUsageName} usageLabel={usageLabel}>
                <QuickReadingChart
                  declared
                  replaced={replaced}
                  history={history}
                  volumes={declaredVolumes.map(value => ({
                    ...value,
                    periodStartDate: value.periodStartDate ?? chunk.metadata?.periodStartDate ?? source.metadata?.periodStartDate ?? chunk.minDate,
                    periodEndDate: value.periodEndDate ?? chunk.metadata?.periodEndDate ?? source.metadata?.periodEndDate ?? chunk.maxDate
                  }))}
                  volumeHistory={volumeHistory}
                  following={following}
                  volumeLabel={getQuickVolumeLabel(chunk, declaredVolumes, true)}
                />
              </PointDataArticle>
            )
          }
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
                    {chunk.metadata?.nativeTemporal
                      ? formatFrequencyLabel(chunk.metadata.frequency) || 'Non renseignée'
                      : <DeclaredValueDisplay value={displayValue} />}
                  </div>
                </div>

                <div className='lg:text-right'>
                  <div className='text-xs text-gray-500'>{countLabel}</div>
                  <div className='text-sm font-medium'>
                    {countValue}
                  </div>
                </div>
              </div>

              {chunk.metadata?.nativeTemporal ? <NativeValuesPreview key={`${chunk.id}-${chunk.updatedAt || ''}`} sourceId={source.id} chunkId={chunk.id} /> : shouldShowValuesPreview(chunk, source) && (
                <ValuesPreview chunk={chunk} source={source} />
              )}
            </article>
          )
        })}
      </div>
      {source.metadata?.collectionCampaignId && source.metadata?.collectionResponseId && (
        <p className='fr-text--sm fr-mt-2w fr-mb-0'>
          Ces index proviennent d’une campagne.
          {campaignHref && <> <Link href={campaignHref}>Consulter la réponse et les volumes calculés</Link>.</>}
        </p>
      )}
    </section>
  )
}

export default SourceDataDetails
