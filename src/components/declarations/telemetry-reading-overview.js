import {useId, useRef} from 'react'

import ReadingLegend from '@/components/declarations/reading-legend.js'
import ReadingScope from '@/components/declarations/reading-scope.js'
import {formatTelemetryAmount, formatTelemetryRange} from '@/lib/telemetry-reading.js'

const periodNouns = {month: 'mois', week: 'semaine', day: 'journée'}
const periodArticles = {month: 'le mois', week: 'la semaine', day: 'la journée'}
const colors = {
  index: 'var(--text-action-high-blue-france, #000091)',
  computed: 'var(--text-label-green-emeraude, #297254)',
  direct: 'var(--text-label-brown-caramel, #845d48)'
}
const axisNumber = new Intl.NumberFormat('fr-FR', {maximumSignificantDigits: 7})
const compactNumber = new Intl.NumberFormat('fr-FR', {notation: 'compact', maximumSignificantDigits: 4})
const measurementNames = {index: 'Dernier index relevé', computed: 'Volume calculé', direct: 'Volume télérelevé'}
const gridColor = 'var(--border-default-grey)'

function makeAxis(values, indexes) {
  const low = indexes && values.length ? Math.min(...values) : 0
  const high = values.length ? Math.max(...values) : 0
  const span = high > low ? high - low : Math.max(high * 0.1, 1)
  const magnitude = 10 ** Math.floor(Math.log10(span / 3))
  const step = [1, 2, 5, 10].find(factor => factor * magnitude >= span / 3) * magnitude
  const min = Math.max(0, Math.floor((low === high ? low - step : low) / step) * step)
  const max = Math.max(min + step, Math.ceil(high / step) * step)
  const ticks = Array.from({length: Math.round((max - min) / step) + 1}, (_, i) => min + i * step)
  // Leave room above points for their amounts and below the baseline for zero volumes.
  const y = value => 86 - 70 * (value - min) / (max - min)
  return {ticks, y, baseline: y(0)}
}

function ChartMark({mark, bucket, slot, slots, axis, onChoose}) {
  const {kind, amount} = mark
  const known = Number.isFinite(amount)
  const index = kind === 'index'
  const unavailable = index ? 'Plusieurs index au même instant' : mark.overlapping ? 'Périodes qui se chevauchent' : 'Cumul indisponible'
  const countLabel = index ? (mark.count === 1 ? 'relevé' : 'relevés') : (mark.count === 1 ? 'volume' : 'volumes')
  const when = formatTelemetryRange(Date.parse(mark.start), Date.parse(mark.end))
  const amountLabel = known ? formatTelemetryAmount(mark.value) : unavailable
  const label = [bucket.label, measurementNames[kind], amountLabel,
    mark.count + ' ' + countLabel, when].join(' · ')
  const top = known ? axis.y(amount) : 70
  const color = colors[kind]
  return (
    <button type='button' data-overview-period={bucket.key} data-kind={kind} data-value={mark.value.value ?? undefined}
      title={label} aria-label={label + ' · Voir les mesures'} onClick={() => onChoose(bucket)}
      className='@container group absolute top-0 h-full cursor-pointer bg-transparent p-0 hover:bg-[var(--background-alt-grey-hover)]/30 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-0'
      style={{left: (100 * slot / slots) + '%', width: (100 / slots) + '%', color}}>
      {known && index && <span aria-hidden='true' className='absolute left-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-[var(--background-default-grey)] group-hover:bg-current group-focus-visible:bg-current'
        style={{top: top + '%', borderColor: color}} />}
      {known && !index && <span aria-hidden='true' className='absolute left-1/2 w-[64%] max-w-16 -translate-x-1/2'
        style={{top: top + '%', height: (axis.baseline - top) + '%',
          border: amount === 0 ? undefined : '1px solid ' + color,
          borderBottom: amount === 0 ? '2px dashed ' + color : undefined,
          background: kind === 'computed'
            ? 'repeating-linear-gradient(-45deg, transparent, transparent 4px, color-mix(in srgb, ' + color + ' 72%, transparent) 4px, color-mix(in srgb, ' + color + ' 72%, transparent) 5px), color-mix(in srgb, ' + color + ' 12%, var(--background-default-grey))'
            : 'color-mix(in srgb, ' + color + ' 28%, var(--background-default-grey))'}} />}
      {!known && <span aria-hidden='true' className='absolute left-1/2 -translate-x-1/2 text-sm font-semibold' style={{top: top + '%'}}>!</span>}
      {known && amountLabel.length <= 16 && <span aria-hidden='true'
        className={'pointer-events-none absolute left-1/2 hidden -translate-x-1/2 -translate-y-full whitespace-nowrap pb-1.5 text-xs font-semibold tabular-nums ' +
          (amountLabel.length <= 6 ? '@[3rem]:block' : amountLabel.length <= 10 ? '@[5rem]:block' : '@[8rem]:block')}
        style={{top: top + '%'}}>{amountLabel}</span>}
    </button>
  )
}

