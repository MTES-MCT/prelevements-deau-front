'use client'

import {
  useCallback, useEffect, useMemo, useRef, useState
} from 'react'

import maplibre from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

import {cooperativeGesturesMapOptions} from '@/components/map/cooperative-gestures.js'
import planIGN from '@/components/map/styles/plan-ign.json'

const DEFAULT_MAP_ZOOM = 10
const FIT_BOUNDS_MAX_ZOOM = 15
const FIT_BOUNDS_PADDING = {
  top: 40,
  right: 40,
  bottom: 40,
  left: 40
}

function getPointId(point) {
  return point.pointPrelevementId || point.id
}

function normalizePointId(pointId) {
  if (pointId === null || pointId === undefined) {
    return null
  }

  return String(pointId)
}

function getPointCoordinates(point) {
  const coordinates = point?.coordinates?.coordinates

  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null
  }

  const [longitude, latitude] = coordinates.map(Number)

  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null
  }

  return [longitude, latitude]
}

function getPointById(points, pointId) {
  const normalizedPointId = normalizePointId(pointId)

  if (!normalizedPointId) {
    return null
  }

  return points.find(point => normalizePointId(getPointId(point)) === normalizedPointId) ?? null
}

function buildBounds(points) {
  const [firstPoint, ...otherPoints] = points
  const firstCoordinates = getPointCoordinates(firstPoint)

  if (!firstCoordinates) {
    return null
  }

  const bounds = new maplibre.LngLatBounds(firstCoordinates, firstCoordinates)

  for (const point of otherPoints) {
    const coordinates = getPointCoordinates(point)

    if (coordinates) {
      bounds.extend(coordinates)
    }
  }

  return bounds
}

function moveToPoints(map, points, {duration = 0} = {}) {
  if (!map || points.length === 0) {
    return
  }

  if (points.length === 1) {
    const coordinates = getPointCoordinates(points[0])

    if (coordinates) {
      map.easeTo({
        center: coordinates,
        duration
      })
    }

    return
  }

  const bounds = buildBounds(points)

  if (bounds) {
    map.fitBounds(bounds, {
      padding: FIT_BOUNDS_PADDING,
      maxZoom: FIT_BOUNDS_MAX_ZOOM,
      duration
    })
  }
}

function fitAllPoints(map, points, {duration = 0} = {}) {
  if (!map || points.length === 0) {
    return
  }

  if (points.length === 1) {
    const coordinates = getPointCoordinates(points[0])

    if (coordinates) {
      map.easeTo({
        center: coordinates,
        zoom: DEFAULT_MAP_ZOOM,
        duration
      })
    }

    return
  }

  const bounds = buildBounds(points)

  if (bounds) {
    map.fitBounds(bounds, {
      padding: FIT_BOUNDS_PADDING,
      maxZoom: FIT_BOUNDS_MAX_ZOOM,
      duration
    })
  }
}

function getInitialMapPoints(points, activePointId, selectedPointIdSet) {
  const activePoint = getPointById(points, activePointId)

  if (activePoint) {
    return [activePoint]
  }

  const selectedPoints = points.filter(point => selectedPointIdSet.has(normalizePointId(getPointId(point))))

  if (selectedPoints.length > 0) {
    return selectedPoints
  }

  return points
}

function buildFeatures(points, {
  activePointId,
  hoveredPointId,
  selectedPointIdSet,
  declaredPointIdSet
}) {
  const normalizedActivePointId = normalizePointId(activePointId)
  const normalizedHoveredPointId = normalizePointId(hoveredPointId)

  return {
    type: 'FeatureCollection',
    features: points
      .map(point => {
        const coordinates = getPointCoordinates(point)

        if (!coordinates) {
          return null
        }

        const id = normalizePointId(getPointId(point))

        if (!id) {
          return null
        }

        return {
          type: 'Feature',
          id,
          geometry: {
            type: 'Point',
            coordinates
          },
          properties: {
            id,
            name: point.name || 'Point de prélèvement',
            active: id === normalizedActivePointId,
            hovered: id === normalizedHoveredPointId,
            selected: selectedPointIdSet.has(id),
            declared: declaredPointIdSet.has(id)
          }
        }
      })
      .filter(Boolean)
  }
}

