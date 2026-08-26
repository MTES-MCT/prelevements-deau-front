'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import {SegmentedControl} from '@codegouvfr/react-dsfr/SegmentedControl'
import MuiTooltip from '@mui/material/Tooltip'

import {
  buildResourceHash,
  DEFAULT_FLOW_PERIOD,
  DEFAULT_PIEZOMETRY_MODE,
  DEFAULT_PIEZOMETRY_PERIOD,
  FLOW_PERIODS,
  getInitialResourceState,
  PIEZOMETRY_IPS_PERIODS,
  PIEZOMETRY_MODES,
  PIEZOMETRY_PERIODS,
  shouldHideEmptyWaterResources
} from './dashboard-water-resource-state.js'
import {
  getPiezometryYAxisConfig,
  isHistoricalPiezometryPeriod,
  PIEZOMETRY_IPS_BANDS
} from './piezometry.js'
import {
  getIsolatedStationId,
  toggleStationIsolation
} from './station-visibility.js'

import TimeSeriesChart from '@/components/ui/TimeSeriesChart/index.js'
import {getMonitoringStationMapSummary} from '@/lib/monitoring-stations.js'
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
const IPS_REFERENCE_LINES = [{y: 0, color: 'var(--app-color-muted, #6A6A6A)'}]
const PIEZOMETRY_NUMBER_FORMATTER = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})

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

function buildPointMeta(parts, detail = null, natureLabel = null) {
  const comment = parts.filter(Boolean).join(' · ')
  if (!comment && !detail) {
    return null
  }

  return {
    ...(comment && {comment}),
    ...(detail && {detail}),
    ...(natureLabel && {natureLabel})
  }
}

function getPiezometryFrequency(period, mode) {
  if (mode === 'ips') {
    return '1 month'
  }

  if (period === 'year' || isHistoricalPiezometryPeriod(period)) {
    return '1 month'
  }

  return '1 day'
}