function OverviewPanel({panel, panelIndex, buckets, grain, showMeter, onChoose}) {
  const id = useId()
  const series = buckets.map(bucket => bucket.panels[panelIndex].marks)
  const marks = series.flat()
  const kinds = [...new Set(marks.map(mark => mark.kind))]
  const axis = makeAxis(marks.map(mark => mark.amount).filter(Number.isFinite), panel.indexes)
  const mixed = kinds.length > 1
  const title = panel.indexes ? 'Index du compteur' : mixed ? 'Volumes' : kinds[0] === 'direct' ? 'Volumes télérelevés' : 'Volumes calculés'
  const unit = panel.unit ? ' (' + panel.unit + ')' : ''
  const description = panel.indexes
    ? 'Dernier relevé de chaque ' + (periodNouns[grain] ?? 'intervalle')
    : 'Chaque volume est compté dans ' + (periodArticles[grain] ?? 'l’intervalle') + ' où se termine sa période.'
  return (
    <section data-panel={panel.indexes ? 'indexes' : 'volumes'} aria-labelledby={id} className='min-w-0 border-t border-[var(--border-default-grey)] pt-3'>
      <div className='flex flex-wrap items-baseline gap-x-3 gap-y-0.5'>
        <h4 id={id} className='m-0 text-sm font-bold'>{title}{unit}{showMeter && panel.meter ? ' · ' + panel.meter : ''}</h4>
        <p className='m-0 text-xs text-[var(--text-mention-grey)]'>{description}</p>
      </div>
      {mixed && <div className='mt-1 flex flex-wrap gap-x-4 text-xs'>
        {kinds.map(kind => <ReadingLegend key={kind} type={kind}>{measurementNames[kind]}</ReadingLegend>)}
      </div>}
      {panel.indexes && marks.some(mark => mark.amount === null) && <p className='m-0 text-xs'>Plusieurs index au même instant figurent dans le détail de la période.</p>}
      {marks.some(mark => mark.overlapping) && <p className='m-0 text-xs'>Le cumul est indisponible lorsque des périodes se chevauchent.</p>}
      <div className='@container relative ml-12 mt-1 h-28 min-w-0 sm:ml-16'>
        {axis.ticks.map(tick => <div key={tick} aria-hidden='true' className='pointer-events-none absolute inset-x-0 border-t'
          style={{top: axis.y(tick) + '%', borderColor: gridColor, borderStyle: tick === 0 ? 'solid' : 'dashed'}}>
          <span className='absolute right-full mr-1.5 -translate-y-1/2 whitespace-nowrap text-[0.65rem] leading-none tabular-nums text-[var(--text-mention-grey)] sm:mr-2.5 sm:text-xs'>
            {(Math.abs(tick) >= 1e6 ? compactNumber : axisNumber).format(tick)}
          </span>
        </div>)}
        {panel.indexes && <svg aria-hidden='true' viewBox='0 0 100 100' preserveAspectRatio='none' className='pointer-events-none absolute inset-0 h-full w-full'>
          {series.map(([mark], i) => {
            const previous = series[i - 1]?.[0]
            if (!mark?.connect || previous?.amount == null || mark.amount == null) return null
            return <line key={buckets[i].key} x1={100 * (i - 0.5) / buckets.length} x2={100 * (i + 0.5) / buckets.length}
              y1={axis.y(previous.amount)} y2={axis.y(mark.amount)} vectorEffect='non-scaling-stroke' stroke={colors.index} strokeWidth='2' />
          })}
        </svg>}
        <div className='absolute inset-0 grid' style={{gridTemplateColumns: 'repeat(' + buckets.length + ', minmax(0, 1fr))'}}>
          {buckets.map((bucket, i) => <div key={bucket.key} className='relative min-w-0'>
            {series[i].map(mark => <ChartMark key={mark.kind} mark={mark} bucket={bucket} axis={axis} slot={kinds.indexOf(mark.kind)} slots={kinds.length}
              onChoose={onChoose} />)}
          </div>)}
        </div>
      </div>
    </section>
  )
}

function PeriodSummary({bucket, grain}) {
  return <dl aria-label={'Synthèse de la période · ' + bucket.label} className='mb-3 flex flex-wrap gap-x-5 gap-y-1.5 border-b border-[var(--border-default-grey)] pb-2 text-sm'>
    {bucket.panels.map(panel => panel.marks.map(mark => {
      const meter = panel.meter && bucket.panels.some(other => other !== panel && other.indexes === panel.indexes)
      const label = mark.kind === 'index' ? (grain === 'month' ? 'Dernier index du mois' : 'Dernier index de la période')
        : mark.kind === 'computed' ? 'Total des volumes calculés' : 'Total des volumes télérelevés'
      return <div key={panel.key + '-' + mark.kind} className='flex flex-wrap items-baseline gap-x-1.5'>
        <dt className='text-xs text-[var(--text-mention-grey)]'>{label}{meter ? ' · ' + panel.meter : ''}</dt>
        <dd className='m-0 font-semibold tabular-nums' style={{color: colors[mark.kind]}}>{mark.amount == null ? 'Indisponible' : formatTelemetryAmount(mark.value)}</dd>
      </div>
    }))}
  </dl>
}

