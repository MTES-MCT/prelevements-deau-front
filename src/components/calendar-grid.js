import {fr} from '@codegouvfr/react-dsfr'
import {parse} from 'date-fns'

import MonthPrelevementCalendar from '@/components/declarations/month-prevelement-calendar.js'
import LegendCalendar from '@/components/ui/legend-calendar.js'

const legendLabels = [
  {color: fr.colors.decisions.text.actionHigh.blueFrance.default, label: 'Données présentes'},
  {color: fr.colors.decisions.background.flat.warning.default, label: 'Données présentes mais anomalies'},
  {color: fr.colors.decisions.background.actionHigh.info.default, label: 'Pas de prélèvement'},
  {color: 'grey', label: 'Non déclaré / pas de déclaration'}
]

// Get year and months from display
function extractMonthsAndYearFromData(data) {
  const monthSet = new Set()
  for (const item of data) {
    try {
      const parsedDate = parse(item.date, 'dd-MM-yyyy', new Date())
      const year = parsedDate.getFullYear()
      const monthIndex = parsedDate.getMonth()
      monthSet.add(`${year}-${monthIndex}`)
    } catch {
      console.warn(`Invalid date format in data: ${item.date}. Expected dd-MM-yyyy.`)
    }
  }

  const monthsArray = [...monthSet].map(key => {
    const [year, monthIndex] = key.split('-').map(Number)
    return {year, monthIndex}
  })
  monthsArray.sort((a, b) => a.year - b.year || a.monthIndex - b.monthIndex)
  return monthsArray
}

const CalendarGrid = ({data, renderCustomTooltipContent, onDayClick}) => {
  const monthsToDisplay = extractMonthsAndYearFromData(data)
  return (
    <>
      <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full'>
        {monthsToDisplay.map(monthInfo => (
          <div key={`${monthInfo.year}-${monthInfo.monthIndex}`} className='flex flex-col items-center max-w-xs sm:max-w-sm md:max-w-3xl'>
            <MonthPrelevementCalendar
              year={monthInfo.year}
              month={monthInfo.monthIndex}
              data={data}
              renderTooltipContent={renderCustomTooltipContent}
              onDayClick={onDayClick}
            />
          </div>
        ))}
      </div>
      <LegendCalendar labels={legendLabels} />
    </>
  )
}

export default CalendarGrid
