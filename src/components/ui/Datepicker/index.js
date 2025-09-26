import {useState, useRef, useEffect} from 'react'

import {Button} from '@codegouvfr/react-dsfr/Button'
import Tooltip from '@codegouvfr/react-dsfr/Tooltip.js'
import {Typography} from '@mui/material'
import {Box} from '@mui/system'

import Datepicker from './datepicker.js'

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
  const [dropdownStyle, setDropdownStyle] = useState({})
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

    // Calculer la position optimale du dropdown
    function calculateDropdownPosition() {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight

        // Largeurs possibles du datepicker selon les breakpoints
        let dropdownWidth = 300 // MinWidth par défaut
        if (viewportWidth >= 900) { // Md breakpoint
          dropdownWidth = 700
        } else if (viewportWidth >= 600) { // Sm breakpoint
          dropdownWidth = 400
        } else {
          dropdownWidth = Math.min(viewportWidth * 0.95, 300)
        }

        const spaceRight = viewportWidth - rect.left
        const spaceLeft = rect.right
        const spaceBelow = viewportHeight - rect.bottom

        const style = {
          minWidth: '300px',
          maxWidth: '95vw',
          top: '100%',
          marginTop: '4px',
          left: 'auto',
          right: 'auto',
          transform: 'none'
        }

        // Largeur responsive
        if (viewportWidth >= 900) {
          style.width = '700px'
        } else if (viewportWidth >= 600) {
          style.width = '450px'
        } else {
          style.width = '100%'
        }

        // Position horizontale
        if (spaceRight >= dropdownWidth) {
          // Assez de place à droite, aligner à gauche
          style.left = '0'
        } else if (spaceLeft >= dropdownWidth) {
          // Pas assez de place à droite mais assez à gauche, aligner à droite
          style.right = '0'
        } else {
          // Pas assez de place des deux côtés, centrer
          style.left = '50%'
          style.transform = 'translateX(-50%)'
          style.width = '95vw'
        }

        // Position verticale (si pas assez de place en bas)
        if (spaceBelow < 400 && rect.top > 400) {
          style.top = 'auto'
          style.bottom = '100%'
          style.marginTop = '0'
          style.marginBottom = '4px'
        }

        setDropdownStyle(style)
      }
    }

    calculateDropdownPosition()
    window.addEventListener('resize', calculateDropdownPosition)
    window.addEventListener('scroll', calculateDropdownPosition)
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('resize', calculateDropdownPosition)
      window.removeEventListener('scroll', calculateDropdownPosition)
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
      <Box className='flex flex-col gap-1'>
        {buttonLabel && <Typography className='pb-1'>{buttonLabel}</Typography>}
        <Box className='flex items-center'>
          <Button className='fr-input w-full text-left' onClick={() => setIsDatepickerOpen(open => !open)}>
            {getLabelForSelectedPeriods(selectedPeriods)}
          </Button>

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
      </Box>

      {isDatepickerOpen && (
        <Box className='absolute z-1' sx={dropdownStyle}>
          <Datepicker
            currentViewType={viewType}
            defaultInitialViewType={defaultInitialViewType}
            defaultSelectedPeriods={selectedPeriods}
            selectablePeriods={selectablePeriods}
            maxSelectablePeriods={maxSelectablePeriods}
            onValidateSelection={handleValidateSelection}
          />
        </Box>
      )}
    </Box>
  )
}

export default DatepickerTrigger
