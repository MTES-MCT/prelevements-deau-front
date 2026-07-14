'use client'

import {
  memo, useCallback, useEffect, useMemo, useRef, useState
} from 'react'

import {Box} from '@mui/material'
import maplibre from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {createRoot} from 'react-dom/client'

import Popup from './popup.js'
import photo from './styles/photo.json'
import planIGN from './styles/plan-ign.json'
import vectorIGN from './styles/vector-ign.json'
import vector from './styles/vector.json'

import {cooperativeGesturesLocale} from '@/components/map/cooperative-gestures.js'
import {getMapMaxZoomForStyle} from '@/components/map/ign-raster.js'
import {
  computeBestPopupAnchor,
  createUsagePieChart,
  createPointPrelevementFeatures,
  createSVGDataURL,
  getPointMarkerIconId,
  getPointMarkerUsages
} from '@/lib/points-prelevement.js'

const SOURCE_ID = 'points-prelevement'
const HIGHLIGHT_LAYER_ID = 'highlighted-point-prelevement'
const FIT_BOUNDS_MAX_ZOOM = 14
const FIT_BOUNDS_PADDING = 80
const POPUP_DETAILS_HOVER_DELAY = 150
const SINGLE_POINT_ZOOM = 14
const DEFAULT_MAP_CENTER = [2.5, 46.5]
const DEFAULT_MAP_ZOOM = 5
const stylesMap = {
  photo,
  'plan-ign': planIGN,
  vector,
  'vector-ign': vectorIGN
}

function hasExplicitMapViewportHash(hash) {
  const [zoom, latitude, longitude] = hash.slice(1).split('/').map(Number)
  if (![zoom, latitude, longitude].every(value => Number.isFinite(value))) {
    return false
  }

  const [defaultLongitude, defaultLatitude] = DEFAULT_MAP_CENTER
  return Math.abs(zoom - DEFAULT_MAP_ZOOM) > 0.001
    || Math.abs(latitude - defaultLatitude) > 0.001
    || Math.abs(longitude - defaultLongitude) > 0.001
}

function updateHighlightedMarker(map, point) {
  if (map.getLayer(HIGHLIGHT_LAYER_ID)) {
    map.setFilter(HIGHLIGHT_LAYER_ID, [
      '==',
      ['get', 'id'],
      point?.id ?? ''
    ])
  }
}

function resetPointLabelHighlight(map) {
  if (map.getLayer('points-prelevement-nom')) {
    map.setFilter('points-prelevement-nom', null)
  }

  if (map.getLayer('selected-point-prelevement-nom')) {
    map.removeLayer('selected-point-prelevement-nom')
  }
}

function prepareMarkerImages(map, points, visibleUsageKeys) {
  const preparedMarkerIds = new Set()
  for (const point of points) {
    const markerUsages = getPointMarkerUsages(point, visibleUsageKeys)
    const markerId = getPointMarkerIconId(markerUsages)
    if (preparedMarkerIds.has(markerId)) {
      continue
    }

    preparedMarkerIds.add(markerId)
    if (!map.hasImage(markerId)) {
      const el = createUsagePieChart(markerUsages)
      const dataURL = createSVGDataURL(el)
      const img = new Image()
      img.src = dataURL
      img.addEventListener('load', () => {
        if (!map.hasImage(markerId)) {
          map.addImage(markerId, img, {pixelRatio: window.devicePixelRatio})
        }
      })

      img.addEventListener('error', error => {
        console.error('Erreur lors du chargement de l’image :', error)
      })
    }
  }
}

function getVisiblePoints(points, filteredPoints) {
  if (!Array.isArray(filteredPoints)) {
    return points
  }

  const visiblePointIds = new Set(filteredPoints.map(pointOrId =>
    typeof pointOrId === 'object' ? pointOrId.id : pointOrId))

  return points.filter(point => visiblePointIds.has(point.id))
}

