/**
 * <Calendar /> component
 * API: { values: Array<{date: string, color?: string, ...data}>, onClick?: Function, hoverComponent?: React.ComponentType }
 * Automatic mode detection: "month" (YYYY-MM-DD), "year" (YYYY-MM), or "years" (YYYY)
 *  - month : all dates must belong to the same calendar month (renders every day of that month)
 *  - year  : all entries (YYYY-MM) must belong to the same year (renders 12 months)
 *  - years : renders an interval from min to max year (missing years are greyed)
 * Displays an error if mixed formats or incoherent ranges are provided.
 */

import {fr as dsfr} from '@codegouvfr/react-dsfr'
import {Alert} from '@codegouvfr/react-dsfr/Alert'
import Tooltip from '@mui/material/Tooltip'

// ===================== Imported utilities ===================== //
import {
  monthFormatter,
  monthShortFormatter,
  capitalize,
  detectModeAndValidate,
  buildValueMap
} from './util.js'

// ===================== Generic cell ===================== //
const BaseCell = ({label, ariaLabel, interactive, color, size, onActivate, tooltipContent}) => {
  let style = {width: size, height: size}
  let classes = 'rounded flex items-center justify-center text-xs sm:text-sm font-medium text-center transition-colors duration-150 ease-in-out relative overflow-hidden select-none'

  if (color) {
    style = {...style, backgroundColor: color}
    classes += ' text-white'
  } else {
    classes += ' bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
  }

  if (interactive) {
    classes += ' cursor-pointer group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1'
  }

  // Hover darkening effect (interactive only)
  if (interactive) {
    classes += ' hover:before:content-"" hover:before:absolute hover:before:inset-0 hover:before:bg-black hover:before:opacity-20'
  }

  const cell = (
    <div
      role='gridcell'
      aria-label={ariaLabel || label}
      tabIndex={interactive ? 0 : -1}
      aria-disabled={interactive ? undefined : true}
      className={classes}
      style={style}
      onClick={() => interactive && onActivate?.()}
      onKeyDown={e => {
        if (!interactive) {
          return
        }

        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onActivate?.()
        }
      }}
    >
      <span className={interactive ? 'group-hover:hidden group-focus:hidden' : undefined}>{label}</span>
      {interactive && (
        <span
          className='hidden group-hover:inline-flex group-focus:inline-flex fr-icon-search-line'
          aria-hidden='true'
        />
      )}
    </div>
  )

  if (interactive && tooltipContent) {
    return (
      <Tooltip arrow enterNextDelay={300} title={tooltipContent}>
        {cell}
      </Tooltip>
    )
  }

  return cell
}

// ===================== Sub components ===================== //

