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
import {useAuth} from '@/contexts/auth-context.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import useDebouncedValue from '@/hook/use-debounced-value.js'
import useEvent from '@/hook/use-event.js'
import {pointFlowTypeLabels} from '@/lib/point-flow-types.js'
import {
  MISSING_USAGE_KEY,
  createPointFilterIndex,
  filterPointsWithScores,
  getDefaultPointFilters,
  getPointFacetCounts,
  getPointFilterOptions,
  getPointFiltersFromSearchParams,
  getSearchParamsWithPointFilters,
  haveSameSelection
} from '@/lib/points-prelevement-filters.js'
import {getPointPrelevementURL} from '@/lib/urls.js'
import {getPointPrelevementAction} from '@/server/actions/points-prelevement.js'

const FLOW_TYPE_VALUES = Object.keys(pointFlowTypeLabels)
const POINTS_MAP_OPTIONS = Object.freeze({hash: true, cooperativeGestures: false})

const hasCoordinates = point => Array.isArray(point?.coordinates?.coordinates)
const getHighlightedPointId = (mapPointId, listPointId, selectedPointId) =>
  mapPointId ?? listPointId ?? selectedPointId
const SELECTION_FILTER_KEYS = Object.freeze([
  'collecteurStatuses',
  'connectorStatuses',
  'exploitationStatuses',
  'flowTypes',
  'managementZoneIds',
  'preleveurTypes',
  'usageKeys',
  'waterBodyTypes'
])

function hasNonDefaultFilters(filters, defaultFilters) {
  return filters.query.trim().length > 0
    || SELECTION_FILTER_KEYS.some(key =>
      !haveSameSelection(filters[key], defaultFilters[key]))
}

