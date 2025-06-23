'use client'

import {
  useMemo, useState, useEffect
} from 'react'

import {
  Box, Divider, ToggleButton, ToggleButtonGroup, Slider
} from '@mui/material'
import {LineChart} from '@mui/x-charts'
import {
  format, parseISO, differenceInHours, startOfDay, endOfDay, addDays, differenceInCalendarDays, isSameDay,
  addHours
} from 'date-fns'
import {fr} from 'date-fns/locale'
import {uniqBy} from 'lodash-es'

import {buildSeries} from '@/utils/chart.js'
import {formatNumber} from '@/utils/number.js'

const ParameterTrendChart = ({data}) => {
  // ---------- Données brutes ----------
  const {
    dailyValues = [], dailyParameters = [],
    fifteenMinutesParameters = [], // On garde la méta
    fifteenMinutesValues: root15m = [] // Peut exister ou non
  } = data ?? {}

  // ---------- Construction dynamique des 15 min ----------
  const built15m = useMemo(() => {
    if (root15m.length > 0) {
      return root15m
    }

    return dailyValues.flatMap(d =>
      (d.fifteenMinutesValues ?? []).map(step => ({
        // On concatène date + heure pour obtenir un timestamp ISO valable
        date: `${d.date}T${step.heure}`,
        values: step.values
      }))
    )
  }, [root15m, dailyValues])

  // ---------- Fallback paramètres 15 min ----------
  const effective15minParameters
  = fifteenMinutesParameters.length > 0
    ? fifteenMinutesParameters
    : dailyParameters // On réutilise ceux du journalier

  // ---------- Sélecteur de granularité ----------
  const [resolution, setResolution] = useState(
    dailyValues.length > 0 ? 'daily' : '15min'
  )

  // Jeux de données selon la granularité
  const values = resolution === 'daily' ? dailyValues : built15m

  const parameters = resolution === 'daily'
    ? dailyParameters
    : effective15minParameters

  // ---------- Pré‑calculs & remplissage dates manquantes ----------
  const originalXData = values.map(d => parseISO(d.date))
  const originalValues = values
  const [xData, filledValues] = useMemo(() => {
    if (resolution === 'daily') {
      const startDate = startOfDay(originalXData[0])
      const endDate = startOfDay(originalXData.at(-1))
      const totalDays = differenceInCalendarDays(endDate, startDate)
      const allDates = Array.from({length: totalDays + 1}, (_, i) => addDays(startDate, i))
      const allValues = allDates.map(date => {
        const idx = originalXData.findIndex(d => isSameDay(d, date))
        if (idx !== -1) {
          return originalValues[idx]
        }

        // Pas de données : on renvoie un placeholder avec valeurs nulles
        return {values: originalValues[0].values.map(() => null)}
      })
      return [allDates, allValues]
    }

    return [originalXData, originalValues]
  }, [resolution, originalXData, originalValues])

  const [period, setPeriod] = useState(() => ({
    start: xData[0],
    end: xData.at(-1)
  }))
  const startIdx = xData.findIndex(d => d >= period.start)
  const endIdx = xData.findLastIndex(d => d <= period.end)

  // Liste complète des paramètres disponibles
  const paramList = parameters.filter(Boolean)

  // ---------- États d’interaction ----------
  // 1. Paramètres sélectionnés (max 2, même unité)
  const [selectedParams, setSelectedParams] = useState(
    paramList.length > 0 ? [paramList[0].nom_parametre] : []
  )

  // Ré‑initialise la sélection lorsqu’on change la granularité
  useEffect(() => {
    setSelectedParams(paramList.length > 0 ? [paramList[0].nom_parametre] : [])
    // Le changement de paramList est induit par resolution et éviter boucle infinie
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolution])

  // ---------- Construction des séries ----------
  const slicedValues = filledValues.slice(startIdx, endIdx + 1)
  const slicedXData = xData.slice(startIdx, endIdx + 1)

  const visibleParameters = parameters
    .filter(p => selectedParams.includes(p.nom_parametre))

  const unitsInUse = useMemo(() => [...new Set(visibleParameters.map(p => p.unite))], [visibleParameters])

  // Limiter à deux unités maximum pour les axes
  const axisUnits = useMemo(() => unitsInUse.slice(0, 2), [unitsInUse])

  const unitToAxisId = useMemo(() => {
    const mapping = {}
    for (const u of axisUnits) {
      mapping[u] = u
    }

    return mapping
  }, [axisUnits])

  // Durée de la fenêtre (heures) pour formatter l’axe X
  const diffH = slicedXData.length > 1
    ? differenceInHours(slicedXData.at(-1), slicedXData[0])
    : 0

  // Mémoiser la construction des séries pour éviter les recalculs inutiles
  const rawSeries = useMemo(() => buildSeries({
    parameters: visibleParameters,
    allParameters: parameters,
    values: slicedValues,
    unitToAxisId
  }), [visibleParameters, parameters, slicedValues, unitToAxisId])

  const series = useMemo(
    () => rawSeries.map(s => {
      const param = visibleParameters.find(p => p.nom_parametre === s.id)
      return {
        ...s,
        yAxisId: unitToAxisId[param.unite]
      }
    }),
    [rawSeries, visibleParameters, unitToAxisId]
  )

  // Mémoiser la configuration des axes selon les unités en usage
  const yAxis = useMemo(() =>
    axisUnits.map((u, i) => ({
      id: u,
      label: u,
      position: i === 0 ? 'left' : 'right',
      min: 0,
      valueFormatter: v => formatNumber(v, {maximumFractionDigits: v > 10 ? 0 : 1})
    })),
  [axisUnits])

  // ---------- Callbacks ----------
  const handleParamChange = newSelection => {
    if (!Array.isArray(newSelection) || newSelection.length === 0) {
      return
    }

    // Filtrer les sélections invalides
    const filteredSelection = newSelection.filter(name => name !== null)
    if (filteredSelection.length === 0) {
      return
    }

    // Empêcher plus de deux unités distinctes
    const nextUnits = new Set(
      filteredSelection
        .map(name => {
          const p = parameters.find(p => p.nom_parametre === name)
          return p?.unite
        })
        .filter(u => u !== null)
    )
    if (nextUnits.size > 2) {
      return
    }

    setSelectedParams(filteredSelection)
  }

  useEffect(() => {
    if (resolution === 'daily'
        && differenceInHours(period.end, period.start) < 24) {
      const dayStart = startOfDay(period.start)
      const dayEnd = addHours(endOfDay(period.start), 1)
      setPeriod(prev => {
        if (prev.start.getTime() !== dayStart.getTime() || prev.end.getTime() !== dayEnd.getTime()) {
          return {start: dayStart, end: dayEnd}
        }

        return prev
      })
    }
  }, [resolution]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Rendering ----------
  if (values.length === 0) {
    return null
  }

  const handleRangeChange = (event, newValue, activeThumb) => {
    const minSteps = resolution === 'daily' ? 1 : 4
    if (!Array.isArray(newValue)) {
      return
    }

    const [start, end] = newValue
    if (end - start < minSteps) {
      if (activeThumb === 0) {
        const clamped = Math.min(start, xData.length - 1 - minSteps)
        setPeriod({
          start: xData[clamped],
          end: xData[clamped + minSteps]
        })
      } else {
        const clamped = Math.max(end, minSteps)
        setPeriod({
          start: xData[clamped - minSteps],
          end: xData[clamped]
        })
      }
    } else {
      setPeriod({
        start: xData[start],
        end: xData[end]
      })
    }
  }

  return (
    <Box className='flex flex-col gap-4 mt-4'>
      <Divider textAlign='left'>Graphique de tendance des paramètres</Divider>

      {/* Sélecteur de granularité ----------------------------------------- */}
      <ToggleButtonGroup
        exclusive size='small'
        color='primary'
        value={resolution}
        onChange={(_, v) => v && setResolution(v)}
      >
        <ToggleButton value='daily'>Jour</ToggleButton>
        <ToggleButton value='15min' disabled={built15m.length === 0} >15 min</ToggleButton>
      </ToggleButtonGroup>

      {/* Sélecteur de paramètres -------------------------------------------------- */}
      <ToggleButtonGroup
        value={selectedParams}
        size='small'
        color='primary'
        onChange={(_, val) => handleParamChange(val)}
      >
        {uniqBy(paramList, 'nom_parametre').map(p => ( // Dé-duplication des paramètres
          <ToggleButton
            key={p.nom_parametre}
            value={p.nom_parametre}
            disabled={!p.unite}
          >
            {p.nom_parametre}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {/* Graphique ---------------------------------------------------------- */}
      <LineChart
        series={series}
        xAxis={[{
          scaleType: 'time',
          data: slicedXData,
          tickMinStep: resolution === '15min' ? 3600 * 1000 : 3600 * 1000 * 24,
          valueFormatter(date, context) {
            if (context.location === 'tick') {
              return diffH < 168
                ? (diffH < 24
                  ? format(date, 'HH:mm', {locale: fr})
                  : format(date, 'd MMM HH:mm', {locale: fr})
                )
                : format(date, 'd MMM', {locale: fr})
            }

            return resolution === '15min'
              ? format(date, 'd MMM HH:mm', {locale: fr})
              : format(date, 'd MMM', {locale: fr})
          }

        }]}
        yAxis={yAxis}
        leftAxis={axisUnits[0]}
        rightAxis={axisUnits[1]}
        height={300}
        slotProps={{
          legend: {
            direction: 'row',
            position: {vertical: 'top', horizontal: 'right'}
          }
        }}
      />

      {/* Brush temporel ------------------------------------------------------ */}
      <Box sx={{px: 2}}>
        {xData.length > 0 && (
          <Slider
            disableSwap
            min={0}
            max={xData.length - 1}
            step={1}
            value={[startIdx, endIdx]}
            marks={[
              {value: 0, label: format(xData[0], 'd MMM', {locale: fr})},
              {value: xData.length - 1, label: format(xData.at(-1), 'd MMM', {locale: fr})}
            ]}
            valueLabelDisplay='on'
            valueLabelFormat={idx =>
              format(xData[idx], 'd MMM', {locale: fr})}
            getAriaValueText={idx =>
              format(xData[idx], diffH < 24 ? 'HH:mm' : 'd MMM', {locale: fr})}
            onChange={handleRangeChange}
          />
        )}
      </Box>
    </Box>
  )
}

export default ParameterTrendChart
