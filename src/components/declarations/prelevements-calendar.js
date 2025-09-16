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

/** Retourne vrai si la valeur représente une déclaration (0 accepté). */
function isDeclared(value) {
  return value !== null && value !== undefined && !Number.isNaN(value)
}

/** Indique si une entrée contient au moins une valeur (journalière ou 15min). */
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

/**
 * Construit deux listes <li> :
 *  - journalier : valeurs « à afficher » (priorité à data courante, sinon précédente)
 *  - previousJournalier : valeurs issues de previousData, avec delta vis‑à‑vis de la valeur courante
 *
 * @param {Array} params   Tableau des paramètres {nom_parametre, unite, …}
 * @param {Array} current  Tableau des valeurs courantes (data)
 * @param {Array} previous Tableau des valeurs précédentes (previousData)
 * @returns {{journalier: ReactNode[], previousJournalier: ReactNode[]}}
 */
function buildJournalierItems(params, current, previous) {
  const journalier = []
  const previousJournalier = []

  for (const [idx, param] of params.entries()) {
    // Choisit la valeur à afficher : priorité aux données courantes
    const val = isDeclared(current[idx]) ? current[idx] : previous[idx]
    if (isDeclared(val)) {
      journalier.push(
        <li key={`day-${idx}`}>
          • {param.nom_parametre} : {formatNumber(val)} {param.unite ?? ''}
        </li>
      )
    }

    // Calcule le delta lorsque les deux jeux de données possèdent une valeur
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

/**
 * Retourne la liste <li> des paramètres ayant au moins une valeur 15min
 * (courante ou précédente). Les vraies valeurs ne sont pas affichées,
 * seul le nom du paramètre + unité est indiqué.
 */
function buildMinuteItems(params, curr15, prev15) {
  const items = []
  for (const [idx, param] of params.entries()) {
    // Vérifie la présence d'au moins une valeur déclarée à la maille 15min
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

/**
 * Détermine s’il existe :
 *  - un conflit « journalière » (différence de valeurs)
 *  - un conflit « 15min » (différence de séries)
 *
 * @returns {{daily: boolean, minute: boolean}}
 */
function detectConflicts(current, previous, curr15, prev15) {
  // Conflit journalier : deux valeurs déclarées différentes
  const daily = current.some(
    (v, i) => isDeclared(v) && isDeclared(previous[i]) && v !== previous[i]
  )

  const minute = current.some((_, idx) => {
    const cSeries = curr15.map(seg => seg?.values?.[idx])
    const pSeries = prev15.map(seg => seg?.values?.[idx])

    const cHas = cSeries.some(val => isDeclared(val))
    const pHas = pSeries.some(val => isDeclared(val))

    if (!(cHas && pHas)) {
      return false // Pas de données de part et d'autre => pas de conflit
    }

    return !isEqual(cSeries, pSeries)
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
            <div>Prélèvement 15minutes :</div>
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
