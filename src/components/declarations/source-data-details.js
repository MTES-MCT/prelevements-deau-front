'use client'

import {formatNumber, coerceNumericValue} from '@/utils/number.js'

const MAX_VISIBLE_VALUES = 20

const metricTypeLabels = {
  'volume prélevé': 'Volume prélevé',
  'volume rejeté': 'Volume rejeté',
  index: 'Index',
  'relevé d\'index': 'Relevé d’index'
}

function formatDate(value) {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat('fr-FR').format(date)
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

function formatPeriod(start, end) {
  const startLabel = formatDate(start)
  const endLabel = formatDate(end)

  if (startLabel && endLabel) {
    return startLabel === endLabel ? startLabel : `${startLabel} au ${endLabel}`
  }

  return startLabel || endLabel || 'Non renseignée'
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

const ValuesPreview = ({chunk}) => {
  const values = chunk.chunkValues ?? []
  const visibleValues = values.slice(-MAX_VISIBLE_VALUES).reverse()

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
        Voir les dernières valeurs
      </summary>
      <div className='mt-2 overflow-x-auto border border-gray-200'>
        <table className='w-full min-w-[420px] text-sm'>
          <thead className='bg-gray-50 text-left text-xs uppercase text-gray-500'>
            <tr>
              <th className='px-3 py-2 font-medium'>Date</th>
              <th className='px-3 py-2 text-right font-medium'>Valeur</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-100'>
            {visibleValues.map(value => (
              <tr key={value.id}>
                <td className='px-3 py-2'>
                  {formatDateTime(value.periodEnd ?? value.periodStart)}
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
        <SummaryItem label='Valeurs' value={summary.valuesCount} />
      </div>

      <div className='divide-y divide-gray-200 border border-gray-300 bg-white'>
        {chunks.map(chunk => {
          const lastValue = getLastValue(chunk)

          return (
            <article key={chunk.id} className='p-4'>
              <div className='grid gap-3 lg:grid-cols-[minmax(0,1fr)_11rem_12rem_11rem] lg:items-start'>
                <div className='min-w-0'>
                  <h3 className='fr-text--md fr-mb-0 truncate font-bold'>
                    {getPointName(chunk)}
                  </h3>
                  <p className='fr-text--sm fr-mb-0 text-gray-600'>
                    {formatMetricType(lastValue?.metricTypeCode ?? chunk.chunkValues?.[0]?.metricTypeCode)}
                  </p>
                </div>

                <div>
                  <div className='text-xs text-gray-500'>Période</div>
                  <div className='text-sm font-medium'>
                    {formatPeriod(chunk.minDate, chunk.maxDate)}
                  </div>
                </div>

                <div>
                  <div className='text-xs text-gray-500'>Dernière valeur</div>
                  <div className='text-sm font-medium'>
                    {lastValue ? formatValue(lastValue.value, lastValue.unit) : 'Non renseignée'}
                  </div>
                </div>

                <div className='lg:text-right'>
                  <div className='text-xs text-gray-500'>Nb. valeurs</div>
                  <div className='text-sm font-medium'>
                    {chunk.chunkValues?.length ?? 0}
                  </div>
                </div>
              </div>

              <ValuesPreview chunk={chunk} />
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default SourceDataDetails
