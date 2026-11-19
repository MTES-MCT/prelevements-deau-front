import {useId, useState} from 'react'

import useReadingLabels from '@/components/declarations/use-reading-labels.js'
import ReadingScope from '@/components/declarations/reading-scope.js'
import {quickReadingContextLabel} from '@/lib/quick-reading-chart.js'
import {getReadingMarkRange, getReadingScopeRanges} from '@/lib/reading-scope.js'

const dayMs = 86_400_000
const monday = Date.UTC(1970, 0, 5)
const fullDate = new Intl.DateTimeFormat('fr-FR', {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'})
const monthName = new Intl.DateTimeFormat('fr-FR', {month: 'short', timeZone: 'UTC'})
const weekName = new Intl.DateTimeFormat('fr-FR', {day: '2-digit', month: '2-digit', timeZone: 'UTC'})
const fullDayLabel = day => fullDate.format(new Date(day)).replace(/^1 /, '1er ')
const blue = 'var(--text-action-high-blue-france, #000091)'
const muted = 'var(--text-mention-grey, #666)'
const scales = {week: 'Semaine', month: 'Mois', year: 'Année'}
const columns = 'grid grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)] gap-x-3 sm:grid-cols-[minmax(15rem,0.85fr)_minmax(0,1.15fr)] sm:gap-x-6'
const telemetryColumns = 'grid grid-cols-1 gap-x-3 min-[30rem]:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)] sm:grid-cols-[minmax(15rem,32%)_minmax(0,1fr)] sm:gap-x-6 xl:grid-cols-[minmax(15rem,23rem)_minmax(0,1fr)]'

function ReadingDates({row}) {
  if (row.timeLabel) return row.timeLabel
  if (!row.start || row.start === row.end) return <>le <time dateTime={row.day}>{fullDayLabel(row.day)}</time></>
  const sameMonth = row.start.slice(0, 7) === row.end.slice(0, 7)
  const dayOfMonth = Number(row.start.slice(8))
  const startText = sameMonth ? (dayOfMonth === 1 ? '1er' : String(dayOfMonth)) : fullDayLabel(row.start)
  return <>du <time dateTime={row.start}>{startText}</time> au <time dateTime={row.end}>{fullDayLabel(row.end)}</time></>
}

function periodIndex(date, scale) {
  if (scale === 'week') return Math.floor((date - monday) / (7 * dayMs))
  const year = date.getUTCFullYear()
  return scale === 'month' ? year * 12 + date.getUTCMonth() : year
}

function periodBoundary(index, scale) {
  if (scale === 'week') return monday + index * 7 * dayMs
  if (scale === 'month') return Date.UTC(Math.floor(index / 12), index % 12, 1)
  return Date.UTC(index, 0, 1)
}

function buildCalendar(first, last, scale) {
  const startCell = periodIndex(first, scale) - 1
  const endCell = periodIndex(last, scale) + 2
  const start = periodBoundary(startCell, scale)
  const end = periodBoundary(endCell, scale)
  const position = ms => 100 * (ms - start) / (end - start)
  const cells = []
  const stride = Math.max(1, Math.ceil((endCell - startCell) / 12))
  for (let cell = startCell; cell < endCell; cell += stride) {
    const date = new Date(periodBoundary(cell, scale))
    const left = position(date)
    const right = position(periodBoundary(Math.min(endCell, cell + stride), scale))
    const label = scale === 'year' ? String(date.getUTCFullYear()) : (scale === 'month' ? monthName : weekName).format(date)
    cells.push({left, center: (left + right) / 2, label, date})
  }
  return {cells, position}
}

const teal = 'var(--text-label-green-emeraude, #297254)'
const ochre = 'var(--text-label-brown-caramel, #845d48)'
const dayFormat = new Intl.DateTimeFormat('fr-FR', {timeZone: 'UTC'})

function measureName(row, discharge) {
  if (row.name) return row.name
  if (!row.start) return 'Index du compteur'
  if (row.direct) return discharge ? 'Volume de rejet saisi' : 'Volume saisi'
  return discharge ? 'Volume rejeté calculé' : 'Volume prélevé calculé'
}

function MeasureText({row, name, formatAmount, showKind = true, selectProps, context = quickReadingContextLabel(row)}) {
  const content = <>
    {(context || showKind) && <span className='block text-xs leading-snug'>
      {context && <span className='font-semibold' style={{color: row.current ? blue : muted}}>{context}</span>}
      {showKind && <>{context && ' · '}<span style={{color: row.start ? (row.direct ? ochre : teal) : blue}}>{name}</span></>}
      {!showKind && context && <span className='sr-only'>{' · ' + name}</span>}
    </span>}
    <span className='flex flex-wrap items-baseline gap-x-2 text-sm leading-snug'>
      <strong className={'max-w-full tabular-nums [overflow-wrap:anywhere] ' + (row.current ? 'text-lg' : 'text-base')}>{formatAmount(row)}</strong>
      <span><ReadingDates row={row} /></span>
    </span>
  </>
  return <li data-current={row.current} data-value={row.value.value} data-day={row.start ? undefined : row.day} data-start={row.start} data-end={row.end}>
    {selectProps ? <button type='button' {...selectProps} className='block w-full cursor-pointer py-1 text-left hover:bg-[var(--background-alt-grey)] focus-visible:outline-2'>{content}</button> : content}
  </li>
}

export function CalendarPanel({rows, indexes, calendar, discharge, formatAmount, panelLabel}) {
  const [selection, setSelection] = useState(null)
  const plotRef = useReadingLabels(rows, calendar, selection)
  const id = useId()
  const selected = rows.find(row => row.key === selection)
  const title = panelLabel ?? (indexes ? 'Index du compteur' : 'Volumes par période')
  const colorOf = row => indexes ? blue : row.direct ? ochre : teal
  const min = rows.reduce((low, row) => Math.min(low, row.amount), Infinity)
  const max = rows.reduce((high, row) => Math.max(high, row.amount), -Infinity)
  const indexY = row => max === min ? 58 : 76 - 39 * (row.amount - min) / (max - min)
  const x = day => calendar.position(Date.parse(day))
  const latest = rows.at(-1)
  const dense = calendar.exactTimes && rows.length > 2
  const summary = dense ? [selected ?? latest] : [...rows].reverse()
  if (!calendar.exactTimes) summary.sort((a, b) => Number(b.current) - Number(a.current))
  let context
  if (calendar.exactTimes) {
    context = null
    if (dense) {
      if (indexes) context = selected ? 'Index sélectionné' : 'Dernier index relevé'
      else context = selected ? 'Période sélectionnée' : 'Dernière période mesurée'
    }
  }
  const interaction = row => ({
    'aria-pressed': selected === row,
    'aria-describedby': selected === row ? id + '-tip' : undefined,
    onFocus: () => setSelection(row.key), onClick: () => setSelection(row.key), onBlur: () => setSelection(null),
    onKeyDown: event => {if (event.key === 'Escape') setSelection(null)}
  })
  const dateText = row => row.timeLabel ?? (row.start && row.start !== row.end
    ? 'Du ' + dayFormat.format(new Date(row.start)) + ' au ' + dayFormat.format(new Date(row.end))
    : dayFormat.format(new Date(row.day)))
  return <section data-panel={indexes ? 'indexes' : 'volumes'} aria-labelledby={id}
    className={(calendar.exactTimes ? telemetryColumns : columns) + ' border-b border-[var(--border-default-grey)]'}>
    <div className='py-2.5'>
      <h4 id={id} className='m-0 mb-1 text-sm font-semibold leading-tight'>{title}{dense && <span className='font-normal'> · {rows.length} {indexes ? 'index' : 'volumes'}</span>}</h4>
      <ul aria-label={title} className='m-0 grid list-none gap-1.5 p-0'>
        {summary.map(row => <MeasureText key={row.key} row={row} name={measureName(row, discharge)} context={context} showKind={!indexes} formatAmount={formatAmount} selectProps={!dense && rows.length > 1 ? interaction(row) : undefined} />)}
      </ul>
    </div>
    <div ref={plotRef} data-time-plot='' className='relative min-h-[5.25rem] self-stretch border-x border-[var(--border-default-grey)]'>
      {calendar.cells.slice(1).map(cell => <span aria-hidden='true' key={cell.left} className='absolute inset-y-0 border-l border-dashed border-[var(--border-default-grey)]' style={{left: cell.left + '%'}} />)}
      {!indexes && <span aria-hidden='true' className='absolute inset-x-0 bottom-[16%] border-t border-[var(--border-default-grey)]' />}
      {indexes && rows.length > 1 && <svg aria-hidden='true' className='pointer-events-none absolute inset-0 h-full w-full' viewBox='0 0 100 100' preserveAspectRatio='none'>
        {rows.map((row, i) => {
          const previous = rows[i - 1]
          if (!previous || previous.day >= row.day || previous.amount > row.amount ||
            (calendar.exactTimes && previous.amount === row.amount && String(previous.value.value) !== String(row.value.value)) ||
            previous.day === rows[i - 2]?.day || row.day === rows[i + 1]?.day ||
            (previous.unit ?? previous.value.unit ?? 'm³') !== (row.unit ?? row.value.unit ?? 'm³')) return null
          return <line key={row.key} data-index-link='' x1={x(previous.day)} x2={x(row.day)} y1={indexY(previous)} y2={indexY(row)}
            stroke={blue} strokeOpacity='0.55' strokeWidth='1.5' vectorEffect='non-scaling-stroke' />
        })}
      </svg>}
      {rows.map((row, i) => {
        const range = getReadingMarkRange(row, calendar)
        const start = calendar.position(range.start)
        const end = calendar.position(range.end)
        const height = !indexes && max > 0 ? 45 * row.amount / max : 0
        const color = colorOf(row)
        const name = measureName(row, discharge)
        const fill = 'color-mix(in srgb, ' + color + (row.current ? ' 27%' : ' 12%') + ', var(--background-default-grey))'
        const data = {'data-mark': indexes ? 'index' : 'volume', 'data-calendar-mark': indexes ? 'reading' : 'period', 'data-current': row.current,
          'data-scope': row.scope, 'data-value': row.value.value, 'data-day': indexes ? row.day : undefined, 'data-start': row.start, 'data-end': row.end}
        const gap = indexes ? Math.min(i ? start - x(rows[i - 1].day) : Infinity, i + 1 < rows.length ? x(rows[i + 1].day) - start : Infinity) : 0
        const hitWidth = gap > 0 && Number.isFinite(gap) ? 'min(24px, ' + gap + '%)' : 24
        const smallDot = calendar.exactTimes && rows.length > 8 && row !== selected
        const dotSize = smallDot ? 5 : row.current ? 11 : 9
        return <button type='button' key={row.key} {...data} data-kind={row.kind} aria-label={name + ' · ' + dateText(row) + ' · ' + formatAmount(row) + (calendar.exactTimes ? '' : ' · ' + quickReadingContextLabel(row))}
          {...interaction(row)}
          className='absolute cursor-pointer p-0'
          style={indexes ? {left: start + '%', top: indexY(row) + '%', transform: 'translate(-50%, -50%)', width: hitWidth, height: 24}
            : {left: start + '%', bottom: '16%', width: (end - start) + '%', height: height + '%', minWidth: calendar.exactTimes && rows.length > 14 ? 1 : 3, minHeight: 8}}>
          <span aria-hidden='true' className='pointer-events-none absolute'
            style={indexes ? {left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: dotSize, height: dotSize, borderRadius: '50%',
              border: '2px solid ' + color, background: row.current ? color : 'var(--background-default-grey)', boxShadow: row.current && !smallDot ? '0 0 0 3px color-mix(in srgb, ' + color + ' 16%, transparent)' : undefined}
              : {inset: row.amount === 0 ? 'auto 0 0' : 0, border: row.amount === 0 ? undefined : '1.5px solid ' + color, borderBottom: row.amount === 0 ? '3px dashed ' + color : undefined,
                background: row.direct ? fill : 'repeating-linear-gradient(-45deg, ' + fill + ', ' + fill + ' 3px, ' + color + ' 3px, ' + color + ' 4px)'}} />
          <span data-label-candidate='' aria-hidden='true'
            className='pointer-events-none invisible absolute bottom-full left-1/2 mb-0.5 w-max max-w-0 overflow-hidden whitespace-nowrap text-xs font-semibold tabular-nums data-[reading-label]:visible data-[reading-label]:max-w-none'
            style={{color, transform: 'translateX(calc(-50% + var(--label-shift, 0px)))'}}>{formatAmount(row)}</span>
        </button>
      })}
      {selected && <div role='tooltip' id={id + '-tip'} className='pointer-events-none absolute right-0 bottom-full z-10 w-max max-w-[min(15rem,80vw)] border border-[var(--border-default-grey)] bg-[var(--background-default-grey)] px-2 py-1 text-xs shadow-sm'>
        <strong className='block'>{measureName(selected, discharge)} · {formatAmount(selected)}</strong>{dateText(selected)}
        {!calendar.exactTimes && <span className='block'>{quickReadingContextLabel(selected)}</span>}
      </div>}
    </div>
  </section>
}

export function CalendarScope({calendar, rows}) {
  const ranges = getReadingScopeRanges(rows, {exactTimes: calendar.exactTimes})
  if (!ranges.length) return null
  return <div className={calendar.exactTimes ? telemetryColumns : columns}>
    <div className={calendar.exactTimes ? 'min-[30rem]:col-start-2' : 'col-start-2'}>
      <ReadingScope ranges={ranges} position={calendar.position} label={calendar.exactTimes ? 'Mesures du reçu' : 'Cette déclaration'} />
    </div>
  </div>
}

export function CalendarScale({calendar, scale, allowed, onChange, labels = scales, hideControl = false}) {
  const labelStride = Math.ceil(calendar.cells.length / 6)
  const mobileStride = Math.ceil(calendar.cells.length / (scale === 'week' ? 3 : 4))
  return (
    <div className={(calendar.exactTimes ? telemetryColumns : columns) + ' items-start'}>
      {hideControl ? <span aria-hidden='true' className='max-[30rem]:hidden' /> : <label className={'mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-[var(--text-mention-grey)]' + (calendar.exactTimes ? ' max-[30rem]:row-start-2 max-[30rem]:mt-0' : '')}>
        Pas de temps
        <span className='relative inline-flex'>
          <select value={scale} onChange={event => onChange(event.target.value)} aria-label='Pas de temps'
            className='cursor-pointer appearance-none rounded-sm border border-[var(--border-default-grey)] bg-[var(--background-default-grey)] py-0.5 pr-5 pl-1.5 text-sm text-[var(--text-default-grey)]'>
            {allowed.map(step => <option key={step} value={step}>{labels[step]}</option>)}
          </select>
          <span aria-hidden='true' className='pointer-events-none absolute inset-y-0 right-1.5 flex items-center'>▾</span>
        </span>
      </label>}
      <div aria-hidden='true' className={'@container relative text-[0.67rem] leading-tight text-[var(--text-mention-grey)] sm:text-xs ' + (calendar.hasSubLabels ? 'h-14' : 'h-7')}>
        {calendar.cells.map((cell, i) => {
          const mobile = cell.showMobile ?? (i % mobileStride === 0)
          const wide = cell.showWide ?? (i % labelStride === 0)
          const align = cell.center === 0 ? '' : cell.center === 100 ? '-translate-x-full text-right' : '-translate-x-1/2 text-center'
          const wideClass = calendar.exactTimes ? (wide ? ' @[18rem]:block' : ' @[18rem]:hidden') : (wide ? ' sm:block' : ' sm:hidden')
          return <span key={cell.left} title={cell.title ?? fullDayLabel(cell.date)}
            className={'absolute top-1 whitespace-nowrap ' + align + (mobile ? ' block' : ' hidden') + wideClass}
            style={{left: cell.center + '%'}}>{cell.label}{cell.sublabel && <span className='block'>{cell.sublabel}</span>}{cell.offset && <span className='block'>{cell.offset}</span>}</span>
        })}
      </div>
    </div>
  )
}

export default function ReadingSummary({marks, volumeLabel, formatAmount, compactTimeline}) {
  const [choice, setChoice] = useState(null)
  const discharge = volumeLabel.startsWith('Volume rejeté')
  if (!compactTimeline) return <ul aria-label='Mesures du point' className='m-0 list-none p-0'>
    {marks.map(row => <MeasureText key={row.key} row={row} name={measureName(row, discharge)} formatAmount={formatAmount} />)}
  </ul>
  const first = new Date(Math.min(...marks.map(row => Date.parse(row.start ?? row.day))))
  const last = new Date(Math.max(...marks.map(row => Date.parse(row.day))))
  const allowed = Object.keys(scales).filter(step => step === 'year' || periodIndex(last, step) - periodIndex(first, step) <= 14)
  const autoScale = last - first <= 14 * dayMs ? 'week' : allowed.includes('month') ? 'month' : 'year'
  const scale = allowed.includes(choice) ? choice : autoScale
  const calendar = buildCalendar(first, last, scale)
  const indexes = marks.filter(row => !row.start)
  const volumes = marks.filter(row => row.start)
  return (
    <div className='max-w-3xl'>
      <CalendarScope calendar={calendar} rows={marks} />
      {indexes.length > 0 && <CalendarPanel rows={indexes} indexes calendar={calendar} discharge={discharge} formatAmount={formatAmount} />}
      {volumes.length > 0 && <CalendarPanel rows={volumes} calendar={calendar} discharge={discharge} formatAmount={formatAmount} />}
      <CalendarScale calendar={calendar} scale={scale} allowed={allowed} onChange={setChoice} />
    </div>
  )
}
