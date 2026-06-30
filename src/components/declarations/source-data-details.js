'use client'

import {formatUsageReference, getUsageReferenceLabel} from '@/lib/water-uses.js'
import {formatNumber, coerceNumericValue} from '@/utils/number.js'

const MAX_VISIBLE_VALUES = 20

const metricTypeLabels = {
  'volume prélevé': 'Volume prélevé',
  'volume rejeté': 'Volume rejeté',
  index: 'Index',
  'relevé d\'index': 'Relevé d’index'
}

const indexMetricTypeCodes = new Set(['index', 'relevé d\'index'])

function isIndexMetricType(value) {
  return indexMetricTypeCodes.has(value)
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

function formatMetricType(value) {
  return metricTypeLabels[value] ?? value ?? 'Donnée'
}

function formatValue(value, unit) {
  const number = coerceNumericValue(value)

  if (number === null) {
    return 'Non renseignée'
  }

  return `${formatNumber(number, {maximumFractionDigits: 2})}${unit ? ` ${unit}` : ''}`
}

function getPointName(chunk) {
  return chunk.pointPrelevement?.name || chunk.pointPrelevementName || 'Point de prélèvement'
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

function getVisibleValues(chunk, source) {
  const values = chunk.chunkValues ?? []
  const latestIndexReadings = getLatestIndexReadings(chunk)
  const indexValues = getIndexValues(chunk)

  if (isQuickDeclarationSource(source) && latestIndexReadings.length > 0) {
    return latestIndexReadings
  }

  if (isQuickDeclarationSource(source) && indexValues.length > 0) {
    return indexValues
  }

  return values
}

function shouldShowValuesPreview(chunk, source) {
  return !isQuickDeclarationSource(source) || getVisibleValues(chunk, source).length > 0
}

function getSummary(source) {
  const chunks = source?.chunks ?? []
  const pointIds = new Set(chunks.map(chunk => chunk.pointPrelevementId).filter(Boolean))
  const valuesCount = chunks.reduce((count, chunk) => count + (chunk.chunkValues?.length ?? 0), 0)

  return {
    pointCount: pointIds.size > 0 ? pointIds.size : chunks.length,
    seriesCount: chunks.length,
    valuesCount
  }
}

const SummaryItem = ({label, value}) => (
  <div className='border border-gray-200 bg-white p-3'>
    <div className='text-xs uppercase text-gray-500'>{label}</div>
    <div className='fr-text--lg fr-mb-0 font-bold'>{value}</div>
  </div>
)

const ValuesPreview = ({chunk, source}) => {
  const values = getVisibleValues(chunk, source)
  const visibleValues = sortValuesByDate(values).slice(-MAX_VISIBLE_VALUES).reverse()
  const metricType = getMetricType(chunk)
  const isQuickDeclaration = isQuickDeclarationSource(source)
  const displayAsIndex = isQuickDeclaration || isIndexMetricType(metricType)
  const shouldShowIndexTime = displayAsIndex && !isQuickDeclaration
  let summaryLabel = 'Voir les dernières valeurs'

  if (displayAsIndex) {
    summaryLabel = isQuickDeclaration ? 'Voir les derniers index connus' : 'Voir les index relevés'
  }

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
        <table className='w-full min-w-[420px] text-sm'>
          <thead className='bg-gray-50 text-left text-xs uppercase text-gray-500'>
            <tr>
              <th className='px-3 py-2 font-medium'>
                {displayAsIndex ? 'Date de relevé' : 'Date'}
              </th>
              <th className='px-3 py-2 text-right font-medium'>
                {displayAsIndex ? 'Index relevé' : 'Valeur'}
              </th>
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-100'>
            {visibleValues.map(value => (
              <tr key={value.id}>
                <td className='px-3 py-2'>
                  {displayAsIndex
                    ? formatReadingDate(value.periodEnd ?? value.periodStart, shouldShowIndexTime)
                    : formatDateTime(value.periodEnd ?? value.periodStart) ?? 'Non renseignée'}
                </td>
                <td className='px-3 py-2 text-right font-medium'>
                  {formatValue(value.value, value.unit)}
                </td>
              </tr>
            ))}
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

const SourceDataDetails = ({source}) => {
  const chunks = source?.chunks ?? []
  const summary = getSummary(source)
  const isTelemetry = source?.type === 'API'
  const isQuickDeclaration = isQuickDeclarationSource(source)
  const connector = source?.metadata?.connector

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
        {connector && (
          <p className='fr-text--sm fr-mb-0 text-gray-600'>
            Source : {connector}
          </p>
        )}
      </div>

      <div className='mb-4 grid gap-3 sm:grid-cols-3'>
        <SummaryItem label='Points' value={summary.pointCount} />
        <SummaryItem label='Séries' value={summary.seriesCount} />
        <SummaryItem label={isQuickDeclaration ? 'Index déclarés' : 'Valeurs'} value={summary.valuesCount} />
      </div>

      <div className='divide-y divide-gray-200 border border-gray-300 bg-white'>
        {chunks.map(chunk => {
          const lastValue = getLastValue(chunk)
          const metricType = getMetricType(chunk)
          const displayAsIndex = isQuickDeclaration || isIndexMetricType(metricType)
          const displayValue = displayAsIndex ? getLastIndexValue(chunk) ?? lastValue : lastValue
          const shouldShowIndexTime = displayAsIndex && !isQuickDeclaration
          const dateLabel = displayAsIndex ? 'Date de relevé' : 'Période'
          const dateValue = displayAsIndex
            ? formatReadingDate(getReadingDate(chunk, source), shouldShowIndexTime)
            : formatPeriod(chunk.minDate, chunk.maxDate)
          const visibleValues = getVisibleValues(chunk, source)
          const countLabel = displayAsIndex ? 'Index connus' : 'Nb. valeurs'
          const countValue = displayAsIndex ? visibleValues.length : chunk.chunkValues?.length ?? 0
          const usageLabel = formatUsageReference(chunk.usage)
          let valueLabel = 'Dernière valeur'

          if (displayAsIndex) {
            valueLabel = isQuickDeclaration ? 'Index déclaré' : 'Index relevé'
          }

          return (
            <article key={chunk.id} className='p-4'>
              <div className='grid gap-3 lg:grid-cols-[minmax(0,1fr)_11rem_12rem_11rem] lg:items-start'>
                <div className='min-w-0'>
                  <h3 className='fr-text--md fr-mb-0 truncate font-bold'>
                    {getPointName(chunk)}
                  </h3>
                  <p className='fr-text--sm fr-mb-0 text-gray-600'>
                    {formatMetricType(metricType)}
                  </p>
                  {usageLabel && (
                    <p className='fr-text--sm fr-mb-0 truncate text-gray-700' title={usageLabel}>
                      {getUsageReferenceLabel(chunk.usage)} : <span className='font-medium'>{usageLabel}</span>
                    </p>
                  )}
                </div>

                <div>
                  <div className='text-xs text-gray-500'>{dateLabel}</div>
                  <div className='text-sm font-medium'>
                    {dateValue}
                  </div>
                </div>

                <div>
                  <div className='text-xs text-gray-500'>{valueLabel}</div>
                  <div className='text-sm font-medium'>
                    {displayValue ? formatValue(displayValue.value, displayValue.unit) : 'Non renseignée'}
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
