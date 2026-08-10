'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import {
  addDays,
  addMonths,
  buildMonthlyDateRangePresets,
  formatDateInput,
  getDateRangeLabel,
  getInclusiveDayCount,
  parseDateInput,
  startOfMonth
} from '@/lib/date-range.js'

const WEEKDAYS = [
  {key: 'monday', label: 'L'},
  {key: 'tuesday', label: 'M'},
  {key: 'wednesday', label: 'M'},
  {key: 'thursday', label: 'J'},
  {key: 'friday', label: 'V'},
  {key: 'saturday', label: 'S'},
  {key: 'sunday', label: 'D'}
]

function classNames(...values) {
  return values.filter(Boolean).join(' ')
}

function getMonthLabel(date) {
  return new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric'
  }).format(date)
}

function buildCalendarDays(monthDate) {
  const monthStart = startOfMonth(monthDate)
  const offset = (monthStart.getDay() + 6) % 7
  const firstDay = addDays(monthStart, -offset)

  return Array.from({length: 42}, (_, index) => addDays(firstDay, index))
}

function isSameDate(left, right) {
  return left && right && formatDateInput(left) === formatDateInput(right)
}

function isDateInRange(date, start, end) {
  if (!date || !start || !end) {
    return false
  }

  const time = date.getTime()
  return time >= start.getTime() && time <= end.getTime()
}