// Mode "month" : 7 columns grid, aligned on Monday
const buildMonthCalendar = ({valuesMap, sampleDate, onClick, HoverComponent}) => {
  const yearMonth = sampleDate.slice(0, 7) // YYYY-MM
  const [year, month] = yearMonth.split('-').map(Number)
  const firstDay = new Date(year, month - 1, 1)
  const monthName = capitalize(monthFormatter.format(firstDay))
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstWeekDay = (firstDay.getDay() + 6) % 7 // 0 = Monday
  const cells = []

  // Placeholders before the first day (hidden for alignment)
  for (let i = 0; i < firstWeekDay; i++) {
    cells.push(<div key={`ph-${i}`} style={{width: 35, height: 35, visibility: 'hidden'}} aria-hidden='true' />)
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${yearMonth}-${String(day).padStart(2, '0')}`
    const value = valuesMap.get(dateKey)
    const interactive = Boolean(value)
    const color = value?.color
    const tooltipContent = value && HoverComponent ? <HoverComponent value={value} /> : undefined
    cells.push(
      <BaseCell
        key={dateKey}
        label={String(day)}
        ariaLabel={`${day} ${monthName}`}
        interactive={interactive}
        color={color}
        size={35}
        tooltipContent={tooltipContent}
        onActivate={() => interactive && onClick?.(value)}
      />
    )
  }

  return {
    title: monthName,
    grid: (
      <div
        className='grid gap-1 justify-center'
        style={{gridTemplateColumns: 'repeat(7, max-content)'}}
        role='grid'
        aria-label={`Mois de ${monthName}`}
      >
        {cells}
      </div>
    )
  }
}

// Mode "year" : 12 months
const buildYearCalendar = ({valuesMap, sampleMonth, onClick, HoverComponent}) => {
  const year = sampleMonth.slice(0, 4)
  const cells = []
  for (let m = 0; m < 12; m++) {
    const dateKey = `${year}-${String(m + 1).padStart(2, '0')}`
    const value = valuesMap.get(dateKey)
    const interactive = Boolean(value)
    const color = value?.color
    const monthDate = new Date(Number(year), m, 1)
    const label = capitalize(monthShortFormatter.format(monthDate))
    const fullLabel = capitalize(monthFormatter.format(monthDate))
    const tooltipContent = value && HoverComponent ? <HoverComponent value={value} /> : undefined
    cells.push(
      <BaseCell
        key={dateKey}
        label={label}
        ariaLabel={fullLabel}
        interactive={interactive}
        color={color}
        size={60}
        tooltipContent={tooltipContent}
        onActivate={() => interactive && onClick?.(value)}
      />
    )
  }

  return {
    title: year,
    grid: (
      <div
        className='grid gap-2 justify-center'
        style={{gridTemplateColumns: 'repeat(4, max-content)'}}
        role='grid'
        aria-label={`Année ${year}`}
      >
        {cells}
      </div>
    )
  }
}

// Mode "years" : min..max interval
const buildYearsCalendar = ({valuesMap, years, onClick, HoverComponent}) => {
  const min = Math.min(...years)
  const max = Math.max(...years)
  const allYears = []
  for (let y = min; y <= max; y++) {
    allYears.push(y)
  }

  const cells = allYears.map(y => {
    const dateKey = String(y)
    const value = valuesMap.get(dateKey)
    const interactive = Boolean(value)
    const color = value?.color
    const tooltipContent = value && HoverComponent ? <HoverComponent value={value} /> : undefined
    return (
      <BaseCell
        key={dateKey}
        label={dateKey}
        ariaLabel={`Année ${dateKey}`}
        interactive={interactive}
        color={color}
        size={60}
        tooltipContent={tooltipContent}
        onActivate={() => interactive && onClick?.(value)}
      />
    )
  })

  return {
    title: `${min} - ${max}`,
    grid: (
      <div
        className='grid gap-2 justify-center'
        style={{gridTemplateColumns: 'repeat(4, max-content)'}}
        role='grid'
        aria-label={`Années ${min} à ${max}`}
      >
        {cells}
      </div>
    )
  }
}

// ===================== Composant Principal ===================== //
const Calendar = ({values, onClick, hoverComponent: HoverComponent}) => {
  const {mode, error} = detectModeAndValidate(values)
  const valuesMap = buildValueMap(values || [])

  if (error) {
    return <Alert severity='error' description={`Calendrier: ${error}`} />
  }

  let sub
  switch (mode) {
    case 'month': {
      sub = buildMonthCalendar({
        valuesMap,
        sampleDate: values[0].date,
        onClick,
        HoverComponent
      })
      break
    }

    case 'year': {
      sub = buildYearCalendar({
        valuesMap,
        sampleMonth: values[0].date,
        onClick,
        HoverComponent
      })
      break
    }

    case 'years': {
      sub = buildYearsCalendar({
        valuesMap,
        years: values.map(v => Number(v.date)),
        onClick,
        HoverComponent
      })
      break
    }

    default: {
      break
    }
  }

  const titleId = sub?.title ? `calendar-title-${sub.title.replaceAll(/\s+/g, '-').toLowerCase()}` : undefined

  return (
    <div style={{backgroundColor: dsfr.colors.decisions.background.default}} role='region' aria-label='Calendrier'>
      {sub?.title && (
        <h3 id={titleId} className='text-center mb-3 text-lg font-semibold'>
          {sub.title}
        </h3>
      )}
      {sub?.grid}
    </div>
  )
}

export default Calendar
