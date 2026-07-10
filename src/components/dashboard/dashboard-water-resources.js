'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import {SegmentedControl} from '@codegouvfr/react-dsfr/SegmentedControl'

import TimeSeriesChart from '@/components/ui/TimeSeriesChart/index.js'
import {
  getDashboardPiezometryAction,
  getDashboardRiverFlowsAction
} from '@/server/actions/dashboard.js'

const EMPTY_ARRAY = []
const STATION_COLORS = [
  '#000091',
  '#009081',
  '#E1000F',
  '#A558A0',
  '#0078F3',
  '#D64D00',
  '#6A6AF4',
  '#18753C',
  '#A94645',
  '#8B6F4B',
  '#0063CB',
  '#7A4E00'
]
const PIEZOMETRY_PERIODS = [
  {value: 'week', label: '7 jours'},
  {value: 'month', label: '30 jours'},
  {value: 'year', label: '12 mois'},
  {value: 'twenty-years', label: '20 ans'}
]
const FLOW_PERIODS = [
  {value: 'week', label: '7 jours'},
  {value: 'month', label: '30 jours'},
  {value: 'year', label: '12 mois'}
]
const PIEZOMETRY_MODES = [
  {value: 'level', label: 'Cote NGF'},
  {value: 'depth', label: 'Profondeur'}
]

function hashCode(value) {
  let hash = 0
  for (const character of String(value)) {
    hash = ((hash * 31) + character.codePointAt(0)) % 2_147_483_647
  }

  return Math.abs(hash)
}

function assignStationColors(stations) {
  const used = new Set()
  const colors = new Map()

  for (const station of [...stations].sort((a, b) => a.stationCode.localeCompare(b.stationCode))) {
    let index = hashCode(`${station.type}:${station.stationCode}`) % STATION_COLORS.length
    while (used.has(index) && used.size < STATION_COLORS.length) {
      index = (index + 1) % STATION_COLORS.length
    }

    used.add(index)
    colors.set(station.id, STATION_COLORS[index])
  }

  return colors
}

function mergeVisibility(previous, stations) {
  const next = {}
  for (const station of stations) {
    next[station.id] = previous[station.id] !== false
  }

  return next
}

function buildPointMeta(parts) {
  const comment = parts.filter(Boolean).join(' · ')
  return comment ? {comment} : null
}

function getPiezometryFrequency(period) {
  if (period === 'year' || period === 'twenty-years') {
    return '1 month'
  }

  return '1 day'
}

function getPiezometryTooltipFrequency(period) {
  return period === 'twenty-years' ? '1 week' : '1 day'
}

function getFlowFrequency(period) {
  if (period === 'week') {
    return '6 hours'
  }

  return period === 'month' ? '1 day' : '1 month'
}

function getGroundwaterNature(value) {
  if (value.aggregation === 'WEEKLY_MEAN') {
    return 'Moyenne hebdomadaire de données validées ADES'
  }

  return value.origin === 'REALTIME' ? 'Temps réel non validée' : 'Donnée validée ADES'
}

function getFlowNature(value) {
  if (value.granularity === 'DAILY') {
    return 'Moyenne journalière'
  }

  if (value.granularity === 'MONTHLY') {
    return 'Moyenne mensuelle'
  }

  return 'Temps réel'
}

function buildPiezometrySeries(stations, mode, colors, period) {
  return stations.map(station => ({
    id: station.id,
    label: `${station.label} (${mode === 'depth' ? 'm' : 'm NGF'})`,
    axis: 'left',
    color: colors.get(station.id),
    connectNulls: true,
    frequency: period === 'twenty-years' ? '1 week' : undefined,
    precision: 2,
    data: station.values.map(value => ({
      x: new Date(value.at),
      y: mode === 'depth' ? value.depth : value.levelNgf,
      meta: buildPointMeta([getGroundwaterNature(value)])
    })).filter(point => Number.isFinite(point.y))
  })).filter(series => series.data.length > 0)
}

function buildFlowSeries(stations, colors) {
  return stations.map(station => ({
    id: station.id,
    label: `${station.label} (L/s)`,
    axis: 'left',
    color: colors.get(station.id),
    precision: 0,
    data: station.values.map(value => ({
      x: new Date(value.at),
      y: value.valueLitersPerSecond,
      meta: buildPointMeta([getFlowNature(value)])
    })).filter(point => Number.isFinite(point.y))
  })).filter(series => series.data.length > 0)
}