const QuickDeclarationMap = ({
  points = [],
  activePointId = null,
  hoveredPointId = null,
  selectedPointIds = [],
  declaredPointIds = [],
  onHoverPoint,
  onFocusPoint
}) => {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const hoverCallbackRef = useRef(onHoverPoint)
  const focusCallbackRef = useRef(onFocusPoint)
  const shouldTrackMapMovesRef = useRef(false)
  const isRecenteringRef = useRef(false)
  const [hasMapMoved, setHasMapMoved] = useState(false)
  const selectedPointIdSet = useMemo(
    () => new Set(selectedPointIds.map(pointId => normalizePointId(pointId)).filter(Boolean)),
    [selectedPointIds]
  )
  const declaredPointIdSet = useMemo(
    () => new Set(declaredPointIds.map(pointId => normalizePointId(pointId)).filter(Boolean)),
    [declaredPointIds]
  )
  const stateRef = useRef({
    activePointId,
    hoveredPointId,
    selectedPointIdSet,
    declaredPointIdSet
  })

  const pointsWithCoordinates = useMemo(
    () => points.filter(point => getPointCoordinates(point)),
    [points]
  )

  useEffect(() => {
    hoverCallbackRef.current = onHoverPoint
  }, [onHoverPoint])

  useEffect(() => {
    focusCallbackRef.current = onFocusPoint
  }, [onFocusPoint])

  useEffect(() => {
    stateRef.current = {
      activePointId,
      hoveredPointId,
      selectedPointIdSet,
      declaredPointIdSet
    }
  }, [activePointId, declaredPointIdSet, hoveredPointId, selectedPointIdSet])

  useEffect(() => {
    if (!containerRef.current || pointsWithCoordinates.length === 0) {
      return undefined
    }

    const firstCoordinates = getPointCoordinates(pointsWithCoordinates[0])
    const map = new maplibre.Map({
      container: containerRef.current,
      style: planIGN,
      center: firstCoordinates,
      attributionControl: {compact: true},
      zoom: DEFAULT_MAP_ZOOM,
      ...cooperativeGesturesMapOptions
    })

    mapRef.current = map

    map.on('load', () => {
      const data = buildFeatures(pointsWithCoordinates, stateRef.current)
      map.addSource('quick-declaration-points', {type: 'geojson', data})

      map.addLayer({
        id: 'quick-declaration-pin-halos',
        type: 'circle',
        source: 'quick-declaration-points',
        paint: {
          'circle-radius': [
            'case',
            ['==', ['get', 'active'], true],
            20,
            ['==', ['get', 'selected'], true],
            17,
            ['==', ['get', 'hovered'], true],
            15,
            ['==', ['get', 'declared'], true],
            12,
            0
          ],
          'circle-color': [
            'case',
            ['==', ['get', 'active'], true],
            '#000091',
            ['==', ['get', 'selected'], true],
            '#18753c',
            ['==', ['get', 'hovered'], true],
            '#6a6af4',
            ['==', ['get', 'declared'], true],
            '#666666',
            '#666666'
          ],
          'circle-opacity': [
            'case',
            [
              'any',
              ['==', ['get', 'active'], true],
              ['==', ['get', 'selected'], true],
              ['==', ['get', 'hovered'], true],
              ['==', ['get', 'declared'], true]
            ],
            0.18,
            0
          ],
          'circle-stroke-width': 0
        }
      })

      map.addLayer({
        id: 'quick-declaration-pins',
        type: 'circle',
        source: 'quick-declaration-points',
        paint: {
          'circle-radius': [
            'case',
            ['==', ['get', 'active'], true],
            13,
            ['==', ['get', 'selected'], true],
            11,
            ['==', ['get', 'hovered'], true],
            10,
            ['==', ['get', 'declared'], true],
            9,
            7
          ],
          'circle-color': [
            'case',
            ['==', ['get', 'active'], true],
            '#000091',
            ['==', ['get', 'selected'], true],
            '#18753c',
            ['==', ['get', 'hovered'], true],
            '#6a6af4',
            ['==', ['get', 'declared'], true],
            '#666666',
            '#666666'
          ],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': [
            'case',
            ['==', ['get', 'active'], true],
            3,
            ['==', ['get', 'selected'], true],
            3,
            ['==', ['get', 'hovered'], true],
            2,
            1.5
          ]
        }
      })

      map.addLayer({
        id: 'quick-declaration-labels',
        type: 'symbol',
        source: 'quick-declaration-points',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Source Sans Pro Bold'],
          'text-anchor': 'top',
          'text-offset': [0, 1.15],
          'text-size': [
            'case',
            ['==', ['get', 'active'], true],
            14,
            ['==', ['get', 'selected'], true],
            13,
            12
          ],
          'text-allow-overlap': true
        },
        paint: {
          'text-color': '#000091',
          'text-halo-color': '#ffffff',
          'text-halo-width': 2.5,
          'text-halo-blur': 0.25
        }
      })

      moveToPoints(
        map,
        getInitialMapPoints(
          pointsWithCoordinates,
          stateRef.current.activePointId,
          stateRef.current.selectedPointIdSet
        )
      )

      const onMapMoveStart = () => {
        if (shouldTrackMapMovesRef.current && !isRecenteringRef.current) {
          setHasMapMoved(true)
        }
      }

      map.on('movestart', onMapMoveStart)
      map.once('idle', () => {
        shouldTrackMapMovesRef.current = true
      })

      const interactivePointLayerIds = [
        'quick-declaration-pins',
        'quick-declaration-labels'
      ]

      const onInteractivePointMouseEnter = event => {
        const feature = event.features?.[0]
        const id = feature?.properties?.id

        map.getCanvas().style.cursor = 'pointer'

        if (id) {
          hoverCallbackRef.current?.(id)
        }
      }

      const onInteractivePointMouseMove = event => {
        const feature = event.features?.[0]
        const id = feature?.properties?.id

        if (id) {
          hoverCallbackRef.current?.(id)
        }
      }

      const onInteractivePointMouseLeave = () => {
        map.getCanvas().style.cursor = ''
        hoverCallbackRef.current?.(null)
      }

      const onInteractivePointClick = event => {
        const feature = event.features?.[0]
        const id = feature?.properties?.id

        if (id) {
          focusCallbackRef.current?.(id)
        }
      }

      for (const layerId of interactivePointLayerIds) {
        map.on('mouseenter', layerId, onInteractivePointMouseEnter)
        map.on('mousemove', layerId, onInteractivePointMouseMove)
        map.on('mouseleave', layerId, onInteractivePointMouseLeave)
        map.on('click', layerId, onInteractivePointClick)
      }
    })

    return () => {
      shouldTrackMapMovesRef.current = false
      isRecenteringRef.current = false
      map.remove()
      mapRef.current = null
    }
  }, [pointsWithCoordinates])

  useEffect(() => {
    const map = mapRef.current
    const activePoint = getPointById(pointsWithCoordinates, activePointId)

    if (!map || !activePoint) {
      return
    }

    moveToPoints(map, [activePoint], {duration: 350})
  }, [activePointId, pointsWithCoordinates])

  useEffect(() => {
    const map = mapRef.current
    const source = map?.getSource?.('quick-declaration-points')

    if (!source?.setData) {
      return
    }

    source.setData(buildFeatures(pointsWithCoordinates, {
      activePointId,
      hoveredPointId,
      selectedPointIdSet,
      declaredPointIdSet
    }))
  }, [activePointId, declaredPointIdSet, hoveredPointId, pointsWithCoordinates, selectedPointIdSet])

  const fitVisiblePoints = useCallback(() => {
    const map = mapRef.current

    if (!map) {
      return
    }

    isRecenteringRef.current = true
    setHasMapMoved(false)
    fitAllPoints(map, pointsWithCoordinates, {duration: 350})
    map.once('moveend', () => {
      isRecenteringRef.current = false
      setHasMapMoved(false)
    })
  }, [pointsWithCoordinates])

  if (pointsWithCoordinates.length === 0) {
    return (
      <div className='fr-p-2w text-center bg-white'>
        <p className='fr-hint-text fr-mb-0'>
          Aucun point géolocalisé.
        </p>
      </div>
    )
  }

  return (
    <div className='relative h-full min-h-[220px] w-full overflow-hidden bg-white'>
      {hasMapMoved && (
        <button
          type='button'
          className='fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-focus-3-line absolute right-2 top-2 z-10 bg-white shadow-sm'
          aria-label='Recentrer la carte sur tous les points'
          onClick={fitVisiblePoints}
        >
          Recentrer la carte
        </button>
      )}
      <div ref={containerRef} className='h-full min-h-[220px] w-full' />
    </div>
  )
}

export default QuickDeclarationMap
