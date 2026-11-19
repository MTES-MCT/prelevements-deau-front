import {useEffect, useId, useRef, useState} from 'react'

import QuickReadingDetails from '@/components/declarations/quick-reading-details.js'
import ReadingLegend from '@/components/declarations/reading-legend.js'
import ReadingSummary from '@/components/declarations/quick-reading-timeline.js'
import useReadingLabels from '@/components/declarations/use-reading-labels.js'
import {buildQuickReadingChart, getIndexIntervalBounds, indexReadingsByDay, quickReadingContextLabel} from '@/lib/quick-reading-chart.js'
import {getReadingMarkRange, getReadingScopeRanges} from '@/lib/reading-scope.js'

const blue = 'var(--text-action-high-blue-france, #000091)'
const teal = 'var(--text-label-green-emeraude, #297254)'
const ochre = 'var(--text-label-brown-caramel, #845d48)'
const muted = 'var(--text-mention-grey, #666)'
const grid = 'var(--border-default-grey, #ddd)'
const numberFormat = new Intl.NumberFormat('fr-FR', {maximumFractionDigits: 30})
const dayFormat = new Intl.DateTimeFormat('fr-FR', {timeZone: 'UTC'})
const monthFormat = new Intl.DateTimeFormat('fr-FR', {month: 'short', timeZone: 'UTC'})
const axisDateFormat = new Intl.DateTimeFormat('fr-FR', {day: 'numeric', month: 'short', timeZone: 'UTC'})
const dayLabel = day => dayFormat.format(new Date(day))
const exactNumber = value => numberFormat.format(typeof value === 'string' ? value.replaceAll(/\s/g, '').replace(',', '.') : value)
const amountLabel = row => exactNumber(row.value.value) + ' ' + (row.value.unit || 'm³')
const periodLabel = row => row.start === row.end ? 'Le ' + dayLabel(row.end) : 'Du ' + dayLabel(row.start) + ' au ' + dayLabel(row.end)

function volumeCeiling(maximum) {
  if (!maximum) return 1
  const scale = 10 ** Math.floor(Math.log10(maximum))
  return Math.ceil(maximum / scale) * scale
}

function dateTicks(days, x, end) {
  const ticks = []
  for (const day of days) {
    if (!ticks.length || (x(day) - x(ticks.at(-1)) >= 78 && end - x(day) >= 78)) ticks.push(day)
  }
  if (days.length > 1) ticks.push(days.at(-1))
  return ticks
}

function timelineTicks(days, x, right) {
  const first = new Date(days[0])
  const last = new Date(days.at(-1))
  if ((last - first) / 86400000 < 70) {
    return dateTicks(days, x, right).map(day => ({day, label: axisDateFormat.format(new Date(day))}))
  }
  const months = []
  const crossesYear = first.getUTCFullYear() !== last.getUTCFullYear()
  const cursor = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1))
  if (cursor < first) cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  let previousRight = -Infinity
  while (cursor <= last) {
    const day = cursor.toISOString().slice(0, 10)
    const year = crossesYear && months.at(-1)?.day.slice(0, 4) !== day.slice(0, 4) ? ' ' + day.slice(0, 4) : ''
    const label = monthFormat.format(cursor) + year
    const labelWidth = label.length * 7
    const position = x(day)
    const offset = position < x(days[0]) + 28 ? 0 : position > right - 28 ? labelWidth : labelWidth / 2
    if (position - offset >= previousRight + 8) {
      months.push({day, label})
      previousRight = position - offset + labelWidth
    }
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  }
  return months
}

function indexScale(indexes, top, bottom) {
  const values = indexes.map(row => row.amount)
  const low = Math.min(...values)
  const high = Math.max(...values)
  if (low === high || !values.length) return {ticks: values.length ? [low] : [], y: () => (top + bottom) / 2}

  const targetStep = (high - low) / 4
  const power = 10 ** Math.floor(Math.log10(targetStep))
  const step = power * ([1, 2, 2.5, 5, 10].find(factor => factor * power >= targetStep) ?? 10)
  const first = Math.floor(low / step) * step
  const last = Math.ceil(high / step) * step
  const ticks = Array.from({length: Math.round((last - first) / step) + 1}, (_, i) => Number((first + step * i).toPrecision(15)))
  return {ticks: [...new Set(ticks)], y: value => bottom - (value - first) / (last - first) * (bottom - top)}
}