function formatLatestDate(value, includeTime) {
  if (!value) {
    return 'Aucune donnée affichée'
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    ...(includeTime ? {timeStyle: 'short'} : {})
  }).format(new Date(value))
}

function updateResourceHash({flowPeriod, piezometryMode, piezometryPeriod}) {
  if (typeof window === 'undefined') {
    return
  }

  const rawHash = window.location.hash.startsWith('#dashboard?')
    ? window.location.hash.slice('#dashboard?'.length)
    : ''
  const parameters = new URLSearchParams(rawHash)

  if (piezometryPeriod === 'week') {
    parameters.delete('piezoPeriod')
  } else {
    parameters.set('piezoPeriod', piezometryPeriod)
  }

  if (flowPeriod === 'week') {
    parameters.delete('flowPeriod')
  } else {
    parameters.set('flowPeriod', flowPeriod)
  }

  if (piezometryMode === 'level') {
    parameters.delete('piezoMode')
  } else {
    parameters.set('piezoMode', piezometryMode)
  }

  const search = parameters.toString()
  const url = `${window.location.pathname}${window.location.search}${search ? `#dashboard?${search}` : ''}`
  window.history.replaceState(window.history.state, '', url)
}

function readResourceHash() {
  if (typeof window === 'undefined' || !window.location.hash.startsWith('#dashboard?')) {
    return null
  }

  const parameters = new URLSearchParams(window.location.hash.slice('#dashboard?'.length))
  const piezometryPeriod = parameters.get('piezoPeriod')
  const flowPeriod = parameters.get('flowPeriod')
  const piezometryMode = parameters.get('piezoMode')

  return {
    piezometryPeriod: PIEZOMETRY_PERIODS.some(item => item.value === piezometryPeriod)
      ? piezometryPeriod
      : 'week',
    flowPeriod: FLOW_PERIODS.some(item => item.value === flowPeriod) ? flowPeriod : 'week',
    piezometryMode: PIEZOMETRY_MODES.some(item => item.value === piezometryMode)
      ? piezometryMode
      : 'level'
  }
}

const PeriodControl = ({disabled, id, onChange, options, value}) => (
  <div>
    <div className='sm:hidden'>
      <label className='fr-label' htmlFor={id}>Période</label>
      <select
        className='fr-select cursor-pointer'
        disabled={disabled}
        id={id}
        value={value}
        onChange={event => onChange(event.target.value)}
      >
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>
    <div className='hidden sm:block'>
      <SegmentedControl
        hideLegend
        small
        legend='Période'
        segments={options.map(option => ({
          label: option.label,
          nativeInputProps: {
            checked: value === option.value,
            disabled,
            onChange: () => onChange(option.value)
          }
        }))}
      />
    </div>
  </div>
)

const StationLegend = ({colors, onChange, stations, value}) => {
  function isolate(stationId) {
    onChange(Object.fromEntries(stations.map(station => [station.id, station.id === stationId])))
  }

  return (
    <div className='mb-3 flex flex-wrap gap-x-4 gap-y-2' aria-label='Séries affichées'>
      {stations.map(station => (
        <div key={station.id} className='inline-flex items-center gap-1'>
          <label className={`inline-flex items-center gap-1.5 text-xs ${station.values.length > 0 ? 'cursor-pointer text-gray-700' : 'cursor-not-allowed text-gray-500'}`}>
            <input
              checked={value[station.id] !== false}
              className={`h-3.5 w-3.5 ${station.values.length > 0 ? 'cursor-pointer' : 'cursor-not-allowed'}`}
              disabled={station.values.length === 0}
              style={{accentColor: colors.get(station.id)}}
              type='checkbox'
              onChange={() => onChange({...value, [station.id]: value[station.id] === false})}
            />
            <span>
              {station.label}{station.values.length === 0 ? ' · aucune donnée' : ''}
            </span>
          </label>
          <button
            aria-label={`Afficher uniquement ${station.label}`}
            className='fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-focus-3-line h-6 min-h-0 w-6 p-0'
            disabled={station.values.length === 0}
            title={`Afficher uniquement ${station.label}`}
            type='button'
            onClick={() => isolate(station.id)}
          />
        </div>
      ))}
    </div>
  )
}