const DateRangePicker = ({
  align = 'left',
  className,
  disabled = false,
  endDate,
  hint = 'Sélectionnez la période couverte par le volume déclaré.',
  id = 'date-range',
  label = 'Période déclarée',
  maxDate,
  maxRangeDays = null,
  onChange,
  presets = null,
  presetsLabel = 'Périodes suggérées',
  startDate
}) => {
  const selectedStart = parseDateInput(startDate)
  const max = parseDateInput(maxDate)
  const [open, setOpen] = useState(false)
  const [draftStartDate, setDraftStartDate] = useState(startDate)
  const [draftEndDate, setDraftEndDate] = useState(endDate)
  const [hoveredDate, setHoveredDate] = useState(null)
  const [displayMonth, setDisplayMonth] = useState(() => startOfMonth(selectedStart ?? max ?? new Date()))
  const containerRef = useRef(null)
  const triggerRef = useRef(null)
  const calendarDays = useMemo(() => buildCalendarDays(displayMonth), [displayMonth])
  const availablePresets = useMemo(
    () => presets ?? buildMonthlyDateRangePresets(maxDate),
    [maxDate, presets]
  )
  const draftStart = parseDateInput(draftStartDate)
  const draftEnd = parseDateInput(draftEndDate)
  const hoveredEnd = draftStart && !draftEnd && hoveredDate && hoveredDate >= draftStart ? hoveredDate : null
  const previewEnd = draftEnd ?? hoveredEnd
  const previewEndDate = previewEnd ? formatDateInput(previewEnd) : ''

  const close = useCallback(({restoreFocus = false} = {}) => {
    setOpen(false)
    if (restoreFocus) {
      triggerRef.current?.focus()
    }
  }, [])

  useEffect(() => {
    if (!open) {
      return undefined
    }

    const handleClickOutside = event => {
      if (!containerRef.current?.contains(event.target)) {
        close()
      }
    }

    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close({restoreFocus: true})
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [close, open])

  const resetDraftRange = useCallback(() => {
    setDraftStartDate(startDate)
    setDraftEndDate(endDate)
    setHoveredDate(null)
  }, [endDate, startDate])

  const validateDraftRange = useCallback(() => {
    if (!draftStartDate || !draftEndDate) {
      return
    }

    onChange({startDate: draftStartDate, endDate: draftEndDate})
    setHoveredDate(null)
    close()
  }, [close, draftEndDate, draftStartDate, onChange])

  const cancelDraftRange = useCallback(() => {
    resetDraftRange()
    close()
  }, [close, resetDraftRange])

  const handleDayClick = useCallback(day => {
    const dayValue = formatDateInput(day)

    if (!draftStart || draftEnd || day < draftStart) {
      setDraftStartDate(dayValue)
      setDraftEndDate('')
      setHoveredDate(null)
      return
    }

    setDraftEndDate(dayValue)
    setHoveredDate(null)
  }, [draftEnd, draftStart])

  const isDayDisabled = day => {
    if (max && day > max) {
      return true
    }

    if (!draftStart || draftEnd || !maxRangeDays || day < draftStart) {
      return false
    }

    return day > addDays(draftStart, maxRangeDays - 1)
  }

  const rangeIsValid = draftStartDate
    && draftEndDate
    && (!maxRangeDays || getInclusiveDayCount(draftStartDate, draftEndDate) <= maxRangeDays)

  return (
    <div ref={containerRef} className={classNames('relative min-w-0 sm:min-w-[320px]', className)}>
      {label && (
        <label className='fr-label' htmlFor={id}>
          <span>{label}</span>
          {hint && <span className='fr-hint-text'>{hint}</span>}
        </label>
      )}
      <button
        ref={triggerRef}
        id={id}
        className='fr-btn fr-input flex h-10 min-h-10 w-full items-center justify-between gap-2 overflow-hidden whitespace-nowrap text-left font-normal'
        disabled={disabled}
        type='button'
        aria-expanded={open}
        aria-haspopup='dialog'
        onClick={() => {
          if (!open) {
            resetDraftRange()
            setDisplayMonth(startOfMonth(selectedStart ?? max ?? new Date()))
          }

          setOpen(value => !value)
        }}
      >
        <span className='min-w-0 flex-1 truncate'>{getDateRangeLabel(startDate, endDate)}</span>
        <span className='fr-icon-calendar-line shrink-0' aria-hidden='true' />
      </button>

      {open && (
        <div
          aria-label='Choisir une période'
          className={classNames(
            'absolute top-[calc(100%+0.25rem)] z-[9999] w-[min(22rem,calc(100vw-2rem))] border border-[var(--border-default-grey)] bg-[var(--background-default-grey)] p-3 shadow-md',
            align === 'right' ? 'right-0' : 'left-0'
          )}
          role='dialog'
        >
          {availablePresets.length > 0 && (
            <div className='mb-3'>
              <p className='fr-mb-1v text-xs font-medium text-[var(--text-title-grey)]'>{presetsLabel}</p>
              <div className='flex flex-wrap gap-1.5'>
                {availablePresets.map(preset => (
                  <button
                    key={`${preset.label}-${preset.startDate}-${preset.endDate}`}
                    className='fr-btn fr-btn--secondary fr-btn--sm'
                    type='button'
                    onClick={() => {
                      setDraftStartDate(preset.startDate)
                      setDraftEndDate(preset.endDate)
                      setHoveredDate(null)
                      setDisplayMonth(startOfMonth(parseDateInput(preset.startDate)))
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className='mb-2 flex items-center justify-between gap-2'>
            <button
              aria-label='Mois précédent'
              className='fr-btn fr-btn--tertiary-no-outline fr-btn--sm'
              type='button'
              onClick={() => setDisplayMonth(month => addMonths(month, -1))}
            >
              <span className='fr-icon-arrow-left-s-line' aria-hidden='true' />
            </button>
            <p className='fr-mb-0 text-sm font-semibold capitalize'>{getMonthLabel(displayMonth)}</p>
            <button
              aria-label='Mois suivant'
              className='fr-btn fr-btn--tertiary-no-outline fr-btn--sm'
              disabled={max && startOfMonth(addMonths(displayMonth, 1)) > startOfMonth(max)}
              type='button'
              onClick={() => setDisplayMonth(month => addMonths(month, 1))}
            >
              <span className='fr-icon-arrow-right-s-line' aria-hidden='true' />
            </button>
          </div>

          <div className='grid grid-cols-7 gap-0.5 text-center text-xs font-medium text-[var(--text-mention-grey)]'>
            {WEEKDAYS.map(day => <span key={day.key}>{day.label}</span>)}
          </div>
          <div className='mt-1 grid grid-cols-7 gap-0.5' onMouseLeave={() => setHoveredDate(null)}>
            {calendarDays.map(day => {
              const dateValue = formatDateInput(day)
              const outsideMonth = day.getMonth() !== displayMonth.getMonth()
              const dayDisabled = isDayDisabled(day)
              const selected = isSameDate(day, draftStart) || isSameDate(day, draftEnd) || isSameDate(day, hoveredEnd)
              const inRange = isDateInRange(day, draftStart, previewEnd)

              return (
                <button
                  key={dateValue}
                  aria-pressed={selected}
                  className={classNames(
                    'h-7 rounded text-xs transition',
                    outsideMonth && 'text-[var(--text-mention-grey)]',
                    !dayDisabled && !selected && !inRange && 'hover:bg-[var(--background-alt-blue-france)]',
                    inRange && !selected && 'bg-[var(--background-contrast-blue-ecume)] text-[var(--background-active-blue-france)]',
                    selected && 'rounded-full bg-[var(--background-active-blue-france)] font-semibold text-white',
                    dayDisabled && 'cursor-not-allowed text-gray-300'
                  )}
                  disabled={dayDisabled}
                  type='button'
                  onMouseEnter={() => setHoveredDate(day)}
                  onClick={() => handleDayClick(day)}
                >
                  {day.getDate()}
                </button>
              )
            })}
          </div>

          <div className='fr-mt-2w border-t border-[var(--border-default-grey)] pt-3'>
            <p className='fr-mb-2w min-h-4 text-xs font-medium text-[var(--background-active-blue-france)]'>
              {draftStartDate ? getDateRangeLabel(draftStartDate, previewEndDate) : 'Sélectionnez une date de début'}
            </p>
            <div className='flex flex-col gap-2 sm:flex-row sm:justify-end'>
              <button className='fr-btn fr-btn--secondary fr-btn--sm' type='button' onClick={cancelDraftRange}>
                Annuler
              </button>
              <button
                className='fr-btn fr-btn--sm'
                disabled={!rangeIsValid}
                type='button'
                onClick={validateDraftRange}
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DateRangePicker
