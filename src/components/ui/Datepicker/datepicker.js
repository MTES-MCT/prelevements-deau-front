import {useState} from 'react'

import {Button} from '@codegouvfr/react-dsfr/Button'
import {Box} from '@mui/system'
import {map, range} from 'lodash'

import MonthView from './month-view.js'
import YearsView from './years-view.js'

import CompactAlert from '@/components/ui/CompactAlert/index.js'
import {getMonthPeriodRange} from '@/lib/format-date.js'

// Utilitaire pour obtenir les périodes disponibles
function getAvailablePeriodsForView(viewType, selectablePeriods) {
  if (viewType === 'years') {
    return selectablePeriods.years || []
  }

  const start = selectablePeriods.months?.start || new Date(2024, 0)
  const end = selectablePeriods.months?.end || new Date(2024, 11)
  const monthsCount = ((end.getFullYear() - start.getFullYear()) * 12) + (end.getMonth() - start.getMonth()) + 1

  return map(range(monthsCount), i => {
    const date = new Date(start.getFullYear(), start.getMonth() + i)
    return {year: date.getFullYear(), month: date.getMonth()}
  })
}

// Vérifie si une période est sélectionnée
function isPeriodCurrentlySelected(period, selectedPeriods, viewType) {
  if (viewType === 'years') {
    return selectedPeriods.some(p => p.type === 'year' && p.value === period)
  }

  return selectedPeriods.some(p =>
    p.type === 'month' && p.year === period.year && p.month === period.month
  )
}

const Datepicker = ({
  defaultInitialViewType,
  currentViewType = 'months',
  defaultSelectedPeriods,
  selectablePeriods,
  maxSelectablePeriods,
  onValidateSelection
}) => {
  const [zoomLevel, setZoomLevel] = useState(currentViewType)
  const [selectedPeriods, setSelectedPeriods] = useState(defaultSelectedPeriods)
  const [rangeStart, setRangeStart] = useState(null)
  const [isSelecting, setIsSelecting] = useState(false)

  // Zoom out vers la vue années
  const handleZoomOutToYears = () => {
    if (defaultInitialViewType !== zoomLevel) {
      setZoomLevel('years')
      // Trouver l'année des mois sélectionnés
      const selectedYear = selectedPeriods.find(p => p.type === 'month')?.year
      let newSelected = selectedPeriods.filter(p => p.type === 'year')
      // Ajouter l'année si elle n'est pas déjà sélectionnée
      if (selectedYear && !newSelected.some(p => p.value === selectedYear)) {
        newSelected = [{type: 'year', value: selectedYear}]
      }

      setSelectedPeriods(newSelected)
    }
  }

  // Sélection d'une année ou d'un mois
  const handlePeriodSelection = period => {
    if (zoomLevel === 'years') {
      if (isSelecting && rangeStart !== null) {
        const start = Math.min(rangeStart, period)
        const end = Math.max(rangeStart, period)
        const years = Array.from({length: end - start + 1}, (_, i) => ({type: 'year', value: start + i}))
        setSelectedPeriods(years.slice(0, maxSelectablePeriods || undefined))
        setIsSelecting(false)
        setRangeStart(null)
      } else {
        setRangeStart(period)
        setIsSelecting(true)
        setSelectedPeriods([{type: 'year', value: period}])
      }
    } else if (isSelecting && rangeStart) {
      const months = getMonthPeriodRange(rangeStart, period, maxSelectablePeriods)
      setSelectedPeriods(months)
      setIsSelecting(false)
      setRangeStart(null)
    } else {
      setRangeStart(period)
      setIsSelecting(true)
      setSelectedPeriods([{type: 'month', year: period.year, month: period.month}])
    }
  }

  const handleReset = () => {
    setSelectedPeriods(defaultSelectedPeriods || [])
    setIsSelecting(false)
    setRangeStart(null)
  }

  const availablePeriodsForView = getAvailablePeriodsForView(zoomLevel, selectablePeriods)

  return (
    <Box className='bg-white border rounded-sm shadow-md p-4'>
      <Box className='flex flex-col gap-3'>
        {typeof maxSelectablePeriods === 'number' && maxSelectablePeriods > 0 && (
          <CompactAlert
            label={
              maxSelectablePeriods === 1
                ? 'Vous ne pouvez sélectionner qu\'une période'
                : `Vous ne pouvez sélectionner que ${maxSelectablePeriods} périodes maximum`
            }
          />
        )}

        {zoomLevel === 'years' ? (
          <YearsView
            years={availablePeriodsForView}
            isPeriodSelected={year => isPeriodCurrentlySelected(year, selectedPeriods, 'years')}
            handlePeriodClick={handlePeriodSelection}
          />
        ) : (
          <MonthView
            periods={availablePeriodsForView}
            zoomOut={defaultInitialViewType !== zoomLevel && handleZoomOutToYears}
            isPeriodSelected={period => isPeriodCurrentlySelected(period, selectedPeriods, 'months')}
            handlePeriodClick={handlePeriodSelection}
          />
        )}
      </Box>

      <Box className='flex items-center gap-1 justify-end mt-4'>
        <Button priority='secondary' onClick={handleReset}>Réinitialiser</Button>
        <Button onClick={() => onValidateSelection(selectedPeriods)}>Valider</Button>
      </Box>
    </Box>
  )
}

export default Datepicker

