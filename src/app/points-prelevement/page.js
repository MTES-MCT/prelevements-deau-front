'use client'

import {
  useCallback, useDeferredValue, useEffect, useMemo, useState
} from 'react'

import {useRouter} from '@bprogress/next/app'
import {Alert} from '@codegouvfr/react-dsfr/Alert'
import {useSearchParams} from 'next/navigation'

import PointsMap from '@/components/map/index.js'
import MapStyleMenu from '@/components/points-prelevement/map-style-menu.js'
import PointsMapFilters from '@/components/points-prelevement/points-map-filters.js'
import PointsMapLegend from '@/components/points-prelevement/points-map-legend.js'
import PointsMapList from '@/components/points-prelevement/points-map-list.js'
import LoadingOverlay from '@/components/ui/LoadingOverlay/index.js'
import {useAuth} from '@/contexts/auth-context.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import useDebouncedValue from '@/hook/use-debounced-value.js'
import useEvent from '@/hook/use-event.js'
import {pointFlowTypeLabels} from '@/lib/point-flow-types.js'
import {
  MISSING_USAGE_KEY,
  countPointsByUsage,
  createPointFilterIndex,
  filterPoints,
  getPointFiltersFromSearchParams,
  getSearchParamsWithPointFilters,
  getUsageOptionsForPoints,
  getWaterBodyTypeOptionsForPoints,
  haveSameSelection
} from '@/lib/points-prelevement-filters.js'
import {getPointPrelevementURL} from '@/lib/urls.js'
import {
  getPointMapSummariesAction,
  getPointPrelevementAction
} from '@/server/actions/points-prelevement.js'

const FLOW_TYPE_VALUES = Object.keys(pointFlowTypeLabels)
const POINTS_MAP_OPTIONS = Object.freeze({hash: true, cooperativeGestures: false})

const getDefaultFilters = (usageOptions = [], waterBodyTypeOptions = []) => ({
  query: '',
  usageKeys: usageOptions.map(option => option.value),
  flowTypes: FLOW_TYPE_VALUES,
  waterBodyTypes: waterBodyTypeOptions.map(option => option.value)
})

const hasCoordinates = point => Array.isArray(point?.coordinates?.coordinates)
const getHighlightedPointId = (mapPointId, listPointId, selectedPointId) =>
  mapPointId ?? listPointId ?? selectedPointId

const MobileMapResultsAction = ({count, hasActiveFilters, loading, onClick}) => {
  if (loading || !hasActiveFilters || count === 0) {
    return null
  }

  return (
    <div className='shrink-0 border-t border-gray-200 bg-white p-2.5 lg:hidden'>
      <button
        className='fr-btn fr-btn--sm fr-btn--icon-left fr-icon-map-pin-2-line w-full justify-center'
        type='button'
        onClick={onClick}
      >
        {count === 1
          ? 'Voir le point sur la carte'
          : `Voir les ${count} points sur la carte`}
      </button>
    </div>
  )
}

