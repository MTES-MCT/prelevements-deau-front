'use client'

import {useMemo} from 'react'

import {fr} from '@codegouvfr/react-dsfr'
import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Box, Typography} from '@mui/material'
import {parseISO, format} from 'date-fns'
import {
  isEqual, keyBy, union, some as _some
} from 'lodash-es'

import CalendarGrid from '@/components/calendar-grid.js'
import {formatNumber} from '@/utils/number.js'

/**
 * Indique si une entrée contient au moins une valeur numérique valide.
 */
function hasValues(entry) {
  return (
    entry
      && (_some(entry.values, v => !Number.isNaN(v))
        || (entry.fifteenMinutesValues || []).length > 0)
  )
}

/**
 * Détermine la couleur d’un jour donné selon la présence / égalité des données.
 */
function determineColor(currentEntry, previousEntry) {
  const hasCurrent = hasValues(currentEntry)
  const hasPrevious = hasValues(previousEntry)

  if (!hasCurrent && !hasPrevious) {
    return 'grey'
  } // Aucune déclaration (gris)

  if (hasCurrent && !hasPrevious) {
    return fr.colors.decisions.text.actionHigh.blueFrance.default
  } // Nouvelle déclaration (bleu)

  if (!hasCurrent && hasPrevious) {
    return fr.colors.decisions.background.flat.success.default
  } // Déclaration déjà existante (vert)

  // Les deux jeux de données existent : identiques ?
  const identical
     = isEqual(currentEntry.values, previousEntry.values)
     && isEqual(
       currentEntry.fifteenMinutesValues,
       previousEntry.fifteenMinutesValues
     )

  return identical
    ? fr.colors.decisions.background.flat.success.default // Déclaration inchangée (vert)
    : fr.colors.decisions.background.flat.warning.default // Déclaration en conflit (orange)
}

/**
  * Construit le tableau attendu par <CalendarGrid/> en fusionnant data & previousData.
  */
export function transformDataToCalendarData(data = {}, previousData = {}) {
  const currentByDate = keyBy(data.dailyValues || [], 'date')
  const previousByDate = keyBy(previousData.dailyValues || [], 'date')
  const allDates = union(Object.keys(currentByDate), Object.keys(previousByDate))

  return allDates.map(isoDate => {
    const current = currentByDate[isoDate]
    const previous = previousByDate[isoDate]
    const color = determineColor(current, previous)

    return {
      date: format(parseISO(isoDate), 'dd-MM-yyyy'),
      values: current?.values ?? previous?.values ?? [],
      fifteenMinutesValues:
         current?.fifteenMinutesValues ?? previous?.fifteenMinutesValues ?? [],
      color

    }
  })
}

/**
  * Composant visuel principal.
  */
const PrelevementsCalendar = ({data, previousData}) => {
  const calendarData = useMemo(() => {
    const hasAnyData
       = (data?.dailyValues?.length ?? 0) > 0
       || (previousData?.dailyValues?.length ?? 0) > 0

    return hasAnyData
      ? transformDataToCalendarData(data, previousData)
      : null
  }, [data, previousData])

  if (!calendarData) {
    return (
      <Alert severity='warning' description='Aucune donnée de prélèvement n’a été trouvée.' />
    )
  }

  const dailyParameters
     = data?.dailyParameters?.length > 0
       ? data.dailyParameters
       : previousData?.dailyParameters ?? []

  return (
    <CalendarGrid
      data={calendarData}
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
            {dailyParameters.map((param, index) => (
              <Typography key={param.nom_parametre}>
                {param.nom_parametre} :{' '}
                {Number.isNaN(values[index])
                  ? '—'
                  : formatNumber(
                    values[index],
                    values[index] < 1 && values[index] !== 0
                      ? {maximumFractionDigits: 2, minimumFractionDigits: 2}
                      : {}

                  )}{' '}
                m³
                {warnings[index] && (
                  <Box component='span' className='fr-icon-warning-fill' />
                )}
              </Typography>
            ))}
          </>
        )
      }}
    />
  )
}

export default PrelevementsCalendar
