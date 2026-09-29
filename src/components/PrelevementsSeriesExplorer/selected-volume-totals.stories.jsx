'use client'

import {useCallback, useMemo, useRef, useState} from 'react'

import AggregatedSeriesExplorer from './aggregated-series-explorer.js'

const START_DATE = '2024-01-01'
const END_DATE = '2024-02-14'
const DATE_RANGE = {start: START_DATE, end: END_DATE}
const WITHDRAWAL = 'volume:PRELEVEMENT'
const DISCHARGE = 'volume:REJET'
const INDEX = 'index:PRELEVEMENT'
const PARAMETERS = [
  {value: WITHDRAWAL, label: 'Volume prélevé', metricTypeCode: 'volume', flowType: 'PRELEVEMENT', unit: 'm³', valueType: 'cumulative', color: '#0063cb'},
  {value: DISCHARGE, label: 'Volume rejeté', metricTypeCode: 'volume', flowType: 'REJET', unit: 'm³', valueType: 'cumulative', color: '#a558a0'},
  {value: INDEX, label: 'Index du compteur', metricTypeCode: 'index', flowType: 'PRELEVEMENT', unit: 'm³', valueType: 'instantaneous', color: '#666666'}
]
const ALL_PARAMETERS = PARAMETERS.map(parameter => parameter.value)
const DEFAULT_PARAMETERS = [WITHDRAWAL, DISCHARGE]
const DEFAULT_PERIODS = [{type: 'year', value: 2024}]

const DAILY_DATES = Array.from({length: 45}, (_, day) =>
  new Date(Date.UTC(2024, 0, day + 1)).toISOString().slice(0, 10))

const createValues = (parameter, mode) => DAILY_DATES.map((date, day) => ({
  date,
  value: parameter === INDEX
    ? 100_000 + day * 1000
    : mode === 'empty' || (mode === 'first-day-only' && day > 0)
      ? null
      : mode === 'zero' ? 0 : mode === 'daily-variation' ? (day + 1) * 100 : parameter === WITHDRAWAL ? 1000 : 200
}))

const groupWeeklyValues = values => {
  const weeks = new Map()
  for (const [day, entry] of values.entries()) {
    const week = `2024-W${String(Math.floor(day / 7) + 1).padStart(2, '0')}`
    weeks.set(week, entry.value === null
      ? weeks.get(week) ?? null
      : (weeks.get(week) ?? 0) + entry.value)
  }

  return [...weeks].map(([date, value]) => ({date, value}))
}

const createSeries = (mode, frequency) => new Map(PARAMETERS.map(parameter => [parameter.value, {
  metadata: {
    ...parameter,
    parameter: parameter.value,
    frequency: parameter.metricTypeCode === 'volume' ? frequency : '1 day',
    temporalOperator: parameter.value === INDEX ? 'max' : 'sum',
    startDate: START_DATE,
    endDate: END_DATE,
    distribution: {applied: parameter.metricTypeCode === 'volume'}
  },
  values: frequency === '1 week' && parameter.metricTypeCode === 'volume'
    ? groupWeeklyValues(createValues(parameter.value, mode))
    : createValues(parameter.value, mode)
}]))

function TotalsFixture({mode = 'normal', deferred = false, withdrawalOnly = false}) {
  const [frequency, setFrequency] = useState(mode === 'daily-variation' ? '1 week' : '1 day')
  const [selectedParameters, setSelectedParameters] = useState(withdrawalOnly ? [WITHDRAWAL] : DEFAULT_PARAMETERS)
  const [requests, setRequests] = useState([])
  const pendingRequests = useRef(new Map())
  const nextRequestId = useRef(0)
  const series = useMemo(() => createSeries(mode, frequency), [mode, frequency])

  const getVolumeValuesForRange = useCallback(async (parameterId, {startDate, endDate}) => {
    const id = ++nextRequestId.current
    setRequests(previous => [...previous, {id, parameterId, startDate, endDate}])

    if (deferred) {
      await new Promise(resolve => pendingRequests.current.set(id, resolve))
    }

    if (mode === 'error') {
      throw new Error('Erreur simulée du calcul borné')
    }

    // Synthetic equivalent of the server's annual sum over the requested days.
    // Forty-five days contain 45 000 m³; ten days contain 10 000 m³.
    const values = createValues(parameterId, mode)
      .filter(entry => entry.date >= startDate && entry.date <= endDate && entry.value !== null)
    return values.length > 0
      ? [{date: '2024', value: values.reduce((sum, entry) => sum + entry.value, 0)}]
      : []
  }, [deferred, mode])

  return (
    <div style={{maxWidth: 1100, margin: '0 auto', padding: 16}}>
      <AggregatedSeriesExplorer
        parameters={PARAMETERS}
        series={series}
        selectedParameters={selectedParameters}
        defaultPeriods={DEFAULT_PERIODS}
        dateRangeOverride={DATE_RANGE}
        showCalendar={false}
        showPeriodSelector={false}
        getVolumeValuesForRange={getVolumeValuesForRange}
        onFiltersChange={({parameters}) => {
          if (parameters) {
            setSelectedParameters(parameters)
          }
        }}
      />
      <details style={{marginTop: 24}}>
        <summary>Contrôles de démonstration</summary>
        <div style={{display: 'flex', flexWrap: 'wrap', gap: 12, paddingTop: 12}}>
          <button type='button' onClick={() => setFrequency('1 week')}>Résolution hebdomadaire</button>
          <button type='button' onClick={() => setSelectedParameters([INDEX])}>Afficher uniquement l’index</button>
          <button type='button' onClick={() => setSelectedParameters(ALL_PARAMETERS)}>Afficher aussi l’index</button>
          {deferred && requests.map(request => (
            <button
              key={request.id}
              type='button'
              onClick={() => {
                pendingRequests.current.get(request.id)?.()
                pendingRequests.current.delete(request.id)
              }}
            >
              Résoudre le calcul {request.id}
            </button>
          ))}
        </div>
        <output aria-label='Requêtes de total bornées' style={{overflowWrap: 'anywhere'}}>
          {JSON.stringify(requests)}
        </output>
      </details>
    </div>
  )
}

export default {
  title: 'Components/Totaux des volumes',
  component: TotalsFixture
}

export const PeriodeComplete = {}
export const VolumeNul = {args: {mode: 'zero'}}
export const SansDonnees = {args: {mode: 'empty'}}
export const ErreurDuCalcul = {args: {mode: 'error', withdrawalOnly: true}}
export const ReponsesDifferees = {args: {deferred: true, withdrawalOnly: true}}
export const SommePartielleHebdomadaire = {args: {mode: 'daily-variation', withdrawalOnly: true}}
export const SousPeriodeSansDonnees = {args: {mode: 'first-day-only', withdrawalOnly: true}}
