import ReadingDetailsDisclosure from '@/components/declarations/reading-details-disclosure.js'
import ReadingLegend from '@/components/declarations/reading-legend.js'
import {quickReadingDay, volumePeriod} from '@/lib/quick-reading-chart.js'
import {formatUsageReference, getUsageKey} from '@/lib/water-uses.js'
import {coerceNumericValue} from '@/utils/number.js'

const isReplaced = value => value.isOverwritten || value.valueStatus === 'OVERWRITTEN'

function DetailDates({row, dayLabel}) {
  const {start, end, day} = row
  if (start && end && start !== end) {
    return <>Du <time dateTime={start}>{dayLabel(start)}</time> au <time dateTime={end}>{dayLabel(end)}</time></>
  }
  const date = day || start || end
  return date ? <time dateTime={date}>{dayLabel(date)}</time> : 'Non renseignée'
}

function DetailAmount({value, amountLabel, replaced}) {
  const amount = coerceNumericValue(value.value) === null ? 'Non renseignée' : amountLabel({value})
  if (!replaced && !isReplaced(value)) return amount
  const replacement = value.overwrittenBy
  return <>
    <del className='text-[var(--text-mention-grey)]'>{amount}</del>
    <span className='mt-0.5 block text-xs font-normal text-[var(--text-mention-grey)]'>
      {coerceNumericValue(replacement?.value) !== null
        ? 'Remplacée par ' + amountLabel({value: {...replacement, unit: replacement.unit ?? value.unit}})
        : 'Valeur remplacée'}
    </span>
  </>
}

export default function QuickReadingDetails({marks, readings = [], history = [], volumes = [], declared, replaced = false, volumeLabel, dayLabel, amountLabel}) {
  const showUsage = new Set(readings.map(row => getUsageKey(row.usage))).size > 1
  const usages = new Map(readings.map(row => [row.value, row.usage]))
  const rows = marks.map(row => ({...row, kind: row.start ? (row.direct ? 'direct' : 'computed') : 'index'}))
  const plottedValues = new Set(marks.map(row => row.value))
  // The graph omits inactive or incomplete measurements. The receipt keeps the original entry and its correction.
  for (const {value, date, key} of readings) {
    if (!plottedValues.has(value)) rows.push({key: 'index-' + key, day: quickReadingDay(date), value, kind: 'index', scope: 'current', current: true})
  }
  for (const value of volumes) {
    if ((declared || replaced) && !plottedValues.has(value)) {
      const {start, end, direct} = volumePeriod(value, declared)
      rows.push({key: 'volume-' + (value.id ?? [start, end, value.value].join('/')), start, end, day: end, value, kind: direct ? 'direct' : 'computed', scope: 'current', current: true})
    }
  }
  const cutoff = rows.filter(row => row.current && row.day).map(row => row.day).sort().at(-1)
  for (const {value, date, key} of history) {
    const day = quickReadingDay(date)
    if (isReplaced(value) && (!cutoff || day <= cutoff)) rows.push({key: 'index-' + key, day, value, kind: 'index', scope: 'history', current: false})
  }
  if (rows.length === 0) return null
  rows.sort((a, b) => (b.day || '').localeCompare(a.day || '') || Number(a.kind === 'index') - Number(b.kind === 'index'))
  const labels = {
    index: 'Index du compteur',
    direct: volumeLabel.startsWith('Volume rejeté') ? 'Volume de rejet saisi' : 'Volume saisi',
    computed: volumeLabel.replace(/ (calculé|déclaré)$/, '') + ' calculé'
  }

  return (
    <ReadingDetailsDisclosure>
      <table className='w-full table-fixed border-collapse text-left text-sm sm:table-auto'>
        <caption className='sr-only'>Mesures de cette déclaration et des autres déclarations du point</caption>
        <thead className='text-xs text-[var(--text-mention-grey)]'>
          <tr>
            <th scope='col' className='w-[34%] pb-1.5 pl-1 pr-1 font-medium sm:w-[34%] sm:pl-3'>Mesure</th>
            <th scope='col' className='w-[34%] px-1 pb-1.5 font-medium'>Date ou période</th>
            <th scope='col' className='px-1 pb-1.5 text-right font-medium sm:pr-3'>Valeur</th>
          </tr>
        </thead>
        {Object.entries({current: 'Cette déclaration', history: 'Historique', following: 'Déclarations suivantes'}).map(([scope, groupLabel]) => {
          const group = rows.filter(row => row.scope === scope)
          if (!group.length) return null
          return <tbody key={groupLabel} aria-label={groupLabel}>
            <tr>
              <th scope='rowgroup' colSpan='3' className={'px-1.5 py-1 text-xs font-semibold sm:px-3 ' + (scope === 'current'
                ? 'bg-[var(--background-alt-blue-france)] text-[var(--text-action-high-blue-france)]'
                : 'bg-[var(--background-alt-grey)] text-[var(--text-mention-grey)]')}>{groupLabel}</th>
            </tr>
            {group.map(row => {
              const usage = showUsage && row.current && row.kind === 'index' && (formatUsageReference(usages.get(row.value)) || 'Usage non renseigné')
              return <tr key={row.key} className='border-b border-[var(--border-default-grey)] align-top'>
                <td className='break-words py-2 pl-1 pr-1 text-xs leading-snug sm:pl-3 sm:text-sm'>
                  <ReadingLegend type={row.kind}>{labels[row.kind]}</ReadingLegend>
                  {usage && <span className='mt-0.5 block text-xs text-[var(--text-mention-grey)]'>{usage}</span>}
                </td>
                <td className='px-1 py-2 text-xs leading-snug tabular-nums sm:text-sm'><DetailDates row={row} dayLabel={dayLabel} /></td>
                <td className='px-1 py-2 text-right text-xs font-semibold leading-snug tabular-nums [overflow-wrap:anywhere] sm:pr-3 sm:text-sm'><DetailAmount value={row.value} amountLabel={amountLabel} replaced={replaced} /></td>
              </tr>
            })}
          </tbody>
        })}
      </table>
    </ReadingDetailsDisclosure>
  )
}