function getPiezometryTooltipFrequency(period, mode) {
  if (mode === 'ips') {
    return '1 month'
  }

  return isHistoricalPiezometryPeriod(period) ? '1 week' : '1 day'
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

function getPiezometryRawDetail(value) {
  const details = []
  if (Number.isFinite(value.depth)) {
    details.push(`Profondeur moyenne : ${PIEZOMETRY_NUMBER_FORMATTER.format(value.depth)} m`)
  }

  if (Number.isFinite(value.levelNgf)) {
    details.push(`Cote moyenne : ${PIEZOMETRY_NUMBER_FORMATTER.format(value.levelNgf)} m NGF`)
  }

  return details.join(' · ') || null
}

function getIpsDetail(value) {
  const details = [getPiezometryRawDetail(value)]
  if (Number.isFinite(value.changeFromPreviousMonth)) {
    if (value.changeFromPreviousMonth === 0) {
      details.push('Depuis le mois précédent : niveau stable')
    } else {
      const direction = value.changeFromPreviousMonth > 0 ? 'hausse' : 'baisse'
      const amount = PIEZOMETRY_NUMBER_FORMATTER.format(Math.abs(value.changeFromPreviousMonth))
      details.push(`Depuis le mois précédent : ${direction} de ${amount} m`)
    }
  }

  details.push(`${value.referenceYears} années de référence`)
  return details.filter(Boolean).join(' · ')
}

function getPiezometryUnit(mode) {
  if (mode === 'depth') {
    return 'm'
  }

  return mode === 'level' ? 'm NGF' : 'IPS'
}

function getPiezometryValue(value, mode) {
  if (mode === 'depth') {
    return value.depth
  }

  return mode === 'level' ? value.levelNgf : value.value
}

function getPiezometryUnavailableLabel(mode, station) {
  if (mode !== 'ips') {
    return 'mesure indisponible'
  }

  if (station.ips?.status === 'INSUFFICIENT_HISTORY') {
    return 'historique insuffisant (15 ans minimum)'
  }

  if (station.ips?.status === 'NO_VARIATION') {
    return 'niveau historique trop stable pour calculer l’indicateur'
  }

  return 'indicateur indisponible sur cette période'
}

function getPiezometryEmptyMessage(mode) {
  return mode === 'ips'
    ? 'Aucun indicateur disponible sur cette période. Il faut au moins 15 années de mesures pour le mois comparé.'
    : 'Aucune mesure disponible sur cette période.'
}

function getPiezometryReferenceLines(mode) {
  return mode === 'ips' ? IPS_REFERENCE_LINES : EMPTY_ARRAY
}

function getPiezometryBackgroundBands(mode) {
  return mode === 'ips' ? PIEZOMETRY_IPS_BANDS : EMPTY_ARRAY
}

function getPiezometryChartHeight(period) {
  return isHistoricalPiezometryPeriod(period) ? 440 : 360
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
  const unit = getPiezometryUnit(mode)

  return stations.map(station => {
    const values = mode === 'ips'
      ? station.ips?.values ?? EMPTY_ARRAY
      : station.values

    return {
      id: station.id,
      label: `${station.label} (${unit})`,
      axis: 'left',
      color: colors.get(station.id),
      connectNulls: mode !== 'ips',
      frequency: mode === 'ips'
        ? '1 month'
        : (isHistoricalPiezometryPeriod(period) ? '1 week' : undefined),
      precision: 2,
      data: values.map(value => ({
        x: new Date(value.at),
        y: getPiezometryValue(value, mode),
        meta: mode === 'ips'
          ? buildPointMeta([value.classLabel], getIpsDetail(value), 'Situation')
          : buildPointMeta([getGroundwaterNature(value)])
      })).filter(point => Number.isFinite(point.y))
    }
  }).filter(series => series.data.length > 0)
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

  const hash = buildResourceHash(window.location.hash, {
    flowPeriod,
    piezometryMode,
    piezometryPeriod
  })
  const url = `${window.location.pathname}${window.location.search}${hash}`
  window.history.replaceState(window.history.state, '', url)
}

const PeriodControl = ({disabled, id, onChange, options, value}) => (
  <div className='flex min-w-[9rem] flex-col gap-1'>
    <label className='text-xs font-medium text-gray-700' htmlFor={id}>Période</label>
    <select
      className='fr-select h-10 min-h-0 cursor-pointer py-1 pr-8 text-sm'
      disabled={disabled}
      id={id}
      value={value}
      onChange={event => onChange(event.target.value)}
    >
      {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </div>
)

const PiezometryModeControl = ({disabled, onChange, value}) => (
  <div className='flex items-center gap-1'>
    <SegmentedControl
      hideLegend
      small
      legend='Mode d’affichage'
      segments={PIEZOMETRY_MODES.map(option => ({
        label: option.label,
        nativeInputProps: {
          checked: value === option.value,
          disabled,
          onChange: () => onChange(option.value)
        }
      }))}
    />
    <MuiTooltip
      arrow
      title='La cote NGF est l’altitude du niveau d’eau dans un référentiel national commun. Elle est calculée à partir de l’altitude du repère de mesure et de la profondeur de la nappe ; elle ne correspond pas à la profondeur sous le sol.'
    >
      <button
        aria-label='Comprendre la cote NGF'
        className='fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-question-line h-8 min-h-0 w-8 shrink-0 p-0'
        type='button'
      />
    </MuiTooltip>
  </div>
)

const StationLegend = ({availableIds, colors, onChange, stations, unavailableLabel, value}) => {
  const isolatedStationId = getIsolatedStationId(stations, value)

  function toggleIsolation(stationId) {
    onChange(toggleStationIsolation(stations, value, stationId))
  }

  return (
    <div className='mb-3 flex flex-wrap gap-x-4 gap-y-2' aria-label='Séries affichées'>
      {stations.map(station => {
        const isAvailable = availableIds.has(station.id)
        const resolvedUnavailableLabel = typeof unavailableLabel === 'function'
          ? unavailableLabel(station)
          : unavailableLabel
        const isIsolated = isolatedStationId === station.id
        const isolationLabel = isIsolated
          ? 'Réafficher toutes les séries'
          : `Afficher uniquement ${station.label}`

        return (
          <div key={station.id} className='inline-flex items-center gap-1'>
            <label className={`inline-flex items-center gap-1.5 text-xs ${isAvailable ? 'cursor-pointer text-gray-700' : 'cursor-not-allowed text-gray-500'}`}>
              <input
                checked={value[station.id] !== false}
                className={`h-3.5 w-3.5 ${isAvailable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                disabled={!isAvailable}
                style={{accentColor: colors.get(station.id)}}
                type='checkbox'
                onChange={() => onChange({...value, [station.id]: value[station.id] === false})}
              />
              <span>
                {station.label}{isAvailable ? '' : ` · ${resolvedUnavailableLabel}`}
              </span>
            </label>
            <button
              aria-label={isolationLabel}
              aria-pressed={isIsolated}
              className='fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-focus-3-line h-6 min-h-0 w-6 p-0'
              disabled={!isAvailable}
              title={isolationLabel}
              type='button'
              onClick={() => toggleIsolation(station.id)}
            />
          </div>
        )
      })}
    </div>
  )
}

const IpsScaleLegend = () => (
  <div className='mt-3' aria-label='Échelle de l’indicateur piézométrique standardisé'>
    <div className='grid h-2 grid-cols-7 overflow-hidden rounded-sm border border-gray-300'>
      {PIEZOMETRY_IPS_BANDS.map(band => (
        <span key={band.minimum} style={{backgroundColor: band.color}} />
      ))}
    </div>
    <div className='mt-1 flex justify-between gap-3 text-[0.7rem] leading-4 text-gray-600'>
      <span>Très bas (-3)</span>
      <span>Autour de la normale (0)</span>
      <span>Très haut (+3)</span>
    </div>
  </div>
)

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

const WaterResourcesTitle = ({visible}) => visible
  ? <h3 className='fr-h3 fr-mb-4w'>Évolution de la ressource en eau</h3>
  : null

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
        <h4 className='fr-h4 fr-mb-1v'>{title}</h4>
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
  initialPiezometry = null,
  initialPiezometryError = null,
  initialRiverFlows = null,
  initialRiverFlowsError = null,
  onStationsChange,
  selectedZoneCodes,
  showTitle = true
}) => {
  const [piezometry, setPiezometry] = useState(initialPiezometry)
  const [riverFlows, setRiverFlows] = useState(initialRiverFlows)
  const [piezometryPeriod, setPiezometryPeriod] = useState(DEFAULT_PIEZOMETRY_PERIOD)
  const [flowPeriod, setFlowPeriod] = useState(DEFAULT_FLOW_PERIOD)
  const [piezometryMode, setPiezometryMode] = useState(DEFAULT_PIEZOMETRY_MODE)
  const [piezometryVisibility, setPiezometryVisibility] = useState({})
  const [flowVisibility, setFlowVisibility] = useState({})
  const [piezometryError, setPiezometryError] = useState(initialPiezometryError)
  const [flowError, setFlowError] = useState(initialRiverFlowsError)
  const [isPiezometryLoading, setIsPiezometryLoading] = useState(initialPiezometry === null)
  const [isFlowLoading, setIsFlowLoading] = useState(initialRiverFlows === null)
  const requestIds = useRef({piezometry: 0, flow: 0})
  const lastRawPiezometryPeriod = useRef('month')
  const lastIpsPiezometryPeriod = useRef(DEFAULT_PIEZOMETRY_PERIOD)
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
  const piezometryAvailableIds = useMemo(
    () => new Set(piezometrySeries.map(series => series.id)),
    [piezometrySeries]
  )
  const flowAvailableIds = useMemo(
    () => new Set(flowSeries.map(series => series.id)),
    [flowSeries]
  )
  const piezometryYAxis = getPiezometryYAxisConfig(piezometryMode)
  const latestPiezometryAt = useMemo(() => {
    const dates = piezometryMode === 'ips'
      ? piezometryStations.flatMap(station => station.ips?.values?.map(value => value.at) ?? EMPTY_ARRAY)
      : piezometryStations.map(station => station.latestObservationAt).filter(Boolean)

    return dates.sort().at(-1)
  }, [piezometryMode, piezometryStations])

  useEffect(() => {
    setPiezometryVisibility(previous => mergeVisibility(previous, piezometryStations))
  }, [piezometryStations])

  useEffect(() => {
    setFlowVisibility(previous => mergeVisibility(previous, flowStations))
  }, [flowStations])

  useEffect(() => {
    const stations = [...piezometryStations, ...flowStations]
      .map(station => getMonitoringStationMapSummary(station))
    onStationsChange(stations)
  }, [flowStations, onStationsChange, piezometryStations])

  const loadPiezometry = useCallback(async (
    period,
    zoneCodes = selectedZoneCodes,
    {includeIps = false} = {}
  ) => {
    const requestId = requestIds.current.piezometry + 1
    requestIds.current.piezometry = requestId
    setIsPiezometryLoading(true)
    setPiezometryError(null)
    let result
    try {
      result = await getDashboardPiezometryAction({period, zoneCodes, includeIps})
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
    const hashState = getInitialResourceState(
      typeof window === 'undefined' ? '' : window.location.hash
    )

    setPiezometryMode(hashState.piezometryMode)
    setPiezometryPeriod(hashState.piezometryPeriod)
    setFlowPeriod(hashState.flowPeriod)

    if (hashState.piezometryMode === 'ips') {
      lastIpsPiezometryPeriod.current = hashState.piezometryPeriod
    } else {
      lastRawPiezometryPeriod.current = hashState.piezometryPeriod
    }

    if (initialPiezometry === null || (
      hashState.piezometryPeriod !== DEFAULT_PIEZOMETRY_PERIOD
      || hashState.piezometryMode !== DEFAULT_PIEZOMETRY_MODE
    )) {
      loadPiezometry(hashState.piezometryPeriod, selectedZoneCodes, {
        includeIps: hashState.piezometryMode === 'ips'
      })
    }

    if (initialRiverFlows === null || hashState.flowPeriod !== DEFAULT_FLOW_PERIOD) {
      loadRiverFlows(hashState.flowPeriod, selectedZoneCodes)
    }
  // The initial hash is intentionally applied once after hydration.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!didMountZoneEffect.current) {
      didMountZoneEffect.current = true
      return
    }

    loadPiezometry(piezometryPeriod, selectedZoneCodes, {
      includeIps: piezometryMode === 'ips'
    })
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
    if (piezometryMode === 'ips') {
      lastIpsPiezometryPeriod.current = period
    } else {
      lastRawPiezometryPeriod.current = period
    }

    setPiezometryPeriod(period)
    updateResourceHash({flowPeriod, piezometryMode, piezometryPeriod: period})
    loadPiezometry(period, selectedZoneCodes, {includeIps: piezometryMode === 'ips'})
  }, [flowPeriod, loadPiezometry, piezometryMode, selectedZoneCodes])

  const changeFlowPeriod = useCallback(period => {
    setFlowPeriod(period)
    updateResourceHash({flowPeriod: period, piezometryMode, piezometryPeriod})
    loadRiverFlows(period)
  }, [loadRiverFlows, piezometryMode, piezometryPeriod])

  const changePiezometryMode = useCallback(mode => {
    const nextPeriod = mode === 'ips'
      ? lastIpsPiezometryPeriod.current
      : lastRawPiezometryPeriod.current

    setPiezometryMode(mode)
    setPiezometryPeriod(nextPeriod)
    updateResourceHash({flowPeriod, piezometryMode: mode, piezometryPeriod: nextPeriod})

    if (mode === 'ips' || piezometryMode === 'ips') {
      loadPiezometry(nextPeriod, selectedZoneCodes, {includeIps: mode === 'ips'})
    }
  }, [flowPeriod, loadPiezometry, piezometryMode, selectedZoneCodes])

  const hasAnyStation = piezometryStations.length > 0 || flowStations.length > 0
  if (shouldHideEmptyWaterResources({
    flowError,
    hasAnyStation,
    isFlowLoading,
    isPiezometryLoading,
    piezometryError
  })) {
    return null
  }

  return (
    <section className='mt-6'>
      <WaterResourcesTitle visible={showTitle} />
      <div className='flex flex-col gap-6'>
        {!hasAnyStation && (isPiezometryLoading || isFlowLoading) && (
          <div className='flex min-h-60 items-center justify-center border border-gray-200 bg-white p-5'>
            <LoadingStatus />
          </div>
        )}
        {(piezometryStations.length > 0 || piezometryError) && (
          <ResourceChart
            controls={(
              <div className='flex flex-col gap-3 xl:flex-row xl:items-center'>
                <PiezometryModeControl
                  disabled={isPiezometryLoading}
                  value={piezometryMode}
                  onChange={changePiezometryMode}
                />
                <PeriodControl
                  disabled={isPiezometryLoading}
                  id='piezometry-period'
                  options={piezometryMode === 'ips' ? PIEZOMETRY_IPS_PERIODS : PIEZOMETRY_PERIODS}
                  value={piezometryPeriod}
                  onChange={changePiezometryPeriod}
                />
              </div>
            )}
            error={piezometryError}
            isLoading={isPiezometryLoading}
            latestObservationAt={latestPiezometryAt}
            source={piezometry?.source}
            subtitle={piezometryMode === 'ips'
              ? 'Situation de chaque nappe par rapport à son propre historique pour le même mois.'
              : 'Niveaux mesurés sur les piézomètres configurés pour les zones sélectionnées.'}
            title='Niveaux piézométriques'
            warnings={piezometry?.warnings ?? EMPTY_ARRAY}
          >
            <StationLegend
              availableIds={piezometryAvailableIds}
              colors={piezometryColors}
              stations={piezometryStations}
              unavailableLabel={station => getPiezometryUnavailableLabel(piezometryMode, station)}
              value={piezometryVisibility}
              onChange={setPiezometryVisibility}
            />
            {piezometrySeries.length > 0 ? (
              <TimeSeriesChart
                enableAnnotations={false}
                enableDecimation={false}
                enableThresholds={false}
                backgroundBands={getPiezometryBackgroundBands(piezometryMode)}
                frequency={getPiezometryFrequency(piezometryPeriod, piezometryMode)}
                height={getPiezometryChartHeight(piezometryPeriod)}
                includeZero={false}
                locale='fr-FR'
                referenceLines={getPiezometryReferenceLines(piezometryMode)}
                reverseYAxis={piezometryYAxis.reverse}
                series={piezometrySeries}
                showLegend={false}
                tooltipFrequency={getPiezometryTooltipFrequency(piezometryPeriod, piezometryMode)}
                visibilityModel={piezometryVisibility}
                yAxisLabel={piezometryYAxis.label}
                yAxisMax={piezometryYAxis.maximum}
                yAxisMin={piezometryYAxis.minimum}
              />
            ) : (
              <div className='flex min-h-[300px] items-center justify-center bg-gray-50 text-sm text-gray-600'>
                {getPiezometryEmptyMessage(piezometryMode)}
              </div>
            )}
            {piezometryMode === 'ips' && (
              <div className='mt-3 border-t border-gray-200 pt-3'>
                <p className='fr-text--xs fr-mb-0 text-gray-600'>
                  Chaque point compare la moyenne mensuelle validée du piézomètre aux valeurs du même mois sur son propre historique. L’indicateur suit les principes de la méthode IPS du BRGM et nécessite au moins 15 années de référence.
                </p>
                <IpsScaleLegend />
              </div>
            )}
            {piezometryMode !== 'ips' && piezometry?.aggregation?.frequency === '1 week' && (
              <p className='fr-text--xs fr-mb-0 mt-3 text-gray-600'>
                Chaque point correspond à la moyenne des mesures de la semaine.
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
              availableIds={flowAvailableIds}
              colors={flowColors}
              stations={flowStations}
              unavailableLabel='aucune donnée'
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