const MobileMapResultsAction = ({count, hasActiveFilters, onClick}) => {
  if (!hasActiveFilters || count === 0) {
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

const PointsMapPage = ({initialPointsResult}) => {
  const {user} = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const preferUsageName = user?.role === 'DECLARANT'
  const initialSelectedPointId = searchParams.get('point-prelevement')
  const points = useMemo(
    () => initialPointsResult?.success && Array.isArray(initialPointsResult.data)
      ? initialPointsResult.data
      : [],
    [initialPointsResult]
  )
  const canSearchDeclarants = points.some(point => point?.searchAccess?.declarants === true)

  const [filters, setFilters] = useState(() => {
    const pointFilterIndex = createPointFilterIndex(points)
    const pointFilterOptions = getPointFilterOptions(points, pointFilterIndex)
    const defaultFilters = getDefaultPointFilters({
      ...pointFilterOptions,
      flowTypes: FLOW_TYPE_VALUES
    })

    return getPointFiltersFromSearchParams(
      new URLSearchParams(searchParams.toString()),
      defaultFilters
    )
  })
  const error = initialPointsResult?.success
    ? null
    : 'Les points de prélèvement n’ont pas pu être chargés.'
  const [mapStyle, setMapStyle] = useState('plan-ign')
  const [mapRecenterRequestKey, setMapRecenterRequestKey] = useState(0)
  const [pointSelectionRequestKey, setPointSelectionRequestKey] = useState(
    initialSelectedPointId ? 1 : 0
  )
  const [selectedPointId, setSelectedPointId] = useState(
    initialSelectedPointId
  )
  const [mobileView, setMobileView] = useState('map')
  const [filterOpenRequestKey, setFilterOpenRequestKey] = useState(0)
  const [desktopListOpen, setDesktopListOpen] = useState(true)
  const [listHighlightedPointId, setListHighlightedPointId] = useState(null)
  const [mapHighlightedPointId, setMapHighlightedPointId] = useState(null)

  const pointFilterIndex = useMemo(() => createPointFilterIndex(points), [points])
  const pointFilterOptions = useMemo(
    () => getPointFilterOptions(points, pointFilterIndex),
    [pointFilterIndex, points]
  )
  const {
    collecteurStatusOptions,
    connectorStatusOptions,
    exploitationStatusOptions,
    managementZoneOptions,
    preleveurTypeOptions,
    usageOptions,
    waterBodyTypeOptions
  } = pointFilterOptions
  const defaultFilters = useMemo(
    () => getDefaultPointFilters({
      ...pointFilterOptions,
      flowTypes: FLOW_TYPE_VALUES
    }),
    [pointFilterOptions]
  )
  const deferredQuery = useDeferredValue(filters.query)
  const debouncedUrlQuery = useDebouncedValue(filters.query, 200)
  const isSearchPending = deferredQuery !== filters.query
  const deferredFilters = useMemo(
    () => ({...filters, query: deferredQuery}),
    [deferredQuery, filters]
  )
  const filtersForUrl = useMemo(
    () => ({...filters, query: debouncedUrlQuery}),
    [debouncedUrlQuery, filters]
  )

  const filteredPointsResult = useMemo(
    () => filterPointsWithScores(points, deferredFilters, pointFilterIndex),
    [deferredFilters, pointFilterIndex, points]
  )
  const filteredPoints = filteredPointsResult.points
  const facetCounts = useMemo(
    () => getPointFacetCounts(
      points,
      deferredFilters,
      pointFilterIndex,
      filteredPointsResult.scores
    ),
    [deferredFilters, filteredPointsResult.scores, pointFilterIndex, points]
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
  const hasActiveFilters = hasNonDefaultFilters(filters, defaultFilters)

  useEffect(() => {
    const visiblePointIds = new Set(filteredPointIds)

    setListHighlightedPointId(current => current && !visiblePointIds.has(current) ? null : current)
    setMapHighlightedPointId(current => current && !visiblePointIds.has(current) ? null : current)
    setSelectedPointId(current => current && !visiblePointIds.has(current) ? null : current)
  }, [filteredPointIds])

  useEffect(() => {
    if (debouncedUrlQuery !== filters.query) {
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
  }, [debouncedUrlQuery, defaultFilters, filters.query, filtersForUrl])

  useEffect(() => {
    const handlePopState = () => {
      setFilters(getPointFiltersFromSearchParams(
        new URLSearchParams(window.location.search),
        defaultFilters
      ))
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [defaultFilters])

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

  const handleOpenMobileSearch = useCallback(() => {
    setMobileView('list')
    setFilterOpenRequestKey(currentKey => currentKey + 1)
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
                    collecteurStatusOptions={collecteurStatusOptions}
                    canSearchDeclarants={canSearchDeclarants}
                    connectorStatusOptions={connectorStatusOptions}
                    disabled={false}
                    exploitationStatusOptions={exploitationStatusOptions}
                    facetCounts={facetCounts}
                    filters={filters}
                    hasActiveFilters={hasActiveFilters}
                    managementZoneOptions={managementZoneOptions}
                    openRequestKey={filterOpenRequestKey}
                    preleveurTypeOptions={preleveurTypeOptions}
                    resultsCount={filteredPoints.length}
                    searchPending={isSearchPending}
                    usageOptions={usageOptions}
                    waterBodyTypeOptions={waterBodyTypeOptions}
                    onChange={handleFilterChange}
                    onReset={handleReset}
                  />

                  <div className='min-h-0 flex-1'>
                    <PointsMapList
                      highlightedPointId={highlightedPointId}
                      isLoading={false}
                      points={filteredPoints}
                      preferUsageName={preferUsageName}
                      searchScores={filteredPointsResult.scores}
                      sortMode={filters.sort}
                      hasSearchQuery={Boolean(deferredQuery.trim())}
                      scrollHighlightedPointIntoView={Boolean(mapHighlightedPointId)}
                      onPointHover={setListHighlightedPointId}
                      onPointSelect={handleListPointSelect}
                      onClose={handleCloseList}
                    />
                  </div>

                  <MobileMapResultsAction
                    count={visibleMappablePoints.length}
                    hasActiveFilters={hasActiveFilters}
                    onClick={handleShowFilteredPointsOnMap}
                  />
                </div>
              </aside>

              <div className={`${mobileView === 'map' ? 'block' : 'hidden'} relative h-full min-h-0 lg:block`}>
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
                  <div className='absolute left-2 top-2 z-10 flex gap-2 lg:hidden'>
                    <button
                      className='fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-search-line bg-white shadow-sm'
                      type='button'
                      onClick={handleOpenMobileSearch}
                    >
                      Rechercher
                    </button>
                    <button
                      aria-label='Afficher la liste des points'
                      className='fr-btn fr-btn--secondary fr-btn--sm fr-icon-list-unordered bg-white shadow-sm'
                      title='Afficher la liste'
                      type='button'
                      onClick={() => setMobileView('list')}
                    />
                  </div>
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
                      counts={facetCounts.usageKeys}
                      options={usageOptions}
                      selectedValues={filters.usageKeys}
                      onToggle={handleLegendToggle}
                    />
                  )}
                </div>

                {visibleMappablePoints.length === 0 && (
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

export default PointsMapPage
