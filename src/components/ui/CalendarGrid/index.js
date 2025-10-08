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

import {computeCalendarKey, getMinDate} from './util.js'

import Calendar from '@/components/ui/Calendar/index.js'
import LegendCalendar from '@/components/ui/LegendCalendar/index.js'

// Default legend labels (reused pattern from previous calendar grid implementation)
const defaultLegendLabels = [
  {color: fr.colors.decisions.artwork.major.blueFrance.default, label: 'Données présentes'},
  {color: fr.colors.decisions.background.actionHigh.warning.hover, label: 'Données présentes mais anomalies'},
  {color: fr.colors.decisions.background.actionHigh.info.hover, label: 'Pas de prélèvement'},
  {color: fr.colors.decisions.background.actionHigh.grey.active, label: 'Non déclaré / pas de déclaration'}
]

const CalendarGrid = ({calendars, onClick, hoverComponent: HoverComponent, legendLabels = defaultLegendLabels}) => {
  // Sort sub-arrays by the earliest date of each calendar
  const items = useMemo(() => {
    if (!Array.isArray(calendars)) {
      return []
    }

    return [...calendars].sort((a, b) => {
      const da = getMinDate(a)
      const db = getMinDate(b)

      if (da === null && db === null) {
        return 0
      }

      if (da === null) {
        return 1
      }

      if (db === null) {
        return -1
      }

      return da.localeCompare(db)
    })
  }, [calendars])

  return (
    <div className='flex flex-col gap-8'>
      {items.length === 0 ? (
        <Alert severity='info' description='Aucun calendrier à afficher' />
      ) : (
        <div
          className='grid justify-between'
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