const ResourceWarnings = ({warnings}) => warnings.length > 0 && (
  <div className='fr-alert fr-alert--warning fr-alert--sm mb-4'>
    <p>
      {warnings.length === 1
        ? `Une station n’a pas pu être actualisée : ${warnings[0].label}.`
        : `${warnings.length} stations n’ont pas pu être actualisées.`}
    </p>
  </div>
)

const LoadingStatus = () => (
  <span className='inline-flex items-center gap-2 text-xs font-medium text-[#000091]' role='status'>
    <span aria-hidden='true' className='inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#000091]/25 border-t-[#000091]' />
    <span>Actualisation...</span>
  </span>
)

const ResourceChart = ({
  children,
  controls,
  error,
  isLoading,
  latestObservationAt,
  source,
  subtitle,
  title,
  warnings
}) => (
  <article className='border border-gray-200 bg-white p-5 md:p-6'>
    <div className='mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
      <div>
        <h3 className='fr-h4 fr-mb-1v'>{title}</h3>
        <p className='fr-text--sm fr-mb-0 text-gray-600'>{subtitle}</p>
      </div>
      <div className='flex flex-col items-start gap-2 lg:items-end'>
        {controls}
        {isLoading && <LoadingStatus />}
      </div>
    </div>

    {error && <div className='fr-alert fr-alert--error fr-alert--sm mb-4'><p>{error}</p></div>}
    <ResourceWarnings warnings={warnings} />
    <div className={isLoading ? 'pointer-events-none opacity-60' : undefined}>{children}</div>

    <div className='mt-4 flex flex-col gap-1 border-t border-gray-200 pt-3 text-xs text-gray-600 sm:flex-row sm:justify-between'>
      <span>Données : {source || 'Hub’Eau'}</span>
      <span>Dernière donnée affichée : {formatLatestDate(latestObservationAt, true)}</span>
    </div>
  </article>
)