const compactNumber = new Intl.NumberFormat('fr-FR', {notation: 'compact', maximumFractionDigits: 2})
const axisNumber = n => Math.abs(n) >= 1_000_000 ? compactNumber.format(n) : numberFormat.format(n)
const paper = 'var(--background-default-grey, #fff)'
const ink = 'var(--text-default-grey, #242424)'

function uncoveredPeriods(first, last, intervals) {
  if (!intervals.length) return []
  const gaps = []
  let coveredUntil = first
  for (const row of [...intervals].sort((a, b) => a.start.localeCompare(b.start))) {
    const {start, end} = getReadingMarkRange(row)
    if (start > coveredUntil) gaps.push([coveredUntil, start])
    coveredUntil = Math.max(coveredUntil, end)
  }
  if (last > coveredUntil) gaps.push([coveredUntil, last])
  return gaps
}

function GridLine({left, right, y, label}) {
  return (
    <g>
      <line data-label-bounds='' x1={left} x2={right} y1={y} y2={y} stroke={grid} strokeDasharray='3 5' />
      {label != null && <text x={left - 10} y={y + 4} textAnchor='end' fill={muted}>{label}</text>}
    </g>
  )
}

function VolumeMark({row, active, x, baseline, barHeight, maxVolume, stripeId, interaction}) {
  const start = x(row.start)
  const span = Math.max(2, x(getReadingMarkRange(row).end) - start)
  const height = row.amount === 0 ? 0 : Math.max(1, row.amount / maxVolume * barHeight)
  const top = baseline - height
  const color = row.direct ? ochre : teal
  const label = amountLabel(row)
  const inside = height > 22 && span >= label.length * 7 + 14
  const attrs = {'data-mark': 'volume', 'data-start': row.start, 'data-end': row.end, 'data-value': row.value.value}
  return (
    <g {...interaction}>
      <rect x={start + span / 2 - Math.max(24, span) / 2} y={top - 8} width={Math.max(24, span)} height={Math.max(24, height + 16)} fill='transparent' />
      {row.amount === 0
        ? <line {...attrs} x1={start} x2={start + span} y1={baseline} y2={baseline} stroke={color} strokeWidth={active ? 3.5 : 2.5} strokeDasharray='5 3' />
        : <>
          <rect {...attrs} x={start} y={top} width={span} height={height} fill={color} fillOpacity={active ? 0.25 : 0.12} stroke={color} strokeOpacity={active ? 1 : 0.7} strokeWidth={active ? 2 : 1} />
          {!row.direct && <rect x={start} y={top} width={span} height={height} fill={`url(#${stripeId})`} pointerEvents='none' />}
        </>}
      <text data-label-candidate='' aria-hidden='true' x={start + span / 2} y={inside ? (baseline + top) / 2 + 4 : top - 6}
        textAnchor='middle' fill={ink} fontWeight={active ? '750' : '600'} paintOrder='stroke' stroke={paper} strokeWidth='2.5' strokeLinejoin='round'
        className='pointer-events-none invisible data-[reading-label]:visible' style={{transform: 'translateX(var(--label-shift, 0px))'}}>{label}</text>
    </g>
  )
}

export default function QuickReadingChart({replaced, ...props}) {
  if (!replaced) return <ActiveQuickReadingChart {...props} />
  return (
    <>
      <p className='mb-2 text-sm'>Ce lot a été remplacé.</p>
      <QuickReadingDetails replaced marks={[]} readings={props.readings} volumes={props.volumes} declared={props.declared}
        volumeLabel={props.volumeLabel} dayLabel={dayLabel} amountLabel={amountLabel} />
    </>
  )
}

