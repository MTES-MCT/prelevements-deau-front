import {fr} from '@codegouvfr/react-dsfr'
import {Box, Typography} from '@mui/material'

// Trouve les indices des années sélectionnées
const getSelectedYearIndices = (years, isPeriodSelected) =>
  years
    .map((year, idx) => isPeriodSelected(year) ? idx : null)
    .filter(idx => idx !== null)

const YearsView = ({years, isPeriodSelected, handlePeriodClick}) => {
  const selectedIndices = getSelectedYearIndices(years, isPeriodSelected)
  const firstSelected = selectedIndices[0]
  const lastSelected = selectedIndices.at(-1)

  return (
    <Box className='flex flex-col gap-1'>
      <Typography sx={{fontWeight: 700}}>
        {years.length > 1 ? `${years[0]} - ${years.at(-1)}` : years[0]}
      </Typography>

      <Box className='grid grid-cols-5'>
        {years.map((year, idx) => {
          const isSelected = isPeriodSelected(year)
          const isFirstSelected = idx === firstSelected
          const isLastSelected = idx === lastSelected

          let yearClass = 'text-center p-3 text-xs mt-1 cursor-pointer'
          let yearStyle = {}

          if (idx % 5 === 0) {
            yearClass += ' rounded-l-full'
          }

          if (idx % 5 === 4) {
            yearClass += ' rounded-r-full'
          }

          if (isSelected) {
            if (isFirstSelected || isLastSelected) {
              yearClass += ' rounded-full'
              yearStyle = {
                background: fr.colors.decisions.background.active.blueFrance.default,
                color: fr.colors.decisions.background.default.grey.default
              }
            } else {
              yearStyle = {
                background: fr.colors.decisions.background.contrast.blueEcume.default,
                color: fr.colors.decisions.background.active.blueFrance.default
              }
            }
          }

          return (
            <Box
              key={year}
              className={yearClass}
              style={yearStyle}
              onClick={() => handlePeriodClick(year)}
            >
              <Typography>{year}</Typography>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

export default YearsView