const DashboardWaterResources = ({
  initialPiezometry,
  initialPiezometryError = null,
  initialRiverFlows,
  initialRiverFlowsError = null,
  onStationsChange,
  selectedZoneCodes
}) => {
  const [piezometry, setPiezometry] = useState(initialPiezometry)
  const [riverFlows, setRiverFlows] = useState(initialRiverFlows)
  const [piezometryPeriod, setPiezometryPeriod] = useState('week')
  const [flowPeriod, setFlowPeriod] = useState('week')
  const [piezometryMode, setPiezometryMode] = useState('level')
  const [piezometryVisibility, setPiezometryVisibility] = useState({})
  const [flowVisibility, setFlowVisibility] = useState({})
  const [piezometryError, setPiezometryError] = useState(initialPiezometryError)
  const [flowError, setFlowError] = useState(initialRiverFlowsError)
  const [isPiezometryLoading, setIsPiezometryLoading] = useState(false)
  const [isFlowLoading, setIsFlowLoading] = useState(false)
  const requestIds = useRef({piezometry: 0, flow: 0})
  const flowLoadingRef = useRef(false)
  const didMountZoneEffect = useRef(false)
  const zoneCodesKey = selectedZoneCodes.join(',')
  const piezometryStations = piezometry?.stations ?? EMPTY_ARRAY
  const flowStations = riverFlows?.stations ?? EMPTY_ARRAY
  const piezometryColors = useMemo(() => assignStationColors(piezometryStations), [piezometryStations])
  const flowColors = useMemo(() => assignStationColors(flowStations), [flowStations])
  const piezometrySeries = useMemo(
    () => buildPiezometrySeries(piezometryStations, piezometryMode, piezometryColors, piezometryPeriod),
    [piezometryColors, piezometryMode, piezometryPeriod, piezometryStations]
  )
  const flowSeries = useMemo(
    () => buildFlowSeries(flowStations, flowColors),
    [flowColors, flowStations]
  )

  useEffect(() => {
    setPiezometryVisibility(previous => mergeVisibility(previous, piezometryStations))
  }, [piezometryStations])

  useEffect(() => {
    setFlowVisibility(previous => mergeVisibility(previous, flowStations))
  }, [flowStations])

  useEffect(() => {
    const stations = [...piezometryStations, ...flowStations].map(station => ({
      id: station.id,
      type: station.type,
      label: station.label,
      stationCode: station.stationCode,
      coordinates: station.coordinates
    }))
    onStationsChange(stations)
  }, [flowStations, onStationsChange, piezometryStations])

  const loadPiezometry = useCallback(async (period, zoneCodes = selectedZoneCodes) => {
    const requestId = requestIds.current.piezometry + 1
    requestIds.current.piezometry = requestId
    setIsPiezometryLoading(true)
    setPiezometryError(null)
    let result
    try {
      result = await getDashboardPiezometryAction({period, zoneCodes})
    } catch {
      result = {success: false}
    }

    if (requestIds.current.piezometry === requestId) {
      if (result.success) {
        setPiezometry(result.data)
      } else {
        setPiezometryError(result.error || 'Impossible de charger les niveaux piézométriques.')
      }

      setIsPiezometryLoading(false)
    }
  }, [selectedZoneCodes])

  const loadRiverFlows = useCallback(async (
    period,
    zoneCodes = selectedZoneCodes,
    {skipIfLoading = false} = {}
  ) => {
    if (skipIfLoading && flowLoadingRef.current) {
      return
    }

    const requestId = requestIds.current.flow + 1
    requestIds.current.flow = requestId
    flowLoadingRef.current = true
    setIsFlowLoading(true)
    setFlowError(null)
    let result
    try {
      result = await getDashboardRiverFlowsAction({period, zoneCodes})
    } catch {
      result = {success: false}
    }

    if (requestIds.current.flow === requestId) {
      if (result.success) {
        setRiverFlows(result.data)
      } else {
        setFlowError(result.error || 'Impossible de charger les débits.')
      }

      setIsFlowLoading(false)
      flowLoadingRef.current = false
    }
  }, [selectedZoneCodes])

  useEffect(() => {
    const hashState = readResourceHash()
    if (!hashState) {
      return
    }

    setPiezometryMode(hashState.piezometryMode)
    setPiezometryPeriod(hashState.piezometryPeriod)
    setFlowPeriod(hashState.flowPeriod)

    if (hashState.piezometryPeriod !== 'week') {
      loadPiezometry(hashState.piezometryPeriod)
    }

    if (hashState.flowPeriod !== 'week') {
      loadRiverFlows(hashState.flowPeriod)
    }
  // The initial hash is intentionally applied once after hydration.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!didMountZoneEffect.current) {
      didMountZoneEffect.current = true
      return
    }

    loadPiezometry(piezometryPeriod, selectedZoneCodes)
    loadRiverFlows(flowPeriod, selectedZoneCodes)
  // Period changes have their own handlers; this effect follows zone changes only.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneCodesKey])

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') {
        loadRiverFlows(flowPeriod, selectedZoneCodes, {skipIfLoading: true})
      }
    }

    const interval = window.setInterval(refresh, 15 * 60 * 1000)
    document.addEventListener('visibilitychange', refresh)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [flowPeriod, loadRiverFlows, selectedZoneCodes])

  const changePiezometryPeriod = useCallback(period => {
    setPiezometryPeriod(period)
    updateResourceHash({flowPeriod, piezometryMode, piezometryPeriod: period})
    loadPiezometry(period)
  }, [flowPeriod, loadPiezometry, piezometryMode])

  const changeFlowPeriod = useCallback(period => {
    setFlowPeriod(period)
    updateResourceHash({flowPeriod: period, piezometryMode, piezometryPeriod})
    loadRiverFlows(period)
  }, [loadRiverFlows, piezometryMode, piezometryPeriod])

  const changePiezometryMode = useCallback(mode => {
    setPiezometryMode(mode)
    updateResourceHash({flowPeriod, piezometryMode: mode, piezometryPeriod})
  }, [flowPeriod, piezometryPeriod])

  const hasAnyStation = piezometryStations.length > 0 || flowStations.length > 0
  if (!hasAnyStation && !piezometryError && !flowError) {
    return null
  }

  return (
    <section className='mt-8'>
      <h2 className='fr-h2 fr-mb-4w'>Évolution de la ressource en eau</h2>
      <div className='flex flex-col gap-6'>
        {(piezometryStations.length > 0 || piezometryError) && (
          <ResourceChart
            controls={(
              <div className='flex flex-col gap-3 xl:flex-row xl:items-center'>
                <SegmentedControl
                  hideLegend
                  small
                  legend='Mode d’affichage'
                  segments={PIEZOMETRY_MODES.map(option => ({
                    label: option.label,
                    nativeInputProps: {
                      checked: piezometryMode === option.value,
                      disabled: isPiezometryLoading,
                      onChange: () => changePiezometryMode(option.value)
                    }
                  }))}
                />
                <PeriodControl
                  disabled={isPiezometryLoading}
                  id='piezometry-period'
                  options={PIEZOMETRY_PERIODS}
                  value={piezometryPeriod}
                  onChange={changePiezometryPeriod}
                />
              </div>
            )}
            error={piezometryError}
            isLoading={isPiezometryLoading}
            latestObservationAt={piezometryStations.map(station => station.latestObservationAt).filter(Boolean).sort().at(-1)}
            source={piezometry?.source}
            subtitle='Niveaux mesurés sur les piézomètres configurés pour les zones sélectionnées.'
            title='Niveaux piézométriques'
            warnings={piezometry?.warnings ?? EMPTY_ARRAY}
          >
            <StationLegend
              colors={piezometryColors}
              stations={piezometryStations}
              value={piezometryVisibility}
              onChange={setPiezometryVisibility}
            />
            {piezometrySeries.length > 0 ? (
              <TimeSeriesChart
                enableAnnotations={false}
                enableDecimation={false}
                enableThresholds={false}
                frequency={getPiezometryFrequency(piezometryPeriod)}
                height={piezometryPeriod === 'twenty-years' ? 440 : 360}
                includeZero={false}
                locale='fr-FR'
                reverseYAxis={piezometryMode === 'depth'}
                series={piezometrySeries}
                showLegend={false}
                tooltipFrequency={getPiezometryTooltipFrequency(piezometryPeriod)}
                visibilityModel={piezometryVisibility}
                yAxisLabel={piezometryMode === 'depth' ? 'Profondeur (m)' : 'Cote (m NGF)'}
              />
            ) : (
              <div className='flex min-h-[300px] items-center justify-center bg-gray-50 text-sm text-gray-600'>
                Aucune mesure disponible sur cette période.
              </div>
            )}
            {piezometry?.aggregation?.frequency === '1 week' && (
              <p className='fr-text--xs fr-mb-0 mt-3 text-gray-600'>
                Sur 20 ans, chaque point correspond à la moyenne des mesures de la semaine.
              </p>
            )}
          </ResourceChart>
        )}

        {(flowStations.length > 0 || flowError) && (
          <ResourceChart
            controls={(
              <PeriodControl
                disabled={isFlowLoading}
                id='flow-period'
                options={FLOW_PERIODS}
                value={flowPeriod}
                onChange={changeFlowPeriod}
              />
            )}
            error={flowError}
            isLoading={isFlowLoading}
            latestObservationAt={flowStations.map(station => station.latestObservationAt).filter(Boolean).sort().at(-1)}
            source={riverFlows?.source}
            subtitle='Débits mesurés sur les stations configurées pour les zones sélectionnées.'
            title='Débits des cours d’eau'
            warnings={riverFlows?.warnings ?? EMPTY_ARRAY}
          >
            <StationLegend
              colors={flowColors}
              stations={flowStations}
              value={flowVisibility}
              onChange={setFlowVisibility}
            />
            {flowSeries.length > 0 ? (
              <TimeSeriesChart
                enableAnnotations={false}
                enableDecimation={flowPeriod !== 'week'}
                enableThresholds={false}
                frequency={getFlowFrequency(flowPeriod)}
                includeZero={false}
                locale='fr-FR'
                series={flowSeries}
                showLegend={false}
                visibilityModel={flowVisibility}
                yAxisLabel='Débit (L/s)'
              />
            ) : (
              <div className='flex min-h-[300px] items-center justify-center bg-gray-50 text-sm text-gray-600'>
                Aucune mesure disponible sur cette période.
              </div>
            )}
          </ResourceChart>
        )}
      </div>
    </section>
  )
}

export default DashboardWaterResources