function fitMapToPoints(map, points, {duration = 0} = {}) {
  const coordinates = points
    .map(point => point.coordinates?.coordinates)
    .filter(Boolean)

  if (!map || coordinates.length === 0) {
    return false
  }

  if (coordinates.length === 1) {
    map.easeTo({
      center: coordinates[0],
      zoom: SINGLE_POINT_ZOOM,
      duration
    })

    return true
  }

  const [firstCoordinates, ...otherCoordinates] = coordinates
  const bounds = new maplibre.LngLatBounds(firstCoordinates, firstCoordinates)
  for (const coordinate of otherCoordinates) {
    bounds.extend(coordinate)
  }

  map.fitBounds(bounds, {
    padding: FIT_BOUNDS_PADDING,
    maxZoom: FIT_BOUNDS_MAX_ZOOM,
    duration
  })

  return true
}

function loadMap(map, points, {
  preferUsageName = false,
  showLabels = true,
  visibleUsageKeys
} = {}) {
  // --- Chargement de la source et du layer de texte ---
  const geojson = createPointPrelevementFeatures(points, {
    preferUsageName,
    visibleUsageKeys
  })
  prepareMarkerImages(map, points, visibleUsageKeys)

  if (map.getSource(SOURCE_ID)) {
    map.getSource(SOURCE_ID).setData(geojson)
  } else {
    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: geojson
    })
  }

  if (!map.getLayer(HIGHLIGHT_LAYER_ID)) {
    map.addLayer({
      id: HIGHLIGHT_LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['==', ['get', 'id'], ''],
      paint: {
        'circle-radius': 16,
        'circle-color': '#fff',
        'circle-opacity': 0.95,
        'circle-stroke-color': '#000091',
        'circle-stroke-width': 3
      }
    }, map.getLayer('markers-symbol') ? 'markers-symbol' : undefined)
  }

  if (!map.getLayer('markers-symbol')) {
    map.addLayer({
      id: 'markers-symbol',
      type: 'symbol',
      source: SOURCE_ID,
      layout: {
        'icon-image': ['get', 'icon'],
        'icon-size': 1,
        'icon-allow-overlap': true
      }
    })
  }

  if (map.getLayer('points-prelevement-nom')) {
    // Update visibility if layer already exists
    map.setLayoutProperty('points-prelevement-nom', 'visibility', showLabels ? 'visible' : 'none')
  } else {
    map.addLayer({
      id: 'points-prelevement-nom',
      type: 'symbol',
      source: SOURCE_ID,
      layout: {
        'text-field': ['get', 'name'],
        'text-anchor': 'bottom',
        'text-offset': ['get', 'textOffset'],
        visibility: showLabels ? 'visible' : 'none'
      },
      paint: {
        'text-halo-color': '#fff',
        'text-halo-width': 2,
        'text-color': '#000'
      }
    })
  }
}

