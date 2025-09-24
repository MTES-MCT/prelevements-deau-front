import {Button} from '@codegouvfr/react-dsfr/Button'
import Tooltip from '@codegouvfr/react-dsfr/Tooltip'
import {Box, Typography} from '@mui/material'
import {groupBy, uniqueId} from 'lodash'

import {daysInMonth, firstDayOfMonth} from '@/lib/format-date.js'

const monthLabels = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre'
]

const MonthView = ({
  periods,
  zoomOut,
  isPeriodSelected,
  handlePeriodClick
}) => {
  const periodsGroupedByYear = groupBy(periods, 'year')

  // Fonction pour déterminer les périodes sélectionnées
  const getSelectedPeriods = () => periods.filter(period => isPeriodSelected(period))

  // Fonction pour vérifier si un jour spécifique est le premier ou le dernier de la sélection
  const isDayBoundaryOfSelection = (year, month, day) => {
    const selectedPeriods = getSelectedPeriods()
    if (selectedPeriods.length === 0) {
      return {isFirstDay: false, isLastDay: false}
    }

    // Trier les périodes sélectionnées par année puis par mois
    const sortedPeriods = [...selectedPeriods].sort((a, b) => {
      if (a.year !== b.year) {
        return a.year - b.year
      }

      return a.month - b.month
    })

    const firstPeriod = sortedPeriods[0]
    const lastPeriod = sortedPeriods.at(-1)

    const isFirstDay = year === firstPeriod.year && month === firstPeriod.month && day === 1
    const isLastDay = year === lastPeriod.year && month === lastPeriod.month && day === daysInMonth(lastPeriod.year, lastPeriod.month)

    return {isFirstDay, isLastDay}
  }

  return (
    <Box className='flex flex-col gap-4'>
      {Object.entries(periodsGroupedByYear).map(([year, monthPeriods]) => (
        <Box key={year} className='space-y-4'>
          <Box className='flex items-center gap-1'>
            {zoomOut && (
              <Tooltip title='Retour à la vue années'>
                <Button
                  label='Dézoom'
                  priority='tertiary no outline'
                  iconId='fr-icon-arrow-left-s-line'
                  onClick={zoomOut}
                />
              </Tooltip>
            )}
            <Typography sx={{fontWeight: 700}}>{year}</Typography>
          </Box>

          <Box className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6'>
            {monthPeriods.map(period => {
              const isSelected = isPeriodSelected(period)
              const totalDays = daysInMonth(period.year, period.month)
              const startOffset = (firstDayOfMonth(period.year, period.month) + 6) % 7

              return (
                <Box key={`${period.year}-${period.month}`}>
                  <Typography sx={{fontWeight: 700}}>{monthLabels[period.month]} {period.year}</Typography>
                  <Box onClick={() => handlePeriodClick(period)}>
                    <Box className='grid grid-cols-7 text-xs'>
                      {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(day => (
                        <Box key={uniqueId()} className='text-center p-1'>
                          {day}
                        </Box>
                      ))}
                      {Array.from({length: startOffset}).map(() => (
                        <Box key={uniqueId()} className='p-1' />
                      ))}
                      {Array.from({length: totalDays}).map((_, day) => {
                        const dayNumber = day + 1
                        const dayPosition = (startOffset + day) % 7 // Position dans la semaine (0=lundi, 6=dimanche)
                        const isFirstOfWeek = dayPosition === 0
                        const isLastOfWeek = dayPosition === 6

                        // Vérifier si ce jour est le premier ou le dernier de la sélection globale
                        const {isFirstDay, isLastDay} = isDayBoundaryOfSelection(period.year, period.month, dayNumber)

                        let dayClass = 'text-center p-1 text-xs mt-1'

                        if (isSelected) {
                          if (isFirstDay || isLastDay) {
                            dayClass += ' bg-[#000091] text-white rounded-full'
                          } else {
                            dayClass += ' bg-[#DBE9F4] text-[#000091]'
                            if (isFirstOfWeek) {
                              dayClass += ' rounded-l-full'
                            } else if (isLastOfWeek) {
                              dayClass += ' rounded-r-full'
                            }
                          }
                        } else {
                          dayClass += ' text-gray-600 hover:bg-gray-100 rounded'
                        }

                        return (
                          <Box key={`${period.year}-${period.month}-${dayNumber}`} className={dayClass}>
                            {dayNumber}
                          </Box>
                        )
                      })}
                    </Box>
                  </Box>
                </Box>
              )
            })}
          </Box>
        </Box>
      ))}
    </Box>
  )
}

export default MonthView
