'use client'

import {useMemo} from 'react'

import Tooltip from '@mui/material/Tooltip'
import {
  format, addDays, startOfWeek, isSameMonth, parse
} from 'date-fns'
import {fr} from 'date-fns/locale'

const locale = fr

const dayNames = ['L', 'Ma', 'Me', 'J', 'V', 'S', 'D']

const DayCell = ({day, firstDayCurrentMonth, dataMap, renderTooltipContent, onDayClick}) => {
  const dayKey = format(day, 'dd-MM-yyyy')
  const isCurrentMonthDay = isSameMonth(day, firstDayCurrentMonth)
  const dayData = isCurrentMonthDay ? dataMap.get(dayKey) : undefined

  let cellStyle = {}
  let cellClasses = 'aspect-square rounded flex items-center justify-center text-xs transition-colors duration-150 ease-in-out'

  if (dayData) {
    if (dayData.colorA && dayData.colorB) {
      cellStyle = {
        background: `repeating-linear-gradient(45deg, ${dayData.colorA}, ${dayData.colorA} 3px, ${dayData.colorB} 3px, ${dayData.colorB} 6px)`
      }
      cellClasses += ' text-white font-semibold'
    } else if (dayData.colorA) {
      cellStyle = {backgroundColor: dayData.colorA}
      cellClasses += ' text-white font-semibold'
    }
  } else if (isCurrentMonthDay) {
    cellClasses += ' bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
  } else {
    cellClasses += ' invisible pointer-events-none'
  }

  const dayInfoForTooltip = {
    date: day,
    isCurrentMonth: isCurrentMonthDay,
    dayStyleEntry: dayData
  }

  const isClickable = isCurrentMonthDay && dayData

  const cellMarkup = (
    <div
      className={cellClasses}
      style={{...cellStyle, cursor: isClickable ? 'pointer' : undefined}}
      role='gridcell'
      aria-label={format(day, 'PPP', {locale})}
      onClick={isClickable ? () => onDayClick({date: day, dayStyleEntry: dayData}) : undefined}
    />
  )

  if (isCurrentMonthDay || dayData) {
    return (
      <Tooltip arrow enterNextDelay={400} title={renderTooltipContent ? renderTooltipContent(dayInfoForTooltip) : null}>
        {cellMarkup}
      </Tooltip>
    )
  }

  return <div>{cellMarkup}</div>
}

/**
 * Data: {date: string, colorA: string, colorB: string}[]
 */

const MonthPrelevementCalendar = ({
  year,
  month,
  data,
  renderTooltipContent,
  onDayClick
}) => {
  const dataMap = useMemo(() => {
    const map = new Map()
    for (const item of data) {
      try {
        const parsedDate = parse(item.date, 'dd-MM-yyyy', new Date())
        const formattedKey = format(parsedDate, 'dd-MM-yyyy')
        map.set(formattedKey, item)
      } catch {
        console.warn(`Invalid date format in data: ${item.date}. Expected dd-MM-yyyy.`)
      }
    }

    return map
  }, [data])

  const firstDayCurrentMonth = useMemo(() => new Date(year, month, 1), [year, month])

  const daysInGrid = useMemo(() => {
    const gridStart = startOfWeek(firstDayCurrentMonth, {weekStartsOn: 1})
    return Array.from({length: 42}).map((_, i) => addDays(gridStart, i))
  }, [firstDayCurrentMonth])

  const monthNameLocalized = format(firstDayCurrentMonth, 'MMMM yyyy', {locale})

  return (
    <div className='p-3 bg-white dark:bg-slate-900 rounded-lg shadow w-full'>
      <h2 className='text-lg font-semibold text-center mb-3 text-slate-800 dark:text-slate-200'>
        {monthNameLocalized.charAt(0).toUpperCase() + monthNameLocalized.slice(1)}
      </h2>
      <div className='grid grid-cols-7 gap-1 mb-2'>
        {' '}
        {/* Increased mb slightly */}
        {dayNames.map(name => (
          <div
            key={`${name}`}
            className='text-center font-medium text-xs text-slate-500 dark:text-slate-400'
            aria-hidden='true'
          >
            {name[0]}
          </div>
        ))}
      </div>
      <div className='grid grid-cols-7 gap-1'>
        {' '}
        {daysInGrid.map(day => (
          <DayCell
            key={format(day, 'dd-MM-yyyy')}
            day={day}
            firstDayCurrentMonth={firstDayCurrentMonth}
            dataMap={dataMap}
            renderTooltipContent={renderTooltipContent}
            onDayClick={onDayClick}
          />
        ))}
      </div>
    </div>
  )
}

export default MonthPrelevementCalendar