const MapView = ({
  points = [],
  centerSelectedPointOnChange = true,
  filteredPoints,
  highlightedPoint,
  selectedPoint,
  handleSelectedPoint,
  loadPointDetails,
  onPointHover,
  onPointPopupAction,
  mapStyle = 'plan-ign',
  showLabels = true,
  options = {},
  pointPopupActionLabel,
  preferUsageName = false,
  recenterControl = false,
  recenterControlClassName = 'right-2 top-2',
  recenterControlLabel,
  recenterRequestKey = 0,
  selectedPointRequestKey = 0,
  showNavigationControls = false,
  visibleUsageKeys
}) => {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const activePopupPointIdRef = useRef(null)
  const loadPointDetailsRef = useRef(loadPointDetails)
  const pointDetailsCacheRef = useRef(new Map())
  const popupRef = useRef(null)
  const popupDetailsTimeoutRef = useRef(null)
  const popupPersistentRef = useRef(false)
  const popupRootRef = useRef(null)
  const closeSelectedPointPopupRef = useRef(null)
  const handleSelectedPointRef = useRef(handleSelectedPoint)
  const handledRecenterRequestKeyRef = useRef(0)
  const handledSelectedPointRequestKeyRef = useRef(0)
  const hasFittedInitialPointsRef = useRef(false)
  const hasInitialUrlViewportRef = useRef(false)
  const isRecenteringRef = useRef(false)
  const onPointPopupActionRef = useRef(onPointPopupAction)
  const openSelectedPointPopupRef = useRef(null)
  const onPointHoverRef = useRef(onPointHover)
  const pointPopupActionLabelRef = useRef(pointPopupActionLabel)
  const pointsByIdRef = useRef(new Map())
  const pointsRef = useRef(points)
  const preferUsageNameRef = useRef(preferUsageName)
  const selectedPointRef = useRef(selectedPoint)
  const highlightedPointRef = useRef(highlightedPoint)
  const showLabelsRef = useRef(showLabels)
  const shouldTrackMapMovesRef = useRef(false)
  const visiblePointIdsRef = useRef(null)
  const [hasMapMoved, setHasMapMoved] = useState(false)
  const pointsById = useMemo(
    () => new Map(points.map(point => [point.id, point])),
    [points]
  )
  const visiblePoints = useMemo(
    () => getVisiblePoints(points, filteredPoints),
    [filteredPoints, points]
  )
  const canRecenter = useMemo(
    () => visiblePoints.some(point => point.coordinates?.coordinates),
    [visiblePoints]
  )

  pointsRef.current = points
  handleSelectedPointRef.current = handleSelectedPoint
  loadPointDetailsRef.current = loadPointDetails
  onPointHoverRef.current = onPointHover
  onPointPopupActionRef.current = onPointPopupAction
  pointPopupActionLabelRef.current = pointPopupActionLabel
  preferUsageNameRef.current = preferUsageName
  selectedPointRef.current = selectedPoint
  highlightedPointRef.current = highlightedPoint
  showLabelsRef.current = showLabels
  pointsByIdRef.current = pointsById

  useEffect(() => {
    if (!mapContainerRef.current) {
      return
    }

    shouldTrackMapMovesRef.current = false
    isRecenteringRef.current = false
    hasFittedInitialPointsRef.current = false
    hasInitialUrlViewportRef.current = Boolean(
      options.hash && hasExplicitMapViewportHash(window.location.hash)
    )
    visiblePointIdsRef.current = null
    setHasMapMoved(false)

    // Calculate initial center and zoom based on points to avoid visible transitions
    const mapConfig = {
      container: mapContainerRef.current,
      style: stylesMap[mapStyle],
      center: DEFAULT_MAP_CENTER,
      zoom: DEFAULT_MAP_ZOOM,
      hash: options.hash ?? false,
      cooperativeGestures: options.cooperativeGestures ?? true,
      locale: cooperativeGesturesLocale,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      attributionControl: {compact: true},
      maxZoom: options.maxZoom ?? getMapMaxZoomForStyle(mapStyle)
    }

    let boundsToFit = null
    let fitBoundsOptions = null

    const initialPoints = pointsRef.current
    if (initialPoints.length > 0) {
      const coordinates = initialPoints
        .map(point => point.coordinates?.coordinates)
        .filter(Boolean)

      if (coordinates.length > 0 && hasInitialUrlViewportRef.current) {
        hasFittedInitialPointsRef.current = true
      } else if (coordinates.length === 1) {
        mapConfig.center = coordinates[0]
        hasFittedInitialPointsRef.current = true
      } else if (coordinates.length > 1) {
        const bounds = new maplibre.LngLatBounds(coordinates[0], coordinates[1])
        for (const coord of coordinates) {
          bounds.extend(coord)
        }

        boundsToFit = bounds
        fitBoundsOptions = {
          padding: 80,
          duration: 0
        }
        hasFittedInitialPointsRef.current = true
      }
    }

    const map = new maplibre.Map(mapConfig)
    mapRef.current = map

    // Apply bounds after map creation if needed
    if (boundsToFit) {
      map.fitBounds(boundsToFit, fitBoundsOptions)
    }

    // Contrôle d'échelle
    const scale = new maplibre.ScaleControl({
      maxWidth: 80,
      unit: 'metric'
    })
    map.addControl(scale, 'bottom-right')

    if (showNavigationControls) {
      map.addControl(new maplibre.NavigationControl({showCompass: false}), 'top-right')
    }

    const removePopup = () => {
      if (popupDetailsTimeoutRef.current !== null) {
        window.clearTimeout(popupDetailsTimeoutRef.current)
        popupDetailsTimeoutRef.current = null
      }

      activePopupPointIdRef.current = null
      popupPersistentRef.current = false
      const popupRoot = popupRootRef.current
      popupRootRef.current = null
      popupRoot?.unmount()
      const popup = popupRef.current
      popupRef.current = null
      popup?.remove()
    }

    const getPointDetails = async pointId => {
      const cachedDetails = pointDetailsCacheRef.current.get(pointId)
      if (cachedDetails) {
        return cachedDetails
      }

      const loader = loadPointDetailsRef.current
      if (!loader) {
        return null
      }

      const request = (async () => {
        try {
          const result = await loader(pointId)
          const details = result?.success ? result.data : null
          if (details) {
            pointDetailsCacheRef.current.set(pointId, details)
          } else {
            pointDetailsCacheRef.current.delete(pointId)
          }

          return details
        } catch {
          pointDetailsCacheRef.current.delete(pointId)
          return null
        }
      })()

      pointDetailsCacheRef.current.set(pointId, request)
      return request
    }

    const openPointPopup = (point, coordinates, {persistent = false} = {}) => {
      if (!point || !coordinates) {
        return
      }

      removePopup()
      const pointId = point.id
      activePopupPointIdRef.current = pointId
      popupPersistentRef.current = persistent
      const popupContainer = document.createElement('div')
      const root = createRoot(popupContainer)
      popupRootRef.current = root
      const cachedDetails = pointDetailsCacheRef.current.get(pointId)
      const detailedPoint = cachedDetails && typeof cachedDetails.then !== 'function'
        ? cachedDetails
        : null
      const canReadDetail = point.canReadDetail !== false
      const canLoadDetails = Boolean(loadPointDetailsRef.current) && canReadDetail
      const showDeclarants = canLoadDetails
        || Object.hasOwn(point, 'preleveurs')
        || Object.hasOwn(point, 'collecteurs')
      const renderPopup = ({details = detailedPoint, detailsError = false} = {}) => {
        root.render(
          <Popup
            actionLabel={persistent && canReadDetail ? pointPopupActionLabelRef.current : undefined}
            declarantsError={detailsError}
            declarantsLoading={canLoadDetails && !details && !detailsError}
            dismissable={persistent}
            point={details ?? point}
            preferUsageName={preferUsageNameRef.current}
            showDeclarants={showDeclarants}
            onAction={persistent && canReadDetail
              ? () => onPointPopupActionRef.current?.(details ?? point)
              : undefined}
          />
        )
      }

      renderPopup()

      const dynamicPopup = new maplibre.Popup({
        className: 'points-prelevement-map-popup',
        closeButton: persistent,
        closeOnClick: persistent,
        anchor: computeBestPopupAnchor(map, coordinates),
        maxWidth: 'min(320px, calc(100vw - 1.5rem))',
        offset: 10
      })
        .setLngLat(coordinates)
        .setDOMContent(popupContainer)
        .addTo(map)
      popupRef.current = dynamicPopup

      dynamicPopup.on('close', () => {
        if (popupRef.current !== dynamicPopup) {
          return
        }

        if (popupDetailsTimeoutRef.current !== null) {
          window.clearTimeout(popupDetailsTimeoutRef.current)
          popupDetailsTimeoutRef.current = null
        }

        activePopupPointIdRef.current = null
        popupPersistentRef.current = false
        const activeRoot = popupRootRef.current
        popupRootRef.current = null
        popupRef.current = null
        activeRoot?.unmount()
      })

      if (canLoadDetails && !detailedPoint) {
        popupDetailsTimeoutRef.current = window.setTimeout(async () => {
          popupDetailsTimeoutRef.current = null
          const details = await getPointDetails(pointId)
          if (
            activePopupPointIdRef.current !== pointId
            || popupRef.current !== dynamicPopup
            || !popupRootRef.current
          ) {
            return
          }

          renderPopup({details, detailsError: !details})
        }, persistent ? 0 : POPUP_DETAILS_HOVER_DELAY)
      }
    }

    openSelectedPointPopupRef.current = point => {
      openPointPopup(point, point.coordinates?.coordinates, {persistent: true})
    }

    closeSelectedPointPopupRef.current = () => {
      if (popupPersistentRef.current) {
        removePopup()
      }
    }

    // Définition des callbacks pour la couche "markers-symbol"
    const onMarkerMouseEnter = e => {
      map.getCanvas().style.cursor = 'pointer'
      if (e.features && e.features.length > 0) {
        const feature = e.features[0]
        const pointId = feature.properties.id
        const hoveredPoint = pointsByIdRef.current.get(pointId)
        if (!hoveredPoint) {
          return
        }

        onPointHoverRef.current?.(pointId)
        if (!popupPersistentRef.current) {
          openPointPopup(hoveredPoint, feature.geometry.coordinates)
        }
      }
    }

    const onMarkerMouseLeave = () => {
      map.getCanvas().style.cursor = ''
      onPointHoverRef.current?.(null)
      if (!popupPersistentRef.current) {
        removePopup()
      }
    }

    const onMarkerClick = e => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0]
        const point = pointsByIdRef.current.get(feature.properties.id)
        if (!point) {
          return
        }

        onPointHoverRef.current?.(null)
        if (onPointPopupActionRef.current) {
          openPointPopup(point, feature.geometry.coordinates, {persistent: true})
        } else {
          removePopup()
        }

        handleSelectedPointRef.current?.(point)
      }
    }

    // Attache les événements une fois que la carte est chargée
    map.on('load', () => {
      map.on('mouseenter', 'markers-symbol', onMarkerMouseEnter)
      map.on('mouseleave', 'markers-symbol', onMarkerMouseLeave)
      map.on('click', 'markers-symbol', onMarkerClick)

      if (recenterControl) {
        const onMapMoveStart = () => {
          if (shouldTrackMapMovesRef.current && !isRecenteringRef.current) {
            setHasMapMoved(true)
          }
        }

        map.on('movestart', onMapMoveStart)
        map.once('idle', () => {
          shouldTrackMapMovesRef.current = true
        })
      }
    })

    return () => {
      shouldTrackMapMovesRef.current = false
      isRecenteringRef.current = false
      onPointHoverRef.current?.(null)
      closeSelectedPointPopupRef.current = null
      openSelectedPointPopupRef.current = null
      removePopup()
      map.remove()
      mapRef.current = null
    }
  }, [mapStyle, options.hash, options.cooperativeGestures, options.maxZoom, recenterControl, showNavigationControls])

  useEffect(() => {
    if (!mapContainerRef.current || typeof ResizeObserver === 'undefined') {
      return
    }

    const observer = new ResizeObserver(() => mapRef.current?.resize())
    observer.observe(mapContainerRef.current)

    return () => observer.disconnect()
  }, [])

  // Une seule synchronisation alimente la source partagée par les marqueurs et les libellés.
  useEffect(() => {
    const map = mapRef.current
    if (!map) {
      return
    }

    const synchronizeData = () => {
      const visiblePointIds = visiblePoints.map(point => point.id).join('|')
      if (
        recenterControl
        && hasFittedInitialPointsRef.current
        && shouldTrackMapMovesRef.current
        && visiblePointIdsRef.current !== null
        && visiblePointIdsRef.current !== visiblePointIds
        && visiblePoints.length > 0
      ) {
        setHasMapMoved(true)
      }

      visiblePointIdsRef.current = visiblePointIds
      loadMap(map, visiblePoints, {
        preferUsageName,
        showLabels: showLabelsRef.current,
        visibleUsageKeys
      })
      resetPointLabelHighlight(map)
      updateHighlightedMarker(
        map,
        highlightedPointRef.current ?? selectedPointRef.current
      )

      if (!hasFittedInitialPointsRef.current && visiblePoints.length > 0) {
        if (!hasInitialUrlViewportRef.current) {
          isRecenteringRef.current = true
          setHasMapMoved(false)
          const didFit = fitMapToPoints(map, visiblePoints)
          if (didFit) {
            map.once('idle', () => {
              isRecenteringRef.current = false
              setHasMapMoved(false)
            })
          } else {
            isRecenteringRef.current = false
          }
        }

        hasFittedInitialPointsRef.current = true
      }
    }

    if (map.isStyleLoaded()) {
      synchronizeData()
      return
    }

    map.once('load', synchronizeData)
    return () => map.off('load', synchronizeData)
  }, [mapStyle, options.hash, preferUsageName, recenterControl, visiblePoints, visibleUsageKeys])

  useEffect(() => {
    const map = mapRef.current
    if (!map) {
      return
    }

    if (!selectedPoint) {
      closeSelectedPointPopupRef.current?.()
      return
    }

    const coords = selectedPoint.coordinates?.coordinates
    if (!coords) {
      return
    }

    const shouldCenter = centerSelectedPointOnChange
      || (
        selectedPointRequestKey > 0
        && handledSelectedPointRequestKeyRef.current !== selectedPointRequestKey
      )
    if (shouldCenter) {
      handledSelectedPointRequestKeyRef.current = selectedPointRequestKey
      map.resize()
      map.flyTo({
        center: coords,
        zoom: 14,
        speed: 1.2,
        curve: 1.42
      })
    }

    if (
      onPointPopupActionRef.current
      && (
        activePopupPointIdRef.current !== selectedPoint.id
        || !popupPersistentRef.current
      )
    ) {
      openSelectedPointPopupRef.current?.(selectedPoint)
    }
  }, [centerSelectedPointOnChange, mapStyle, selectedPoint, selectedPointRequestKey])

  // Update labels visibility when showLabels changes
  useEffect(() => {
    const map = mapRef.current
    if (map && map.getLayer('points-prelevement-nom')) {
      map.setLayoutProperty('points-prelevement-nom', 'visibility', showLabels ? 'visible' : 'none')
    }

    if (map) {
      resetPointLabelHighlight(map)
    }
  }, [showLabels, selectedPoint])

  useEffect(() => {
    const map = mapRef.current
    if (!map) {
      return
    }

    const updateHighlight = () => updateHighlightedMarker(map, highlightedPoint ?? selectedPoint)

    if (map.isStyleLoaded()) {
      updateHighlight()
      return
    }

    map.once('load', updateHighlight)
    return () => map.off('load', updateHighlight)
  }, [highlightedPoint, mapStyle, selectedPoint])

  const handleRecenter = useCallback(() => {
    const map = mapRef.current

    if (!map || visiblePoints.length === 0) {
      return
    }

    map.resize()
    isRecenteringRef.current = true
    setHasMapMoved(false)
    const didFit = fitMapToPoints(map, visiblePoints, {duration: 350})

    if (!didFit) {
      isRecenteringRef.current = false
      return
    }

    map.once('moveend', () => {
      isRecenteringRef.current = false
      setHasMapMoved(false)
    })
  }, [visiblePoints])

  useEffect(() => {
    if (
      !recenterRequestKey
      || handledRecenterRequestKeyRef.current === recenterRequestKey
      || visiblePoints.length === 0
    ) {
      return
    }

    const map = mapRef.current
    if (!map) {
      return
    }

    let animationFrameId
    const scheduleRecenter = () => {
      animationFrameId = window.requestAnimationFrame(() => {
        handledRecenterRequestKeyRef.current = recenterRequestKey
        handleRecenter()
      })
    }

    if (map.isStyleLoaded()) {
      scheduleRecenter()
    } else {
      map.once('load', scheduleRecenter)
    }

    return () => {
      map.off('load', scheduleRecenter)
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId)
      }
    }
  }, [handleRecenter, recenterRequestKey, visiblePoints.length])

  return (
    <Box className='flex h-full w-full relative'>
      <div ref={mapContainerRef} className='flex h-full w-full' />
      {recenterControl && canRecenter && hasMapMoved && (
        <button
          aria-label={recenterControlLabel ?? 'Afficher tous les points sur la carte'}
          className={`fr-btn fr-btn--secondary fr-btn--sm fr-icon-fullscreen-line absolute z-10 bg-white shadow-sm ${recenterControlLabel ? 'fr-btn--icon-left' : ''} ${recenterControlClassName}`}
          title={recenterControlLabel ?? 'Afficher tous les points'}
          type='button'
          onClick={handleRecenter}
        >
          {recenterControlLabel}
        </button>
      )}
    </Box>
  )
}

export default memo(MapView)
