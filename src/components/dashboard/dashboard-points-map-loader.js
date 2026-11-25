'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import DashboardPointsMap from '@/components/dashboard/dashboard-points-map.js'
import {
  DEFAULT_DASHBOARD_MAP_CAPABILITIES,
  normalizeDashboardMapCapabilities
} from '@/lib/dashboard-map-popups.js'
import {loadDashboardMap, loadDashboardPiezometry, loadDashboardRiverFlows} from '@/lib/dashboard-client.js'
import {getMonitoringStationMapSummary} from '@/lib/monitoring-stations.js'

const EMPTY_ARRAY = []

const MapLoadingState = () => (
  <div
    className='flex h-[360px] w-full items-center justify-center border border-gray-200 bg-gray-100 text-center md:h-[430px]'
    role='status'
  >
    Chargement de la carte…
  </div>
)

// The individual map covers the user's points across all eligible catchments.
function useActivityStations(scope) {
  const [sources, setSources] = useState({})
  useEffect(() => {
    if (scope !== 'activity') return
    const controller = new AbortController()
    let lastRead = 0
    const refresh = () => {
      if (document.visibilityState === 'hidden') return
      const read = ++lastRead
      const updateSource = async (name, promise) => {
        let result
        try {
          const data = await promise
          result = {stations: (data.stations ?? []).map(getMonitoringStationMapSummary)}
        } catch {
          result = {stations: [], unavailable: true}
        }
        if (!controller.signal.aborted && lastRead === read) setSources(current => ({...current, [name]: result}))
      }
      updateSource('piezometry', loadDashboardPiezometry({scope, period: 'month'}, {signal: controller.signal}))
      updateSource('flows', loadDashboardRiverFlows({scope, period: 'week'}, {signal: controller.signal}))
    }
    refresh()
    const timer = window.setInterval(refresh, 15 * 60 * 1000)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      controller.abort()
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [scope])
  return useMemo(() => ({
    stations: Object.values(sources).flatMap(source => source.stations),
    unavailable: Object.values(sources).some(source => source.unavailable)
  }), [sources])
}

const DashboardPointsMapLoader = ({
  selectedZoneCodes = EMPTY_ARRAY,
  selectedZoneId,
  monitoringStations,
  scope,
  ...mapProps
}) => {
  const requestIdRef = useRef(0)
  const hasLoadedOnceRef = useRef(false)
  const [points, setPoints] = useState(EMPTY_ARRAY)
  const [capabilities, setCapabilities] = useState(DEFAULT_DASHBOARD_MAP_CAPABILITIES)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const zoneCodesKey = selectedZoneCodes.join(',')
  const scopeKey = `${scope}:${scope === 'territory' ? (selectedZoneId ?? zoneCodesKey) : ''}`
  const activityStations = useActivityStations(scope)
  const [loadedScopeKey, setLoadedScopeKey] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    const zoneCodes = zoneCodesKey ? zoneCodesKey.split(',') : EMPTY_ARRAY
    setPoints(EMPTY_ARRAY)
    setCapabilities(DEFAULT_DASHBOARD_MAP_CAPABILITIES)
    setIsLoading(true)
    setError(null)

    async function loadPoints() {
      try {
        const data = await loadDashboardMap({
          scope, zoneId: selectedZoneId,
          zoneCodes: scope === 'territory' ? zoneCodes : EMPTY_ARRAY
        }, {signal: controller.signal})
        if (requestIdRef.current !== requestId) return
        if (!Array.isArray(data?.points)) throw new Error('Impossible de charger les points de la carte.')
        setPoints(data.points)
        setCapabilities(normalizeDashboardMapCapabilities(data.capabilities))
        setLoadedScopeKey(scopeKey)
      } catch (error) {
        if (controller.signal.aborted || requestIdRef.current !== requestId) return
        setPoints(EMPTY_ARRAY)
        setCapabilities(DEFAULT_DASHBOARD_MAP_CAPABILITIES)
        setError(error.message || 'Impossible de charger les points de la carte.')
      }

      hasLoadedOnceRef.current = true
      setIsLoading(false)
    }

    loadPoints()

    return () => {
      controller.abort()
      if (requestIdRef.current === requestId) {
        requestIdRef.current += 1
      }
    }
  }, [scope, scopeKey, selectedZoneId, zoneCodesKey])

  if (isLoading && !hasLoadedOnceRef.current) {
    return <MapLoadingState />
  }

  return (
    <div className='relative'>
      {error && (
        <div className='fr-alert fr-alert--error fr-alert--sm mb-3' role='alert'>
          <p>{error}</p>
        </div>
      )}
      {activityStations.unavailable && <p role='status'>Certaines stations de suivi n’ont pas pu être chargées.</p>}
      {isLoading && (
        <span className='absolute left-2 top-2 z-20 bg-white px-2 py-1 text-xs font-medium text-[#000091] shadow-sm' role='status'>
          Actualisation de la carte…
        </span>
      )}
      <DashboardPointsMap
        {...mapProps}
        monitoringStations={scope === 'activity' ? activityStations.stations : monitoringStations}
        capabilities={loadedScopeKey === scopeKey ? capabilities : DEFAULT_DASHBOARD_MAP_CAPABILITIES}
        points={loadedScopeKey === scopeKey ? points : EMPTY_ARRAY}
      />
    </div>
  )
}

export default DashboardPointsMapLoader
