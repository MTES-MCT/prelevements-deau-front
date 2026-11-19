'use client'

import {useState} from 'react'
import ReadingDetailsDisclosure from '@/components/declarations/reading-details-disclosure.js'
import ReadingLegend from '@/components/declarations/reading-legend.js'
import {formatTelemetryAmount, formatTelemetryWhen, getTelemetryKind, getTelemetryLabel, getTelemetryTimes} from '@/lib/telemetry-reading.js'
import {coerceNumericValue} from '@/utils/number.js'

const pageSize = 20
const kindOrder = {index: 0, computed: 1, direct: 2, other: 3}

function MeasurementAmount({value}) {
  const amount = formatTelemetryAmount(value)
  if (!value.isOverwritten && value.valueStatus !== 'OVERWRITTEN') return amount
  const correction = value.overwrittenBy
  return <>
    <del className='text-[var(--text-mention-grey)]'>{amount}</del>
    <span className='mt-0.5 block text-xs font-normal text-[var(--text-mention-grey)]'>
      {coerceNumericValue(correction?.value) !== null
        ? 'Remplacée par ' + formatTelemetryAmount({...correction, unit: correction.unit ?? value.unit})
        : 'Valeur remplacée'}
    </span>
  </>
}

function getMeterLabel(value, chunk) {
  const meter = value.serialNumber || (value.compteurId && value.compteurId === (chunk.compteur?.id ?? chunk.compteurId)
    && (chunk.compteur?.serialNumber || chunk.serialNumber || chunk.metadata?.serialNumber))
  if (meter) return 'Compteur ' + meter
  return value.compteurId ? 'Compteur sans numéro renseigné' : null
}

export default function TelemetryReadingDetails({chunk, source, period, scopeId}) {
  const rows = (chunk.chunkValues ?? []).map((value, position) => ({
    value, position, kind: getTelemetryKind(value), end: getTelemetryTimes(value, source, chunk).end
  })).filter(row => !period || (row.end !== null && row.end >= period.start && row.end < period.end))
    .sort((a, b) => (b.end ?? -Infinity) - (a.end ?? -Infinity) || kindOrder[a.kind] - kindOrder[b.kind])
  if (!rows.length) return <p className='fr-hint-text fr-mb-0'>Aucune valeur détaillée disponible.</p>

  return <ReadingDetailsDisclosure>
    <MeasurementTable key={period?.key ?? 'all'} rows={rows} source={source} chunk={chunk} period={period} scopeId={scopeId} />
  </ReadingDetailsDisclosure>
}

function MeasurementTable({rows, chunk, source, period, scopeId}) {
  const [limit, setLimit] = useState(pageSize)
  return (
    <>
      <table aria-describedby={scopeId} className='w-full table-fixed border-collapse text-left text-sm sm:table-auto'>
        <caption className='pb-2 text-left text-xs text-[var(--text-mention-grey)]'>
          {period && <>{period.label} · {rows.length} {rows.length > 1 ? 'mesures' : 'mesure'} · </>}Dates et heures de Paris
        </caption>
        <thead className='border-b border-[var(--border-default-grey)] text-xs text-[var(--text-mention-grey)]'>
          <tr>
            <th scope='col' className='w-[34%] pb-1.5 pl-1 pr-1 font-medium sm:pl-3'>Mesure</th>
            <th scope='col' className='w-[34%] px-1 pb-1.5 font-medium'>Date ou période</th>
            <th scope='col' className='px-1 pb-1.5 text-right font-medium sm:pr-3'>Valeur</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, limit).map(({value, position, kind}) => {
            const meter = getMeterLabel(value, chunk)
            return <tr key={value.id ?? position} className='border-b border-[var(--border-default-grey)] align-top'>
              <td className='break-words py-2 pl-1 pr-1 text-xs leading-snug sm:pl-3 sm:text-sm'>
                <ReadingLegend type={kind}>{getTelemetryLabel(value, chunk)}</ReadingLegend>
                {meter && <span className='mt-0.5 block text-xs text-[var(--text-mention-grey)] [overflow-wrap:anywhere]'>{meter}</span>}
                {value.remark && <span className='mt-0.5 block text-xs text-[var(--text-mention-grey)] [overflow-wrap:anywhere]'>{value.remark}</span>}
              </td>
              <td className='px-1 py-2 text-xs leading-snug tabular-nums [overflow-wrap:anywhere] sm:text-sm'>{formatTelemetryWhen(value, source, chunk)}</td>
              <td className='px-1 py-2 text-right text-xs font-semibold leading-snug tabular-nums [overflow-wrap:anywhere] sm:pr-3 sm:text-sm'><MeasurementAmount value={value} /></td>
            </tr>
          })}
        </tbody>
      </table>
      {limit < rows.length && <div className='mt-2 flex flex-wrap items-center gap-2'>
        <span className='text-xs text-[var(--text-mention-grey)]'>{limit} mesures affichées sur {rows.length}.</span>
        <button type='button' className='fr-btn fr-btn--tertiary-no-outline fr-btn--sm' onClick={() => setLimit(count => count + pageSize)}>Afficher la suite</button>
      </div>}
    </>
  )
}