const Page = () => {
  const {user} = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const preferUsageName = user?.role === 'DECLARANT'
  const initialSelectedPointId = searchParams.get('point-prelevement')

  const [points, setPoints] = useState([])
  const [filters, setFilters] = useState(getDefaultFilters())
  const [filtersInitialized, setFiltersInitialized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mapStyle, setMapStyle] = useState('plan-ign')
  const [mapRecenterRequestKey, setMapRecenterRequestKey] = useState(0)
  const [pointSelectionRequestKey, setPointSelectionRequestKey] = useState(
    initialSelectedPointId ? 1 : 0
  )
  const [selectedPointId, setSelectedPointId] = useState(
    initialSelectedPointId
  )
  const [mobileView, setMobileView] = useState('map')
  const [desktopListOpen, setDesktopListOpen] = useState(true)
  const [listHighlightedPointId, setListHighlightedPointId] = useState(null)
  const [mapHighlightedPointId, setMapHighlightedPointId] = useState(null)

  useEffect(() => {
    async function fetchPoints() {
      try {
        const result = await getPointMapSummariesAction()
        if (!result.success) {
          setError('Les points de prélèvement n’ont pas pu être chargés.')
          return
        }

        const loadedPoints = result.data ?? []
        const loadedUsageOptions = getUsageOptionsForPoints(loadedPoints)
        const loadedWaterBodyTypeOptions = getWaterBodyTypeOptionsForPoints(loadedPoints)
        const loadedDefaultFilters = getDefaultFilters(
          loadedUsageOptions,
          loadedWaterBodyTypeOptions
        )

        setPoints(loadedPoints)
        setFilters(getPointFiltersFromSearchParams(
          new URLSearchParams(window.location.search),
          loadedDefaultFilters
        ))
        setFiltersInitialized(true)
      } catch (fetchError) {
        console.error('Erreur lors du chargement des points :', fetchError)
        setError('Les points de prélèvement n’ont pas pu être chargés.')
      } finally {
        setLoading(false)
      }
    }

    fetchPoints()
  }, [])

  const usageOptions = useMemo(() => getUsageOptionsForPoints(points), [points])
  const waterBodyTypeOptions = useMemo(() => getWaterBodyTypeOptionsForPoints(points), [points])
  const pointFilterIndex = useMemo(() => createPointFilterIndex(points), [points])
  const defaultFilters = useMemo(
    () => getDefaultFilters(usageOptions, waterBodyTypeOptions),
    [usageOptions, waterBodyTypeOptions]
  )
  const deferredQuery = useDeferredValue(filters.query)
  const debouncedUrlQuery = useDebouncedValue(filters.query, 200)
  const isSearchPending = deferredQuery !== filters.query
  const deferredFilters = useMemo(() => ({
    flowTypes: filters.flowTypes,
    query: deferredQuery,
    usageKeys: filters.usageKeys,
    waterBodyTypes: filters.waterBodyTypes
  }), [deferredQuery, filters.flowTypes, filters.usageKeys, filters.waterBodyTypes])
  const filtersForUrl = useMemo(() => ({
    flowTypes: filters.flowTypes,
    query: debouncedUrlQuery,
    usageKeys: filters.usageKeys,
    waterBodyTypes: filters.waterBodyTypes
  }), [debouncedUrlQuery, filters.flowTypes, filters.usageKeys, filters.waterBodyTypes])

  const filteredPoints = useMemo(
    () => filterPoints(points, deferredFilters, pointFilterIndex),
    [deferredFilters, pointFilterIndex, points]
  )
  const pointsBeforeUsageFilter = useMemo(() => filterPoints(points, {
    ...deferredFilters,
    usageKeys: defaultFilters.usageKeys
  }, pointFilterIndex), [defaultFilters.usageKeys, deferredFilters, pointFilterIndex, points])
  const usageCounts = useMemo(
    () => countPointsByUsage(pointsBeforeUsageFilter, usageOptions, pointFilterIndex),
    [pointFilterIndex, pointsBeforeUsageFilter, usageOptions]
  )
  const filteredPointIds = useMemo(
    () => filteredPoints.map(point => point.id),
    [filteredPoints]
  )
  const highlightedPointId = getHighlightedPointId(
    mapHighlightedPointId,
    listHighlightedPointId,
    selectedPointId
  )
  const mappablePoints = useMemo(() => points.filter(point => hasCoordinates(point)), [points])
  const mappablePointsById = useMemo(
    () => new Map(mappablePoints.map(point => [point.id, point])),
    [mappablePoints]
  )
  const visibleMappablePoints = useMemo(
    () => filteredPoints.filter(point => hasCoordinates(point)),
    [filteredPoints]
  )
  const visibleUsageKeys = useMemo(
    () => filters.usageKeys.filter(key => key !== MISSING_USAGE_KEY),
    [filters.usageKeys]
  )
  const hasActiveFilters = filters.query.trim().length > 0
    || !haveSameSelection(filters.usageKeys, defaultFilters.usageKeys)
    || !haveSameSelection(filters.flowTypes, defaultFilters.flowTypes)
    || !haveSameSelection(filters.waterBodyTypes, defaultFilters.waterBodyTypes)

  useEffect(() => {
    const visiblePointIds = new Set(filteredPointIds)

    setListHighlightedPointId(current => current && !visiblePointIds.has(current) ? null : current)
    setMapHighlightedPointId(current => current && !visiblePointIds.has(current) ? null : current)
    setSelectedPointId(current => current && !visiblePointIds.has(current) ? null : current)
  }, [filteredPointIds])

  useEffect(() => {
    if (!filtersInitialized || debouncedUrlQuery !== filters.query) {
      return
    }

    const nextSearchParams = getSearchParamsWithPointFilters(
      new URLSearchParams(window.location.search),
      filtersForUrl,
      defaultFilters
    )
    const search = nextSearchParams.toString()
    const nextUrl = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`

    if (nextUrl !== currentUrl) {
      window.history.replaceState(window.history.state, '', nextUrl)
    }
  }, [debouncedUrlQuery, defaultFilters, filters.query, filtersForUrl, filtersInitialized])

  useEffect(() => {
    if (!filtersInitialized) {
      return
    }

    const handlePopState = () => {
      setFilters(getPointFiltersFromSearchParams(
        new URLSearchParams(window.location.search),
        defaultFilters
      ))
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [defaultFilters, filtersInitialized])

  const handleOpenPoint = useEvent(point => {
    if (point.canReadDetail === false) {
      return
    }

    router.push(getPointPrelevementURL(point))
  })

  const handleSelectedPoint = useEvent(point => {
    setSelectedPointId(point.id)
  })

  const handleListPointSelect = useEvent(point => {
    if (!hasCoordinates(point)) {
      if (point.canReadDetail !== false) {
        handleOpenPoint(point)
      }

      return
    }

    handleSelectedPoint(point)
    setPointSelectionRequestKey(currentKey => currentKey + 1)
    setMobileView('map')
  })

  const handleFilterChange = useCallback(changes => {
    setFilters(current => ({...current, ...changes}))
  }, [])

  const handleLegendToggle = useCallback((usageKey, checked) => {
    setFilters(current => ({
      ...current,
      usageKeys: usageOptions
        .map(option => option.value)
        .filter(key => key === usageKey ? checked : current.usageKeys.includes(key))
    }))
  }, [usageOptions])

  const handleReset = useCallback(() => {
    setFilters(defaultFilters)
  }, [defaultFilters])

  const handleCloseList = useCallback(() => {
    setListHighlightedPointId(null)
    setMobileView('map')
    setDesktopListOpen(false)
  }, [])

  const handleShowFilteredPointsOnMap = useCallback(() => {
    setMobileView('map')
    setMapRecenterRequestKey(currentKey => currentKey + 1)
  }, [])

  return (
    <>
      <StartDsfrOnHydration />

      <div className='flex min-h-0 flex-1 flex-col bg-[#f7f7fb]'>
        {error ? (
          <div className='flex-1 px-4 py-6 md:px-6'>
            <Alert
              description={error}
              severity='error'
              title='Chargement impossible'
            />
          </div>
        ) : (
          <section className='relative min-h-0 flex-1 overflow-hidden border-t border-gray-200 bg-white' aria-label='Carte et liste des points de prélèvement'>
            <div className={`absolute inset-0 grid min-h-0 grid-cols-1 ${desktopListOpen ? 'lg:grid-cols-[370px_minmax(0,1fr)]' : 'lg:grid-cols-1'}`}>
              <aside className={`${mobileView === 'list' ? 'block' : 'hidden'} h-full min-h-0 border-r border-gray-200 ${desktopListOpen ? 'lg:block' : 'lg:hidden'}`}>
                <div className='flex h-full min-h-0 flex-col bg-white'>
                  <PointsMapFilters
                    disabled={loading}
                    filters={filters}
                    hasActiveFilters={hasActiveFilters}
                    resultsCount={loading ? null : filteredPoints.length}
                    searchPending={isSearchPending}
                    usageOptions={usageOptions}
                    waterBodyTypeOptions={waterBodyTypeOptions}
                    onChange={handleFilterChange}
                    onReset={handleReset}
                  />

                  <div className='min-h-0 flex-1'>
                    <PointsMapList
                      highlightedPointId={highlightedPointId}
                      isLoading={loading}
                      points={filteredPoints}
                      preferUsageName={preferUsageName}
                      scrollHighlightedPointIntoView={Boolean(mapHighlightedPointId)}
                      onPointHover={setListHighlightedPointId}
                      onPointSelect={handleListPointSelect}
                      onClose={handleCloseList}
                    />
                  </div>

                  <MobileMapResultsAction
                    count={visibleMappablePoints.length}
                    hasActiveFilters={hasActiveFilters}
                    loading={loading}
                    onClick={handleShowFilteredPointsOnMap}
                  />
                </div>
              </aside>

              <div className={`${mobileView === 'map' ? 'block' : 'hidden'} relative h-full min-h-0 lg:block`}>
                {loading && <LoadingOverlay />}

                <PointsMap
                  recenterControl
                  showNavigationControls
                  centerSelectedPointOnChange={false}
                  filteredPoints={filteredPointIds}
                  handleSelectedPoint={handleSelectedPoint}
                  highlightedPoint={highlightedPointId
                    ? mappablePointsById.get(highlightedPointId)
                    : null}
                  loadPointDetails={getPointPrelevementAction}
                  mapStyle={mapStyle}
                  options={POINTS_MAP_OPTIONS}
                  points={mappablePoints}
                  pointPopupActionLabel='Voir la fiche du point'
                  preferUsageName={preferUsageName}
                  recenterControlClassName='right-14 top-2'
                  recenterControlLabel='Recentrer la carte'
                  recenterRequestKey={mapRecenterRequestKey}
                  selectedPoint={selectedPointId ? mappablePointsById.get(selectedPointId) : null}
                  selectedPointRequestKey={pointSelectionRequestKey}
                  visibleUsageKeys={visibleUsageKeys}
                  onPointPopupAction={handleOpenPoint}
                  onPointHover={setMapHighlightedPointId}
                />

                {mobileView === 'map' && (
                  <button
                    className='fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-list-unordered absolute left-2 top-2 z-10 bg-white shadow-sm lg:hidden'
                    type='button'
                    onClick={() => setMobileView('list')}
                  >
                    Liste
                  </button>
                )}

                {!desktopListOpen && (
                  <button
                    className='fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-list-unordered absolute left-2 top-2 z-10 hidden bg-white shadow-sm lg:inline-flex'
                    type='button'
                    onClick={() => setDesktopListOpen(true)}
                  >
                    Liste
                  </button>
                )}

                <div className='absolute bottom-2 left-2 z-10 flex items-end gap-2'>
                  <MapStyleMenu value={mapStyle} onChange={setMapStyle} />

                  {usageOptions.length > 0 && (
                    <PointsMapLegend
                      counts={usageCounts}
                      options={usageOptions}
                      selectedValues={filters.usageKeys}
                      onToggle={handleLegendToggle}
                    />
                  )}
                </div>

                {!loading && visibleMappablePoints.length === 0 && (
                  <div className='pointer-events-none absolute inset-0 z-[5] flex items-center justify-center bg-white/80 p-6 text-center text-sm text-gray-600'>
                    {filteredPoints.length === 0
                      ? 'Aucun point ne correspond aux filtres sélectionnés.'
                      : 'Aucun des points affichés ne dispose de coordonnées.'}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </>
  )
}

export default Page