function ActiveQuickReadingChart({readings, history, volumes, volumeHistory, following, volumeLabel, declared = false}) {
  const {indexes, intervals} = buildQuickReadingChart({readings, history, volumes, volumeHistory, following, declared})
  const marks = [...indexes, ...intervals].sort((a, b) => a.day.localeCompare(b.day))
  const days = [...new Set([...indexes.map(point => point.day), ...intervals.flatMap(row => [row.start, row.end])])].sort()
  const [selected, setSelected] = useState(null)
  const [width, setWidth] = useState(680)
  const indexPlot = useReadingLabels(indexes, width, selected)
  const volumePlot = useReadingLabels(intervals, width, selected)
  const frame = useRef(null)
  const id = useId()
  useEffect(() => {
    const element = frame.current
    if (!element) return undefined
    const resize = () => setWidth(Math.max(180, Math.round(element.getBoundingClientRect().width)))
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const active = marks.find(row => row.key === selected)
  const current = marks.filter(row => row.current)
  const focus = current.at(-1)
  const summary = Boolean(focus) && indexes.length <= 2 && intervals.length <= 2 && (marks.length <= 2 || (indexes.length === 2 && intervals.length === 1))
  const endpoints = indexReadingsByDay(indexes)
  const selectedPair = active?.start ? getIndexIntervalBounds(active, endpoints) : null
  const fallingIndex = focus?.start && !focus.direct && endpoints.get(focus.start)?.amount > endpoints.get(focus.end)?.amount
  const hasIndex = indexes.length > 0
  const hasVolumes = intervals.length > 0
  const volumeUnits = new Set(intervals.map(row => row.value.unit || 'm³'))
  const volumeUnit = intervals[0]?.value.unit || 'm³'
  const volumeAxisUnit = volumeUnits.size === 1 ? ' (' + volumeUnit + ')' : ''
  const volumeTick = value => axisNumber(value) + ' ' + volumeUnit
  const showVolumeScale = volumeUnits.size === 1
  const headingHeight = focus ? 20 : 0
  const axisTitleY = focus ? headingHeight + 24 : 14
  const top = axisTitleY + 19
  const flatIndex = indexes.every(row => row.amount === indexes[0].amount)
  const indexBottom = top + (flatIndex ? 38 : width < 550 ? 98 : 116)
  const {ticks, y} = indexScale(indexes, top, indexBottom)
  const maxVolume = volumeCeiling(Math.max(0, ...intervals.map(row => row.amount)))
  const hasPositiveVolume = intervals.some(row => row.amount > 0)
  const barHeight = hasPositiveVolume ? (width < 550 ? 75 : 94) : 30
  const barTop = hasIndex ? indexBottom + 52 : top
  const barBaseline = barTop + barHeight
  const bottom = hasVolumes ? barBaseline : indexBottom
  const labels = [...(indexes.length === 1 ? [] : ticks.map(axisNumber)), ...(showVolumeScale ? [volumeTick(maxVolume)] : [])]
  const left = Math.max(32, ...labels.map(label => Math.min(width * 0.3, 12 + label.length * 7)))
  const right = width - 13
  const first = Date.parse(days[0])
  const last = intervals.reduce((end, row) => Math.max(end, getReadingMarkRange(row).end), Date.parse(days.at(-1)))
  const x = day => first === last ? (left + right) / 2 : left + ((typeof day === 'number' ? day : Date.parse(day)) - first) / (last - first) * (right - left)
  const visibleTicks = days.length ? timelineTicks(days, x, right) : []
  const gaps = uncoveredPeriods(first, last, intervals)
  const title = declared && !hasIndex ? 'Volumes déclarés' : 'Index et volumes'
  const baseVolumeName = volumeLabel.replace(/ (calculé|déclaré)$/, '')
  const volumeName = row => baseVolumeName + (row.direct ? ' déclaré' : ' calculé')
  const description = row => row.start ? `${volumeName(row)} · ${periodLabel(row)} · ${amountLabel(row)}` : `Index du ${dayLabel(row.day)} · ${amountLabel(row)}`
  const hasDirect = intervals.some(row => row.direct)
  const hasComputed = intervals.some(row => !row.direct)
  const noCalculated = !declared && !intervals.some(row => row.current && !row.direct)
  const ranges = getReadingScopeRanges(marks)
  const widest = ranges.reduce((best, range) => !best || range.end - range.start >= best.end - best.start ? range : best, null)
  const markerLabelX = widest && Math.max(55, Math.min(width - 55, x((widest.start + widest.end) / 2)))
  const markerColor = 'var(--text-title-blue-france, #000091)'
  const tooltipWidth = Math.min(220, width - 4)
  const activeX = active && (active.start ? (x(active.start) + x(active.end)) / 2 : x(active.day))
  const activeY = active && (active.start ? barBaseline - (maxVolume ? active.amount / maxVolume * barHeight : 0) : y(active.amount))
  const tooltipTop = active && (activeY - headingHeight > 90 ? activeY - 9 : activeY + 12)
  const interaction = row => ({
    'data-key': row.key,
    'data-current': row.current,
    'data-scope': row.scope,
    role: 'button',
    tabIndex: 0,
    'aria-label': description(row) + ' · ' + quickReadingContextLabel(row),
    'aria-pressed': active === row,
    'aria-describedby': active === row ? id + '-tooltip' : undefined,
    style: {cursor: 'pointer'},
    onClick: () => setSelected(row.key),
    onFocus: () => setSelected(row.key),
    onBlur: () => setSelected(null),
    onKeyDown: event => {
      if (event.key === 'Escape') setSelected(null)
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        setSelected(row.key)
      }
    }
  })

  return (
    <figure aria-label={title} className='m-0 min-w-0'>
      {focus && <ReadingSummary marks={summary ? marks : [focus]} volumeLabel={volumeLabel} formatAmount={amountLabel} compactTimeline={summary} />}
      {marks.length > 0 && !summary && <div className='mb-1 mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-[var(--border-default-grey)] pt-3 text-xs font-medium sm:text-sm'>
        {hasIndex && <ReadingLegend type='index'>Index du compteur</ReadingLegend>}
        {hasComputed && <ReadingLegend type='computed'>{baseVolumeName} calculé</ReadingLegend>}
        {hasDirect && <ReadingLegend type='direct'>{baseVolumeName === 'Volume rejeté' ? 'Volume de rejet saisi' : 'Volume saisi'}</ReadingLegend>}
      </div>}
      <div ref={frame} className='relative w-full'>
        {!summary && days.length > 0 && (
          <svg role='group' aria-labelledby={id} viewBox={`0 0 ${width} ${bottom + 33}`} height={bottom + 33} className='block w-full tabular-nums'>
            <title id={id}>{title + ' au fil du temps, en mètres cubes'}</title>
            <defs>
              <pattern id={id + '-stripe'} width='7' height='7' patternUnits='userSpaceOnUse'>
                <path d='M-2,2 L2,-2 M0,7 L7,0 M5,9 L9,5' fill='none' stroke={teal} strokeWidth='0.9' opacity='0.38' />
              </pattern>
            </defs>
            <g fontSize='12' fill={muted}>
              {widest && <g data-reading-scope='' pointerEvents='none' fill={markerColor}>
                {ranges.map(({start, end}) => <g key={start}>
                  <path data-scope-range='' data-start={start} data-end={end}
                    d={start === end ? `M${x(start) - 3} ${headingHeight + 1}h6m-3 0v6` : `M${x(start)} ${headingHeight + 8}v-7H${x(end)}v7`}
                    fill='none' stroke={markerColor} strokeWidth='2' />
                  {[...new Set([start, end])].map(ms => <line key={ms} x1={x(ms)} x2={x(ms)} y1={top} y2={bottom}
                    stroke={markerColor} strokeDasharray='3 4' opacity='0.28' />)}
                </g>)}
                <text x={markerLabelX} y='12' textAnchor='middle' fontWeight='750'>Cette déclaration</text>
              </g>}
              {visibleTicks.map(({day, label}) => <g key={day}>
                {hasIndex && <line x1={x(day)} x2={x(day)} y1={top} y2={indexBottom} stroke={grid} strokeOpacity='0.4' />}
                {hasVolumes && <line x1={x(day)} x2={x(day)} y1={barTop} y2={barBaseline} stroke={grid} strokeOpacity='0.4' />}
                <text x={x(day)} y={bottom + 22} textAnchor={days.length === 1 ? 'middle' : x(day) < left + 28 ? 'start' : x(day) > right - 28 ? 'end' : 'middle'}>{label}</text>
              </g>)}
              {hasIndex && <g ref={indexPlot} role='group' aria-label='Index du compteur' data-panel='indexes'>
                <text x={left} y={axisTitleY} fontWeight='600'>Index (m³)</text>
                {ticks.map(tick => <GridLine key={tick} left={left} right={right} y={y(tick)} label={indexes.length === 1 ? null : axisNumber(tick)} />)}
                {indexes.slice(1).map((row, i) => {
                  const previous = indexes[i]
                  if (!endpoints.get(previous.day) || !endpoints.get(row.day) || row.amount < previous.amount
                    || (row.value.unit ?? 'm³') !== (previous.value.unit ?? 'm³')) return null
                  return <line key={row.key} data-index-connection='' x1={x(previous.day)} y1={y(previous.amount)} x2={x(row.day)} y2={y(row.amount)} stroke={blue} opacity='0.6' strokeWidth='1.5' pointerEvents='none' />
                })}
                {indexes.map(row => {
                  const chosen = row.current || active === row || row === selectedPair?.start || row === selectedPair?.end
                  const indexY = y(row.amount)
                  return <g key={row.key} {...interaction(row)}>
                    <circle cx={x(row.day)} cy={y(row.amount)} r='13' fill='transparent' />
                    {chosen && <circle cx={x(row.day)} cy={y(row.amount)} r='9' fill={blue} fillOpacity='0.12' />}
                    <circle data-mark='index' data-day={row.day} data-value={row.value.value} cx={x(row.day)} cy={y(row.amount)} r={chosen ? 4.8 : 3.8} fill={chosen ? blue : paper} stroke={blue} strokeWidth='2' />
                    <text data-label-candidate='' aria-hidden='true' x={x(row.day)} y={indexY < top + 9 ? indexY + 17 : indexY - 9}
                      textAnchor='middle' fontWeight={chosen ? '700' : '550'} fill={blue} stroke={paper} strokeWidth='3' paintOrder='stroke'
                      className='pointer-events-none invisible data-[reading-label]:visible' style={{transform: 'translateX(var(--label-shift, 0px))'}}>{amountLabel(row)}</text>
                  </g>
                })}
              </g>}
              {hasVolumes && <g ref={volumePlot} role='group' aria-label='Volumes par période' data-panel='volumes'>
                <text data-label-obstacle='' x={left} y={barTop - 19} fontWeight='600'>{'Volumes par période' + volumeAxisUnit}</text>
                <GridLine left={left} right={right} y={barBaseline} label={showVolumeScale ? volumeTick(0) : null} />
                {showVolumeScale && hasPositiveVolume && <GridLine left={left} right={right} y={barTop} label={volumeTick(maxVolume)} />}
                {gaps.map(([start, end]) => {
                  const span = x(end) - x(start)
                  if (span < 36) return null
                  const center = (x(start) + x(end)) / 2
                  const narrow = span < 130
                  const short = span < 78
                  const directOnly = hasDirect && !hasComputed
                  const firstLine = short ? 'Sans' : 'Aucun volume'
                  const secondLine = short ? (directOnly ? 'saisie' : 'volume') : (directOnly ? 'saisi' : 'renseigné')
                  return <text key={start} data-volume-gap='' data-start={start} data-end={end} x={center} y={barBaseline - (narrow ? 24 : 14)} textAnchor='middle' fontSize='11' fontStyle='italic'>
                    {firstLine}<tspan x={narrow ? center : undefined} dy={narrow ? 13 : 0}>{' ' + secondLine}</tspan>
                  </text>
                })}
                {intervals.map(row => <VolumeMark key={row.key} row={row} active={active === row || row.current} x={x} baseline={barBaseline} barHeight={barHeight} maxVolume={maxVolume} stripeId={id + '-stripe'} interaction={interaction(row)} />)}
              </g>}
            </g>
          </svg>
        )}
        {!summary && active && <div id={id + '-tooltip'} role='tooltip' className='pointer-events-none absolute z-10 rounded border border-[var(--border-default-grey)] bg-[var(--background-default-grey)] px-2.5 py-1.5 text-sm leading-tight shadow-sm'
          style={{width: 'max-content', maxWidth: tooltipWidth, left: Math.max(2, Math.min(width - tooltipWidth - 2, activeX - tooltipWidth / 2)), top: tooltipTop, transform: activeY - headingHeight > 90 ? 'translateY(-100%)' : undefined}}>
          <strong className='block'>{active.start ? volumeName(active) : 'Index relevé'} · {amountLabel(active)}</strong>
          <span>{active.start ? periodLabel(active) : dayLabel(active.day)} · {quickReadingContextLabel(active)}</span>
        </div>}
      </div>
      {fallingIndex && <p className='fr-text--sm fr-mb-1v'>L’index a diminué entre ces deux relevés.{!summary && ' Le volume calculé se lit sur l’échelle des volumes.'}</p>}
      {noCalculated && <p className='fr-text--sm fr-mb-1v'>{indexes.length === 1 ? 'Deux relevés d’index sont nécessaires pour calculer le volume sur une période.' : 'Aucun volume calculé actif pour ce relevé.'}</p>}
      {declared && !intervals.some(row => row.current) && <p className='fr-text--sm fr-mb-1v'>Volume non renseigné.</p>}
      <QuickReadingDetails marks={marks} readings={readings} history={history} volumes={volumes} declared={declared} volumeLabel={volumeLabel}
        dayLabel={dayLabel} amountLabel={amountLabel} />
    </figure>
  )
}
