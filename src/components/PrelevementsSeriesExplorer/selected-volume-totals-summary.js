'use client'

import {Box, Typography} from '@mui/material'

const STATUS_LABELS = {
  loading: 'Chargement…',
  error: 'Total indisponible'
}

const SelectedVolumeTotalsSummary = ({totals = [], locale = 'fr-FR'}) => {
  const displayedTotals = totals.filter(total => total.status !== 'empty')

  if (displayedTotals.length === 0) {
    return null
  }

  const formatter = new Intl.NumberFormat(locale, {maximumFractionDigits: 0})

  return (
    <Box
      role='group'
      aria-label='Totaux sur la période affichée'
      aria-live='polite'
      sx={{display: 'flex', flexWrap: 'wrap', columnGap: 2, rowGap: 0.5}}
    >
      {displayedTotals.map(total => (
        <Typography
          key={total.parameterId}
          variant='body2'
          sx={{color: 'text.secondary'}}
        >
          {total.label} :{' '}
          <Box
            component='span'
            sx={{
              color: total.status === 'ready' ? (total.color ?? 'text.primary') : 'text.secondary',
              fontWeight: total.status === 'ready' ? 600 : 400,
              fontVariantNumeric: 'tabular-nums'
            }}
          >
            {total.status === 'ready'
              ? `${formatter.format(total.value)} m³`
              : STATUS_LABELS[total.status]}
          </Box>
        </Typography>
      ))}
    </Box>
  )
}

export default SelectedVolumeTotalsSummary
