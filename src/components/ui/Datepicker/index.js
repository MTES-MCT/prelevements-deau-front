/* eslint-disable camelcase */
import {
  useState, useRef, useEffect, useCallback, useMemo
} from 'react'

import Button from '@codegouvfr/react-dsfr/Button.js'
import Notice from '@codegouvfr/react-dsfr/Notice.js'
import Select from '@codegouvfr/react-dsfr/Select.js'
import {Box, Typography} from '@mui/material'
import {format, startOfMonth, startOfWeek} from 'date-fns'
import {fr} from 'date-fns/locale'
import {DayPicker} from 'react-day-picker'

import 'react-day-picker/dist/style.css'
import {getRange, startOfDay} from '@/lib/format-date.js'

const today = new Date()
const getInitialDate = type => type === 'week' ? startOfWeek(today, {weekStartsOn: 1}) : startOfMonth(today)

const DatePicker = ({
  value = null,
  onConfirm,
  hint,
  maxSelection = 3
}) => {
  const pickerRef = useRef(null)
  const toggleButtonRef = useRef(null)

  const [periodType, setPeriodType] = useState('month')
  const [selectedDates, setSelectedDates] = useState([
    value instanceof Date ? value : getInitialDate('month')
  ])
  const [open, setOpen] = useState(false)
  const [range, setRange] = useState(getRange(selectedDates, 'month'))
  const [displayMonth, setDisplayMonth] = useState(
    periodType === 'week'
      ? startOfWeek(selectedDates[0], {weekStartsOn: 1})
      : startOfMonth(selectedDates[0])
  )

  const displayedValue = useMemo(() => (
    range.ranges?.length
      ? range.ranges.map(r => `${format(r.from, 'dd/MM/yyyy')} - ${format(r.to, 'dd/MM/yyyy')}`).join(', ')
      : ''
  ), [range])

  const modifiers = {
    selected: day => selectedDates.some(d => startOfDay(day).getTime() === startOfDay(d).getTime()),
    range: day => range.ranges?.some(r => startOfDay(day) >= startOfDay(r.from) && startOfDay(day) <= startOfDay(r.to)),
    range_start: day => range.ranges?.some(r => startOfDay(day).getTime() === startOfDay(r.from).getTime()),
    range_end: day => range.ranges?.some(r => startOfDay(day).getTime() === startOfDay(r.to).getTime()),
    // Ajout pour arrondir les bords de rangée
    range_row_start(day) {
      const weekDay = day.getDay() === 0 ? 7 : day.getDay() // Lundi = 1, Dimanche = 7
      return modifiers.range(day) && weekDay === 1
    },
    range_row_end(day) {
      const weekDay = day.getDay() === 0 ? 7 : day.getDay()
      return modifiers.range(day) && weekDay === 7
    }
  }

  const rangeRef = useRef(range)
  const onConfirmRef = useRef(onConfirm)

  useEffect(() => {
    rangeRef.current = range
    onConfirmRef.current = onConfirm
  }, [range, onConfirm])

  const handleClickOutside = useCallback(e => {
    if (
      pickerRef.current && !pickerRef.current.contains(e.target)
      && toggleButtonRef.current && !toggleButtonRef.current.contains(e.target)
      && rangeRef.current.from && rangeRef.current.to
    ) {
      onConfirmRef.current(rangeRef.current)
      setOpen(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      setDisplayMonth(
        periodType === 'week'
          ? startOfWeek(selectedDates[0], {weekStartsOn: 1})
          : startOfMonth(selectedDates[0])
      )
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, handleClickOutside, periodType, selectedDates])

  // Réinitialise la sélection à la période courante
  const handleReset = useCallback(() => {
    const newDate = getInitialDate(periodType)
    setSelectedDates([newDate])
    setRange(getRange([newDate], periodType))
  }, [periodType])

  const handlePeriodTypeChange = useCallback(type => {
    setPeriodType(type)
    const newDate = getInitialDate(type)
    setSelectedDates([newDate])
    setRange(getRange([newDate], type))
    // On force le focus sur la semaine ou le mois courant
    setDisplayMonth(
      type === 'week'
        ? startOfWeek(newDate, {weekStartsOn: 1})
        : startOfMonth(newDate)
    )
  }, [])

  const handleSelection = useCallback(days => {
    if (!Array.isArray(days)) {
      return
    }

    const normalizedDates = days.map(day =>
      periodType === 'month' ? startOfMonth(day) : startOfWeek(day, {weekStartsOn: 1})
    )
    const uniqueDates = normalizedDates.filter(
      (date, index, arr) => arr.findIndex(d => d.getTime() === date.getTime()) === index
    )
    const lastClickedDate = normalizedDates.at(-1)
    if (
      selectedDates.length === 1
      && uniqueDates.length === 0
      && selectedDates[0].getTime() === lastClickedDate?.getTime()
    ) {
      return
    }

    const updatedDates = selectedDates.some(d => d.getTime() === lastClickedDate?.getTime())
      ? selectedDates.filter(d => d.getTime() !== lastClickedDate.getTime())
      : uniqueDates.slice(0, maxSelection)
    if (updatedDates.length === 0) {
      return
    }

    setSelectedDates(updatedDates)
    setRange(getRange(updatedDates, periodType))
  }, [periodType, maxSelection, selectedDates])

  return (
    <Box className='relative'>
      <Box className='flex flex-col gap-1'>
        <Typography>Sélectionner une période</Typography>
        <Button
          ref={toggleButtonRef}
          className='fr-input w-fit'
          aria-label='Ouvrir le sélecteur de période'
          onClick={() => setOpen(!open)}
        >
          {displayedValue || 'Valeur non définie'}
        </Button>
      </Box>
      {open && (
        <Box
          ref={pickerRef}
          className='absolute z-50 bg-white border rounded shadow-lg p-4 flex items-end flex-col'
        >
          <Box className='w-full flex flex-col gap-4'>
            {hint && <Notice iconDisplayed className='w-full' severity='info' description={hint} />}

            <Select
              label='Type de période'
              nativeSelectProps={{onChange: e => handlePeriodTypeChange(e.target.value), value: periodType}}
              className='w-full mb-3'
            >
              <option value='month'>Mois</option>
              <option value='week'>Semaine</option>
            </Select>
          </Box>
          <DayPicker
            key={displayMonth?.toISOString()} // Ajouté pour forcer le recalcul
            mode='multiple'
            selected={selectedDates}
            defaultMonth={displayMonth}
            disabled={{after: today}}
            modifiers={modifiers}
            numberOfMonths={2}
            locale={fr}
            modifiersClassNames={{
              today: 'font-bold',
              selected: 'hover:text-black',
              range: 'bg-blue-50',
              range_start: 'bg-blue-900 text-white rounded-full font-bold',
              range_end: 'bg-blue-900 text-white rounded-full font-bold hover:text-black',
              range_row_start: 'rounded-l-full',
              range_row_end: 'rounded-r-full'
            }}
            onSelect={handleSelection}
          />
          <Button priority='tertiary' className='mt-2' onClick={handleReset}>Réinitialiser</Button>
        </Box>
      )}
    </Box>
  )
}

export default DatePicker