function PeriodAxis({buckets}) {
  const labels = new Set(Array.from({length: Math.min(4, buckets.length)}, (_, i) =>
    Math.round(i * (buckets.length - 1) / Math.max(1, Math.min(3, buckets.length - 1)))))
  return <div aria-hidden='true' className='ml-12 grid pb-2 text-center text-[0.65rem] leading-tight text-[var(--text-mention-grey)] sm:ml-16 sm:text-xs'
    style={{gridTemplateColumns: 'repeat(' + buckets.length + ', minmax(0, 1fr))'}}>
    {buckets.map((bucket, i) => <span key={bucket.key} title={bucket.label} className={labels.has(i) ? '' : 'invisible sm:visible'}>{bucket.shortLabel}</span>)}
  </div>
}

function OverviewScope({buckets}) {
  const ranges = []
  const positions = new Map()
  for (const [index, bucket] of buckets.entries()) {
    positions.set(bucket.start, 100 * index / buckets.length)
    positions.set(bucket.end, 100 * (index + 1) / buckets.length)
    if (!bucket.panels.some(panel => panel.rows.length)) continue
    const previous = ranges.at(-1)
    if (previous?.end === bucket.start) previous.end = bucket.end
    else ranges.push({start: bucket.start, end: bucket.end})
  }
  return <div className='ml-12 sm:ml-16'>
    <ReadingScope ranges={ranges} position={ms => positions.get(ms)} label='Périodes du reçu' />
  </div>
}

export default function TelemetryReadingOverview({panels, overview, selectedBucket, onSelectBucket, renderDetail}) {
  const select = useRef(null)
  const {buckets, grain} = overview
  const plotted = selectedBucket?.panels.reduce((total, panel) => total + panel.rows.length, 0)
  const crossesStart = selectedBucket?.panels.some(panel => !panel.indexes &&
    panel.marks.some(mark => Date.parse(mark.start) < selectedBucket.start))
  const choose = bucket => {
    onSelectBucket(bucket)
    select.current?.focus({preventScroll: true})
  }
  return <div data-telemetry-overview='' className='min-w-0'>
    <div className='mb-3 flex flex-wrap items-center gap-x-4 gap-y-2'>
      <label className='flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 text-sm'>
        Période affichée
        <span className='relative inline-flex min-w-0 max-w-full'>
          <select ref={select} value={selectedBucket?.key ?? ''} onChange={event => onSelectBucket(buckets.find(bucket => bucket.key === event.target.value) ?? null)}
            className='max-w-full cursor-pointer appearance-none rounded-sm border border-[var(--border-default-grey)] bg-[var(--background-default-grey)] py-1 pr-7 pl-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-action-high-blue-france)]'>
            <option value=''>Toute la période</option>
            {buckets.toReversed().map(bucket => <option key={bucket.key} value={bucket.key} disabled={!bucket.panels.some(panel => panel.rows.length)}>{bucket.label}</option>)}
          </select>
          <span aria-hidden='true' className='fr-icon-arrow-down-s-line fr-icon--sm pointer-events-none absolute inset-y-0 right-1.5 inline-flex items-center' />
        </span>
      </label>
      {selectedBucket && <span className='text-xs text-[var(--text-mention-grey)]'>{plotted} {plotted > 1 ? 'mesures sur le graphe' : 'mesure sur le graphe'}</span>}
      {selectedBucket && <button type='button' className='fr-btn fr-btn--tertiary-no-outline fr-btn--sm' onClick={() => choose(null)}>Vue d’ensemble</button>}
    </div>
    {selectedBucket ? <>
      <PeriodSummary bucket={selectedBucket} grain={grain} />
      {crossesStart && <p className='mb-2 text-xs text-[var(--text-mention-grey)]'>Le total inclut les volumes dont la période se termine sur cet intervalle.</p>}
      {renderDetail(selectedBucket.panels.filter(panel => panel.rows.length), selectedBucket)}
    </> : <>
      <OverviewScope buckets={buckets} />
      {panels.map((panel, index) => <OverviewPanel key={panel.key} panel={panel} panelIndex={index} buckets={buckets} grain={grain}
        showMeter={panels.some(other => other !== panel && other.indexes === panel.indexes)} onChoose={choose} />)}
      <PeriodAxis buckets={buckets} />
    </>}
  </div>
}
