'use client'

import {fr} from '@codegouvfr/react-dsfr'
import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {
  Box, Typography
} from '@mui/material'
import {parseISO, format} from 'date-fns'

import CalendarGrid from '@/components/calendar-grid.js'
import {formatNumber} from '@/utils/number.js'

function determineColor(values, fifteenMinutesValues, dailyParameters) {
  const hasNegativeValue = values.some(v => v < 0)
  if (hasNegativeValue) {
    return fr.colors.decisions.background.flat.error.default
  }

  const volumePreleveParam = dailyParameters?.find(p => p.nom_parametre === 'volume prélevé')
  const volumePreleveIndex = volumePreleveParam ? dailyParameters.indexOf(volumePreleveParam) : -1

  const hasAnyData = values.some(v => Number.isNaN(v)) || (fifteenMinutesValues?.length > 0)

  if (volumePreleveIndex > -1 && !Number.isNaN(values[volumePreleveIndex])) {
    // Bleu si la donnée journalière pour le volume prélevé est présente
    return fr.colors.decisions.text.actionHigh.blueFrance.default
  }

  if (hasAnyData) {
    // Orange s'il y a d'autres données mais pas le volume prélevé journalier
    return fr.colors.decisions.background.flat.warning.default
  }

  // Gris si aucune donnée
  return 'grey'
}

export function transformOutJsonToCalendarData(outJson) {
  const daily = outJson.dailyValues || []
  return daily.map(({date, values, fifteenMinutesValues}) => {
    // Reformattage de la date pour dd-MM-yyyy
    const dateKey = format(parseISO(date), 'dd-MM-yyyy')
    const color = determineColor(values, fifteenMinutesValues, outJson.dailyParameters)
    return {
      date: dateKey,
      values,
      fifteenMinutesValues,
      color
    }
  })
}

const PrelevementsCalendar = ({data}) => {
  if (data.dailyValues && data.dailyValues.length === 0) {
    return (
      <Alert severity='warning' description='Aucune donnée de prélèvement n’a été trouvée.' />
    )
  }

  return (
    <CalendarGrid
      data={transformOutJsonToCalendarData(data)}
      renderCustomTooltipContent={({date, dayStyleEntry}) => {
        if (!dayStyleEntry) {
          return (
            <>
              <strong>{date.toLocaleDateString('fr-FR')}</strong>
              <Typography>
                <Box component='span' className='fr-icon-warning-fill' /> Aucun donnée
              </Typography>
            </>
          )
        }

        const {values} = dayStyleEntry
        const warnings = values.map(v => v === null || v === undefined || v < 0)

        return (
          <>
            <strong>{date.toLocaleDateString('fr-FR')}</strong>
            {Object.keys(data.dailyParameters).map(paramIndex => (
              <Typography key={paramIndex}>
                {data.dailyParameters[paramIndex].nom_parametre} : {Number.isNaN(values[paramIndex])
                  ? '—'
                  : formatNumber(values[paramIndex], values[paramIndex] < 1 && values[paramIndex] !== 0 ? {maximumFractionDigits: 2, minimumFractionDigits: 2} : {})} m³
                {warnings[0] && <Box component='span' className='fr-icon-warning-fill' />}
              </Typography>
            ))}
          </>
        )
      }}
    />
  )
}

export default PrelevementsCalendar
