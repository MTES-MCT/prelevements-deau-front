import {useId, useMemo, useState} from 'react'

import {CalendarPanel, CalendarScale, CalendarScope} from '@/components/declarations/quick-reading-timeline.js'
import TelemetryReadingOverview from '@/components/declarations/telemetry-reading-overview.js'
import TelemetryReadingDetails from '@/components/declarations/telemetry-reading-details.js'
import {buildTelemetryOverview} from '@/lib/telemetry-overview.js'
import ReadingLegend from '@/components/declarations/reading-legend.js'
import {getMeterValuePeriod, isMeterPeriodSource, parseExactInstant} from '@/lib/meter-period.js'
import {formatTelemetryAmount, formatTelemetryRange, formatTelemetryWhen, getTelemetryKind, getTelemetryLabel, getTelemetryTimes, normalizeTelemetryUnit} from '@/lib/telemetry-reading.js'
import {coerceNumericValue} from '@/utils/number.js'

const minute = 60_000
const hour = 60 * minute
const day = 24 * hour
const steps = [
  [1000, '1 s'], [10_000, '10 s'], [minute, '1 min'], [15 * minute, '15 min'], [hour, '1 h'],
  [6 * hour, '6 h'], [day, '24 h'], [7 * day, '7 jours'], [30 * day, '30 jours'], [365 * day, '365 jours']
]
const labels = Object.fromEntries(steps)
const timeZone = 'Europe/Paris'
const shortDate = new Intl.DateTimeFormat('fr-FR', {timeZone, day: 'numeric', month: 'short'})
const fullDate = new Intl.DateTimeFormat('fr-FR', {timeZone, day: 'numeric', month: 'long', year: 'numeric'})
const year = new Intl.DateTimeFormat('fr-FR', {timeZone, year: 'numeric'})
const clock = new Intl.DateTimeFormat('fr-FR', {timeZone, hour: '2-digit', minute: '2-digit'})
const clockSeconds = new Intl.DateTimeFormat('fr-FR', {timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit'})

function buildCalendar(first, last, step, fitRange) {
  const padding = Math.max(1, (last - first) * 0.035)
  const start = fitRange ? first - padding : (Math.floor(first / step) - 1) * step
  const end = fitRange ? last + padding : (Math.ceil(last / step) + 1) * step
  const position = ms => 100 * (ms - start) / (end - start)
  const format = step < minute ? clockSeconds : step < day ? clock : shortDate
  const withDate = step < day && shortDate.format(start) !== shortDate.format(end)
  const withYear = step >= 30 * day || (step >= day && year.format(start) !== year.format(end))
  // Long series can exceed the largest selectable step. Bound the number of grid lines.
  const stride = step * Math.ceil((end - start) / step / 12)
  const ticks = []
  if (fitRange) {
    ticks.push(first)
    for (let time = Math.ceil((first + stride / 2) / stride) * stride; time < last - stride / 2; time += stride) ticks.push(time)
    ticks.push(last)
  } else {
    for (let time = start; time < end; time += stride) ticks.push(time)
    ticks.push(end)
  }
  const wideTicks = new Set(Array.from({length: Math.min(5, ticks.length)}, (_, i) =>
    Math.round(i * (ticks.length - 1) / Math.min(4, ticks.length - 1))))
  const cells = ticks.map((time, i) => {
    const left = position(time)
    const title = formatTelemetryRange(time)
    // The precise formatter adds the offset to both occurrences of the repeated autumn hour.
    const offset = step < day ? title.match(/UTC[+−-]\d+(?::\d+)?$/)?.[0] : undefined
    const sublabel = withDate ? shortDate.format(time) : withYear ? year.format(time) : undefined
    return {left, center: left, label: format.format(time), title, sublabel, offset,
      showMobile: i === 0 || i === ticks.length - 1, showWide: wideTicks.has(i)}
  })
  return {cells, position, exactTimes: true, hasSubLabels: cells.some(cell => cell.sublabel || cell.offset)}
}

const measureAmount = row => formatTelemetryAmount(row.value)

function collectReadings(chunk, source) {
  const groups = new Map()
  const unplotted = []
  const receipt = {counts: {index: 0, computed: 0, direct: 0, other: 0}, first: Infinity, last: -Infinity}
  for (const [i, value] of (chunk.chunkValues ?? []).entries()) {
    if (!value) continue
    const kind = getTelemetryKind(value)
    const {start, end} = getTelemetryTimes(value, source, chunk)
    receipt.counts[kind]++
    if (start !== null && end !== null) {
      receipt.first = Math.min(receipt.first, start)
      receipt.last = Math.max(receipt.last, end)
    }
    if (value.isOverwritten || value.valueStatus === 'OVERWRITTEN') continue
    const name = getTelemetryLabel(value, chunk)
    const amount = coerceNumericValue(value.value)
    const unit = normalizeTelemetryUnit(value.unit)
    const meter = value.compteurId ?? value.serialNumber ?? chunk.compteurId ?? chunk.compteur?.serialNumber ?? ''
    const timeLabel = formatTelemetryWhen(value, source, chunk)
    if (kind === 'other' || amount === null || amount < 0 || start === null || end === null) {
      const key = JSON.stringify([name, unit, meter])
      unplotted.push({key, name, value, end, timeLabel})
      continue
    }

    const indexes = kind === 'index'
    // Different units cannot share a vertical scale. Never connect different meters.
    const key = JSON.stringify([indexes, unit, meter])
    if (!groups.has(key)) groups.set(key, {key, indexes, meter: value.serialNumber ?? chunk.compteur?.serialNumber ?? meter, unit, rows: []})
    const day = new Date(end).toISOString()
    groups.get(key).rows.push({
      key: value.id ?? i, name, kind, unit, amount, value, day, timeLabel, current: true,
      direct: kind === 'direct', start: indexes ? undefined : new Date(start).toISOString(), end: indexes ? undefined : day
    })
  }

  const panels = [...groups.values()].sort((a, b) => Number(b.indexes) - Number(a.indexes))
  for (const panel of panels) panel.rows.sort((a, b) => a.day.localeCompare(b.day))
  return {panels, unplotted, receipt}
}

function ReceiptScope({id, receipt, receivedAt}) {
  const date = parseExactInstant(receivedAt)
  const first = Number.isFinite(receipt.first) ? fullDate.format(receipt.first) : null
  const last = Number.isFinite(receipt.last) ? fullDate.format(receipt.last) : null
  const {index, computed, direct, other} = receipt.counts
  const measures = [
    index && `${index} index télérelevé${index > 1 ? 's' : ''}`,
    computed && (computed > 1 ? computed + ' volumes calculés' : '1 volume calculé'),
    direct && (direct > 1 ? direct + ' volumes télérelevés' : '1 volume télérelevé'),
    other && (other > 1 ? other + ' autres mesures' : '1 autre mesure')
  ].filter(Boolean)
  return <div id={id} data-receipt-scope='' className='mb-3 border-l-2 border-[var(--border-action-high-blue-france)] pl-2.5 text-sm leading-snug'>
    <span className='font-semibold text-[var(--text-action-high-blue-france)]'>
      {date === null ? 'Mesures de la télérelève' : 'Télérelève reçue le ' + fullDate.format(date)}
    </span>
    {measures.length > 0 && <div className='mt-0.5 text-xs'>
      {measures.join(' · ')}
      {first && <span className='text-[var(--text-mention-grey)]'> · {first === last ? 'le ' + first : 'du ' + first + ' au ' + last}</span>}
    </div>}
  </div>
}

function latestOtherMeasures(rows, period) {
  const latest = new Map()
  for (const row of rows) {
    if (period && (row.end === null || row.end < period.start || row.end >= period.end)) continue
    const previous = latest.get(row.key)
    if (!previous || (row.end ?? -Infinity) >= (previous.end ?? -Infinity)) latest.set(row.key, row)
  }
  return [...latest.values()]
}

function ExactReadings({panels, fit = false}) {
  const [choice, setChoice] = useState(null)
  let first = Infinity
  let last = -Infinity
  for (const {rows} of panels) {
    for (const row of rows) {
      first = Math.min(first, Date.parse(row.start ?? row.day))
      last = Math.max(last, Date.parse(row.day))
    }
  }
  const span = last - first
  const suitable = steps.findIndex(([step]) => step >= (span > 0 ? span / (fit ? 8 : 3) : hour))
  const auto = suitable < 0 ? steps.length - 1 : suitable
  const allowed = steps.slice(Math.max(0, auto - 1), auto + 3)
    .filter(([step], i, options) => span <= step * 12 || i === options.length - 1).map(([step]) => step)
  const step = allowed.includes(choice) ? choice : steps[auto][0]
  const calendar = buildCalendar(first, last, step, fit && span > 0)
  return (
    <div className='min-w-0' data-calendar='telemetry' data-scale-value={step}>
      <CalendarScope calendar={calendar} rows={panels.flatMap(panel => panel.rows)} />
      {panels.map(panel => {
        const title = panel.indexes ? 'Index du compteur' : 'Volumes par période'
        const multiple = panels.some(other => other !== panel && other.indexes === panel.indexes)
        const label = multiple ? [title, panel.meter, panel.unit].filter(Boolean).join(' · ') : title
        return <CalendarPanel key={panel.key} rows={panel.rows} indexes={panel.indexes} calendar={calendar} formatAmount={measureAmount} panelLabel={label} />
      })}
      <CalendarScale calendar={calendar} scale={step} allowed={allowed} labels={labels} onChange={value => setChoice(Number(value))} hideControl={fit} />
    </div>
  )
}

function renderPeriod(panels, bucket) {
  return <ExactReadings key={bucket.key} panels={panels} fit />
}

export default function TelemetryReadings({chunk, source}) {
  const scopeId = useId()
  const [bucketKey, setBucketKey] = useState('latest')
  const {panels, unplotted, receipt} = useMemo(() => collectReadings(chunk, source), [chunk, source])
  const replaced = chunk.instructionStatus === 'REJECTED' || source?.globalInstructionStatus === 'REJECTED' || source?.status === 'REJECTED'
  const overview = useMemo(() => !replaced && panels.some(panel => panel.rows.length > 14)
    ? buildTelemetryOverview(panels) : null, [panels, replaced])
  // The final bucket ends after the last observed measurement. Null selects the whole receipt.
  const bucket = bucketKey === null ? null : overview?.buckets.find(b => b.key === bucketKey) ?? overview?.buckets.at(-1)
  const kinds = new Map()
  for (const {rows} of panels) {
    for (const row of rows) kinds.set(row.kind, row.name)
  }
  // The lot can still have an exact period even when individual dates are missing.
  const lot = isMeterPeriodSource(source, chunk) && (getMeterValuePeriod(chunk.metadata) ??
    (source?.chunks?.length === 1 ? getMeterValuePeriod(source.metadata) : null))
  const lotAlreadyShown = lot && panels.some(({rows}) => rows.some(row => row.start === lot.start.toISOString() && row.end === lot.end.toISOString()))
  const otherMeasures = latestOtherMeasures(unplotted, bucket)
  let chart
  if (replaced) {
    chart = <p className='mb-2 text-sm'>Ce lot a été remplacé. Ses mesures figurent dans le détail des données.</p>
  } else if (panels.length || unplotted.length || lot) {
    chart = (
      <figure aria-label='Mesures télérelevées' aria-describedby={scopeId} className='m-0 min-w-0'>
        {lot && !lotAlreadyShown && <p className='mb-2 text-sm'><span className='font-semibold'>Période du lot</span> · {formatTelemetryRange(lot.start.getTime(), lot.end.getTime())}</p>}
        {overview ? <TelemetryReadingOverview panels={panels} overview={overview} selectedBucket={bucket}
          onSelectBucket={period => setBucketKey(period?.key ?? null)} renderDetail={renderPeriod} />
          : panels.length > 0 && <>
            {kinds.has('computed') && kinds.has('direct') && <div className='mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs'>
              {[...kinds].filter(([kind]) => kind !== 'index').map(([kind, label]) => <ReadingLegend key={kind} type={kind}>{label}</ReadingLegend>)}
            </div>}
            <ExactReadings panels={panels} />
          </>}
        {otherMeasures.length > 0 && <ul aria-label='Autres mesures du lot' className='m-0 grid list-none gap-2 py-2 pl-0'>
          {otherMeasures.map(row => <li key={row.key} className='flex flex-wrap items-baseline gap-x-2 text-sm'>
            <span className='font-semibold'>{row.name}</span><strong className='tabular-nums [overflow-wrap:anywhere]'>{measureAmount(row)}</strong>
            <span className='text-xs text-[var(--text-mention-grey)]'>{row.timeLabel}</span>
          </li>)}
        </ul>}
      </figure>
    )
  } else if (chunk.chunkValues?.length) {
    chart = <p className='mb-2 text-sm'>Toutes les mesures de ce lot ont été remplacées.</p>
  }
  return <>
    <ReceiptScope id={scopeId} receipt={receipt} receivedAt={source?.createdAt} />
    {chart}
    <TelemetryReadingDetails chunk={chunk} source={source} period={bucket} scopeId={scopeId} />
  </>
}
