/**
 * <CalendarGrid /> component
 * Props: {
 *   calendars: Array<Array<{date: string, color?: string, ...data}>>,
 *   onClick?: Function(value),
 *   hoverComponent?: React.ComponentType<{value: any}>
 * }
 * Renders a responsive grid (auto-fill) of <Calendar /> components (each calendar dataset
 * is treated independently allowing different modes per calendar). Each calendar has a
 * fixed width of 270px while height can vary depending on its internal mode (month / year / years).
 * Displays an info <Alert /> when the calendars array is empty. Always renders the <LegendCalendar /> below the grid.
 */

import {useMemo} from 'react'

import {fr} from '@codegouvfr/react-dsfr'
import {Alert} from '@codegouvfr/react-dsfr/Alert'

import Calendar from '@/components/ui/Calendar/index.js'
import LegendCalendar from '@/components/ui/legend-calendar.js'

// Default legend labels (reused pattern from previous calendar grid implementation)
const defaultLegendLabels = [
  {color: fr.colors.decisions.text.actionHigh.blueFrance.default, label: 'Données présentes'},
  {color: fr.colors.decisions.background.flat.warning.default, label: 'Données présentes mais anomalies'},
  {color: fr.colors.decisions.background.actionHigh.info.default, label: 'Pas de prélèvement'},
  {color: fr.colors.decisions.text.disabled.grey.default, label: 'Non déclaré / pas de déclaration'}
]

/**
 * Compute a stable unique key for a calendar dataset without relying on its index.
 * Strategy: collect date (or id fallback) fields, sort, join and hash with a simple 31-based hash.
 */
function computeCalendarKey(values) {
  // Simplified key strategy: concatenate the ordered list of dates
  // Assumption (per project domain): each object has a unique 'date' string inside the calendar dataset.
  if (!Array.isArray(values) || values.length === 0) {
    return 'cal-empty'
  }

  // Keep original order; if order is not guaranteed you could add .sort() before join.
  return values.map(v => v.date).join('|')
}

const CalendarGrid = ({calendars, onClick, hoverComponent: HoverComponent, legendLabels = defaultLegendLabels}) => {
  // Sort sub-arrays by the earliest date of each calendar
  const items = useMemo(() => {
    if (!Array.isArray(calendars)) {
      return []
    }

    return [...calendars].sort((a, b) => {
      const getMinDate = arr => {
        if (!Array.isArray(arr) || arr.length === 0) {
          return ''
        }

        let min = arr[0].date

        for (const v of arr) {
          if (v.date < min) {
            min = v.date
          }
        }

        return min
      }

      return getMinDate(a).localeCompare(getMinDate(b))
    })
  }, [calendars])

  return (
    <div className='flex flex-col gap-8'>
      {items.length === 0 ? (
        <Alert severity='info' description='Aucun calendrier à afficher' />
      ) : (
        <div
          className='grid justify-center'
          style={{
            gridTemplateColumns: 'repeat(auto-fill, 270px)',
            gap: '1.5rem'
          }}
          role='list'
          aria-label='Grille de calendriers'
        >
          {items.map(values => (
            <div
              key={computeCalendarKey(values)}
              role='listitem'
              style={{width: 270}}
              className='flex flex-col'
            >
              <Calendar hoverComponent={HoverComponent} values={values} onClick={onClick} />
            </div>
          ))}
        </div>
      )}
      <LegendCalendar labels={legendLabels} />
    </div>
  )
}

export default CalendarGrid

