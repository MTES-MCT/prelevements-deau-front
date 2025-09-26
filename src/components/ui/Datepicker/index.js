import {useState, useRef, useEffect} from 'react'

import {Button} from '@codegouvfr/react-dsfr/Button'
import Tooltip from '@codegouvfr/react-dsfr/Tooltip.js'
import {Box} from '@mui/system'

import Datepicker from './datepicker.js'
import { Typography } from '@mui/material'

function getLabelForSelectedPeriods(selectedPeriods) {
  if (!selectedPeriods || selectedPeriods.length === 0) {
    return 'Sélectionner une période'
  }

  const monthNames = [
    'janvier',
    'février',
    'mars',
    'avril',
    'mai',
    'juin',
    'juillet',
    'août',
    'septembre',
    'octobre',
    'novembre',
    'décembre'
  ]

  const selectedMonths = selectedPeriods.filter(period => period.type === 'month')
  const selectedYears = selectedPeriods.filter(period => period.type === 'year')

  if (selectedMonths.length > 0) {
    if (selectedMonths.length === 1) {
      const period = selectedMonths[0]
      return `${monthNames[period.month]} ${period.year}`
    }

    const firstMonth = selectedMonths[0]
    const lastMonth = selectedMonths.at(-1)
    return `${monthNames[firstMonth.month]} ${firstMonth.year} - ${monthNames[lastMonth.month]} ${lastMonth.year}`
  }

  if (selectedYears.length > 0) {
    if (selectedYears.length === 1) {
      return `${selectedYears[0].value}`
    }

    return `${selectedYears[0].value} - ${selectedYears.at(-1).value}`
  }

  return 'Sélectionner une période'
}

const DatepickerTrigger = ({
  buttonLabel,
  defaultInitialViewType,
  currentViewType,
  defaultSelectedPeriods,
  selectablePeriods,
  maxSelectablePeriods,
  onSelectionChange
}) => {
  const initialSelectedPeriodsRef = useRef(defaultSelectedPeriods || [])

  const [isDatepickerOpen, setIsDatepickerOpen] = useState(false)
  const [selectedPeriods, setSelectedPeriods] = useState(initialSelectedPeriodsRef.current)
  const [viewType, setViewType] = useState(currentViewType)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!isDatepickerOpen) {
      return
    }

    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsDatepickerOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDatepickerOpen])

  const handleValidateSelection = periods => {
    setSelectedPeriods(periods)
    setIsDatepickerOpen(false)
    onSelectionChange(periods)
    // Détecte la vue à la validation
    if (periods.length > 0 && periods[0].type === 'year') {
      setViewType('years')
    } else if (periods.length > 0 && periods[0].type === 'month') {
      setViewType('months')
    }
  }

  const handleResetSelection = () => {
    setSelectedPeriods(defaultSelectedPeriods || [])
    setViewType(currentViewType)
    onSelectionChange(defaultSelectedPeriods || [])
  }

  return (
    <Box ref={containerRef} className='relative inline-block'>
      <Box className='flex gap-1'>
        <Box>
          {buttonLabel && <Typography className='pb-1'>{buttonLabel}</Typography>}
          <Button className='fr-input w-fit' onClick={() => setIsDatepickerOpen(open => !open)}>
            {getLabelForSelectedPeriods(selectedPeriods)}
          </Button>
        </Box>

        {(!isDatepickerOpen && selectedPeriods.length > 0) && (
          <Tooltip title='Réinitialiser la sélection'>
            <Button
              priority='tertiary no outline'
              iconId='fr-icon-close-circle-line'
              onClick={handleResetSelection}
            />
          </Tooltip>
        )}
      </Box>

      {isDatepickerOpen && (
        <Datepicker
          currentViewType={viewType}
          defaultInitialViewType={defaultInitialViewType}
          defaultSelectedPeriods={selectedPeriods}
          selectablePeriods={selectablePeriods}
          maxSelectablePeriods={maxSelectablePeriods}
          onValidateSelection={handleValidateSelection}
        />
      )}
    </Box>
  )
}

export default DatepickerTrigger
