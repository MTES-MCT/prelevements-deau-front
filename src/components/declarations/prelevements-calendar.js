'use client'

import {useCallback, useMemo} from 'react'

import {fr} from '@codegouvfr/react-dsfr'
import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {Divider, Typography} from '@mui/material'
import {parseISO, format} from 'date-fns'
import {
  isEqual, keyBy, union, some as _some
} from 'lodash-es'

import CalendarGrid from '@/components/calendar-grid.js'
import {formatNumber} from '@/utils/number.js'

/* ------------------------------------------------------------------ */
/* Utils                                                              */
/* ------------------------------------------------------------------ */

/** Retourne vrai si la valeur représente une déclaration (0 accepté). */
function isDeclared(value) {
  return value !== null && value !== undefined && !Number.isNaN(value)
}

/** Indique si une entrée contient au moins une valeur (journalière ou 15 min). */
function hasValues(entry) {
  return (
    entry
    && (_some(entry.values, isDeclared)
      || (entry.fifteenMinutesValues || []).length > 0)
  )
}

/** Détermine la couleur d’un jour donné selon la présence / égalité des données. */
function determineColor(currentEntry, previousEntry) {
  const hasCurrent = hasValues(currentEntry)
  const hasPrevious = hasValues(previousEntry)

  if (!hasCurrent && !hasPrevious) {
    return 'grey' // Aucune déclaration
  }

  if (hasCurrent && !hasPrevious) {
    return fr.colors.decisions.text.actionHigh.blueFrance.default // Nouvelle
  }

  if (!hasCurrent && hasPrevious) {
    return fr.colors.decisions.background.flat.success.default // Existante
  }

  // Les deux jeux existent : identiques ?
  const identical
    = isEqual(currentEntry.values, previousEntry.values)
    && isEqual(
      currentEntry.fifteenMinutesValues,
      previousEntry.fifteenMinutesValues
    )

  return identical
    ? fr.colors.decisions.background.flat.success.default // Identique
    : fr.colors.decisions.background.flat.warning.default // Conflit
}

/* ---------- Tooltip helpers to keep render function simple ---------- */

function buildJournalierItems(params, current, previous) {
  const journalier = []
  const previousJournalier = []

  for (const [idx, param] of params.entries()) {
    const val = isDeclared(current[idx]) ? current[idx] : previous[idx]
    if (isDeclared(val)) {
      journalier.push(
        <li key={`day-${idx}`}>
          • {param.nom_parametre} : {formatNumber(val)} {param.unite ?? ''}
        </li>
      )
    }

    const delta
      = isDeclared(current[idx]) && isDeclared(previous[idx])
        ? current[idx] - previous[idx]
        : null

    previousJournalier.push(
      <li key={`prev-day-${idx}`}>
        • {param.nom_parametre} : {formatNumber(previous[idx])} {param.unite ?? ''}
        {delta !== null && delta !== 0 && (
          <> (Δ {delta > 0 ? '+' : ''}{formatNumber(delta)} {param.unite ?? ''})</>
        )}
      </li>
    )
  }

  return {journalier, previousJournalier}
}

function buildMinuteItems(params, curr15, prev15) {
  const items = []
  for (const [idx, param] of params.entries()) {
    const currSeg = curr15.map(seg => seg?.values?.[idx])
    const prevSeg = prev15.map(seg => seg?.values?.[idx])
    const hasMinute
      = currSeg.some(v => isDeclared(v)) || prevSeg.some(v => isDeclared(v))
    if (hasMinute) {
      items.push(
        <li key={`min-${idx}`}>
          • {param.nom_parametre} en {param.unite ?? ''}
        </li>
      )
    }
  }

  return items
}

function detectConflicts(current, previous, curr15, prev15) {
  const daily = current.some(
    (v, i) => isDeclared(v) && isDeclared(previous[i]) && v !== previous[i]
  )

  const minute = current.some((_, idx) => {
    const c = curr15.map(seg => seg?.values?.[idx])
    const p = prev15.map(seg => seg?.values?.[idx])
    return !isEqual(c, p)
  })

  return {daily, minute}
}

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
      currentValues: current?.values ?? [],
      previousValues: previous?.values ?? [],
      currentFifteenMinutesValues: current?.fifteenMinutesValues ?? [],
      previousFifteenMinutesValues: previous?.fifteenMinutesValues ?? [],
      // Legacy :
      values: current?.values ?? previous?.values ?? [],
      fifteenMinutesValues:
        current?.fifteenMinutesValues ?? previous?.fifteenMinutesValues ?? [],
      color
    }
  })
}

const PrelevementsCalendar = ({data, previousData}) => {
  const calendarData = useMemo(() => {
    const hasAny
      = (data?.dailyValues?.length ?? 0) > 0
      || (previousData?.dailyValues?.length ?? 0) > 0
    return hasAny ? transformDataToCalendarData(data, previousData) : null
  }, [data, previousData])

  const renderCustomTooltipContent = useCallback(({date, dayStyleEntry}) => {
    if (!dayStyleEntry) {
      return (
        <div className='flex flex-col gap-2'>
          <Typography>{date.toLocaleDateString('fr-FR')}</Typography>
          <Typography>Aucune donnée</Typography>
        </div>
      )
    }

    const {currentValues, previousValues} = dayStyleEntry
    const curr15 = dayStyleEntry.currentFifteenMinutesValues
    const prev15 = dayStyleEntry.previousFifteenMinutesValues

    const params
      = data?.dailyParameters?.length > 0
        ? data.dailyParameters
        : previousData?.dailyParameters ?? []

    const {journalier, previousJournalier} = buildJournalierItems(
      params,
      currentValues,
      previousValues
    )
    const minuteItems = buildMinuteItems(params, curr15, prev15)
    const {daily: dailyConflict, minute: minuteConflict} = detectConflicts(
      currentValues,
      previousValues,
      curr15,
      prev15
    )

    return (
      <div className='flex flex-col gap-2'>
        <Typography>{date.toLocaleDateString('fr-FR')}</Typography>

        {journalier.length > 0 && (
          <>
            <div>Prélèvement journalier :</div>
            <ul>{journalier}</ul>
          </>
        )}
        {(dailyConflict) && (
          <div>
            <span className='fr-icon-warning-fill' /> Cette déclaration est en conflit avec la précédente
          </div>
        )}
        {dailyConflict && previousJournalier.length > 0 && (
          <ul>{previousJournalier}</ul>
        )}

        <Divider component='div' />

        {minuteItems.length > 0 && (
          <>
            <div>Prélèvement 15 minutes :</div>
            <ul>{minuteItems}</ul>
          </>
        )}

        {(minuteConflict) && (
          <div>
            <span className='fr-icon-warning-fill' /> Au moins un des paramètres de cette déclaration est en conflit avec la précédente.
          </div>
        )}
      </div>
    )
  }, [data, previousData])

  if (!calendarData) {
    return (
      <Alert
        severity='warning'
        description='Aucune donnée de prélèvement n’a été trouvée.'
      />
    )
  }

  return (
    <CalendarGrid
      data={calendarData}
      renderCustomTooltipContent={renderCustomTooltipContent}
    />
  )
}

export default PrelevementsCalendar
