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

          // Pour arrondir les extrémités de chaque ligne
          const isFirstOfRow = idx % 5 === 0
          const isLastOfRow = idx % 5 === 4

          let yearClass = 'text-center p-3 text-xs mt-1 transition-colors'

          if (isSelected) {
            if (isFirstSelected || isLastSelected) {
              yearClass += ' bg-[#000091] text-white rounded-full'
            } else {
              yearClass += ' bg-[#DBE9F4]'
              // Arrondir les extrémités de la ligne sauf si début/fin sélection
              if (isFirstOfRow) {
                yearClass += ' rounded-l-full'
              }

              if (isLastOfRow) {
                yearClass += ' rounded-r-full'
              }
            }
          } else {
            yearClass += ' text-gray-600 hover:bg-gray-100 rounded'
            // Arrondir les extrémités de la ligne
            if (isFirstOfRow) {
              yearClass += ' rounded-l-full'
            }

            if (isLastOfRow) {
              yearClass += ' rounded-r-full'
            }
          }

          return (
            <Box key={year} className={yearClass} onClick={() => handlePeriodClick(year)}>
              <Typography>{year}</Typography>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

export default YearsView
