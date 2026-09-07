'use client'

import {
  useEffect,
  useRef,
  useState
} from 'react'

import DashboardPointsMap from '@/components/dashboard/dashboard-points-map.js'
import {
  DEFAULT_DASHBOARD_MAP_CAPABILITIES,
  normalizeDashboardMapCapabilities
} from '@/lib/dashboard-map-popups.js'
import {getDashboardMapAction} from '@/server/actions/dashboard.js'

const EMPTY_ARRAY = []

const MapLoadingState = () => (
  <div
    className='flex h-[360px] w-full items-center justify-center border border-gray-200 bg-gray-100 text-center md:h-[430px]'
    role='status'
  >
    Chargement de la carte…
  </div>
)

const DashboardPointsMapLoader = ({
  selectedZoneCodes = EMPTY_ARRAY,
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

  useEffect(() => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    const zoneCodes = zoneCodesKey ? zoneCodesKey.split(',') : EMPTY_ARRAY
    setPoints(EMPTY_ARRAY)
    setCapabilities(DEFAULT_DASHBOARD_MAP_CAPABILITIES)
    setIsLoading(true)
    setError(null)

    async function loadPoints() {
      let result
      try {
        result = await getDashboardMapAction({
          scope,
          zoneCodes: scope === 'territory' ? zoneCodes : EMPTY_ARRAY
        })
      } catch {
        result = {success: false}
      }

      if (requestIdRef.current !== requestId) {
        return
      }

      if (result.success && Array.isArray(result.data?.points)) {
        setPoints(result.data.points)
        setCapabilities(normalizeDashboardMapCapabilities(result.data.capabilities))
      } else {
        setPoints(EMPTY_ARRAY)
        setCapabilities(DEFAULT_DASHBOARD_MAP_CAPABILITIES)
        setError(result.error || 'Impossible de charger les points de la carte.')
      }

      hasLoadedOnceRef.current = true
      setIsLoading(false)
    }

    loadPoints()

    return () => {
      if (requestIdRef.current === requestId) {
        requestIdRef.current += 1
      }
    }
  }, [scope, zoneCodesKey])

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
      {isLoading && (
        <span className='absolute left-2 top-2 z-20 bg-white px-2 py-1 text-xs font-medium text-[#000091] shadow' role='status'>
          Actualisation de la carte…
        </span>
      )}
      <DashboardPointsMap {...mapProps} capabilities={capabilities} points={points} />
    </div>
  )
}

export default DashboardPointsMapLoader
