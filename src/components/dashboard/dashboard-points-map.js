'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import maplibre from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

import {cooperativeGesturesMapOptions} from '@/components/map/cooperative-gestures.js'
import {IGN_RASTER_MAX_ZOOM} from '@/components/map/ign-raster.js'
import planIGN from '@/components/map/styles/plan-ign.json'
import {getDeclarantTitleFromDeclarant} from '@/lib/declarants.js'
import {
  computeBestPopupAnchor,
  createSVGDataURL,
  createUsagePieChart
} from '@/lib/points-prelevement.js'
import {getPointPrelevementURL} from '@/lib/urls.js'
import {
  getUsageColor,
  getUsageKey,
  getUsageLabel,
  getUsageTextColor,
  isDashboardVisibleUsage
} from '@/lib/water-uses.js'
import {getExploitationsByPointIdAction} from '@/server/actions/points-prelevement.js'

const SOURCE_ID = 'dashboard-points'
const MARKERS_SOURCE_ID = 'dashboard-points-markers'
const MARKERS_LAYER_ID = 'dashboard-points-markers-symbol'
const HIGHLIGHT_LAYER_ID = 'dashboard-points-selected-halo'
const MONITORING_SOURCE_ID = 'dashboard-monitoring-stations'
const PIEZOMETER_LAYER_ID = 'dashboard-piezometers'
const FLOW_STATION_LAYER_ID = 'dashboard-flow-stations'
const PIEZOMETER_ICON_ID = 'dashboard-piezometer-marker'
const FLOW_STATION_ICON_ID = 'dashboard-flow-station-marker'
const DEFAULT_MAP_CENTER = [2.5, 46.5]
const DEFAULT_MAP_ZOOM = 5
const SINGLE_POINT_ZOOM = 12
const FIT_BOUNDS_MAX_ZOOM = 13
const FIT_BOUNDS_PADDING = {
  top: 42,
  right: 42,
  bottom: 42,
  left: 42
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

function getMonitoringStationCoordinates(station) {
  const coordinates = station?.coordinates?.coordinates
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null
  }

  const [longitude, latitude] = coordinates.map(Number)
  return Number.isFinite(longitude) && Number.isFinite(latitude)
    ? [longitude, latitude]
    : null
}

function buildBounds(points, monitoringStations = []) {
  const coordinates = [
    ...points
      .map(point => getPointCoordinates(point))
      .filter(Boolean),
    ...monitoringStations
      .map(station => getMonitoringStationCoordinates(station))
      .filter(Boolean)
  ]

  if (coordinates.length === 0) {
    return null
  }

  const [firstCoordinates, ...otherCoordinates] = coordinates
  const bounds = new maplibre.LngLatBounds(firstCoordinates, firstCoordinates)

  for (const coordinate of otherCoordinates) {
    bounds.extend(coordinate)
  }

  return bounds
}

function fitPoints(map, points, monitoringStations = [], {duration = 0} = {}) {
  const coordinates = [
    ...points.map(point => getPointCoordinates(point)).filter(Boolean),
    ...monitoringStations.map(station => getMonitoringStationCoordinates(station)).filter(Boolean)
  ]

  if (!map || coordinates.length === 0) {
    return
  }

  if (coordinates.length === 1) {
    map.easeTo({
      center: coordinates[0],
      zoom: SINGLE_POINT_ZOOM,
      duration
    })

    return
  }

  const bounds = buildBounds(points, monitoringStations)

  if (bounds) {
    map.fitBounds(bounds, {
      padding: FIT_BOUNDS_PADDING,
      maxZoom: FIT_BOUNDS_MAX_ZOOM,
      duration
    })
  }
}

function buildMonitoringFeatures(stations) {
  return {
    type: 'FeatureCollection',
    features: stations.map(station => {
      const coordinates = getMonitoringStationCoordinates(station)
      if (!coordinates) {
        return null
      }

      return {
        type: 'Feature',
        id: station.id,
        geometry: {type: 'Point', coordinates},
        properties: {
          id: station.id,
          label: station.label,
          stationCode: station.stationCode,
          type: station.type,
          icon: station.type === 'PIEZOMETER' ? PIEZOMETER_ICON_ID : FLOW_STATION_ICON_ID
        }
      }
    }).filter(Boolean)
  }
}

function ensureMonitoringMarkerImages(map) {
  const markers = [
    {
      id: PIEZOMETER_ICON_ID,
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><path d="M14 2 26 14 14 26 2 14Z" fill="#0078F3" stroke="#fff" stroke-width="3"/><path d="M14 6 22 14 14 22 6 14Z" fill="#000091"/></svg>'
    },
    {
      id: FLOW_STATION_ICON_ID,
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><rect x="2" y="2" width="24" height="24" rx="2" fill="#009081" stroke="#fff" stroke-width="3"/><rect x="7" y="7" width="14" height="14" fill="#18753C"/></svg>'
    }
  ]

  for (const marker of markers) {
    if (map.hasImage(marker.id)) {
      continue
    }

    const image = new Image()
    image.addEventListener('load', () => {
      if (!map.hasImage(marker.id)) {
        map.addImage(marker.id, image, {pixelRatio: window.devicePixelRatio || 1})
      }
    })
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(marker.svg)}`
  }
}

function normalizePointId(pointId) {
  return pointId === null || pointId === undefined ? null : String(pointId)
}

function compareMarkerUsages(a, b) {
  return String(getUsageKey(a) ?? '').localeCompare(String(getUsageKey(b) ?? ''), 'fr', {
    numeric: true,
    sensitivity: 'base'
  })
}

function getDashboardMarkerUsages(point) {
  return (point.usages ?? [])
    .filter(usage => isDashboardVisibleUsage(usage))
    .sort(compareMarkerUsages)
}

function getMarkerSignature(point) {
  const usages = getDashboardMarkerUsages(point)

  if (usages.length === 0) {
    return 'empty'
  }

  return usages
    .map(usage => `${getUsageKey(usage) ?? 'unknown'}:${getUsageColor(usage)}`)
    .join('|')
}

function getPointMarkerIconId(point) {
  return `dashboard-marker-${encodeURIComponent(getMarkerSignature(point))}`
}

function buildFeatures(points, {selectedPointId = null} = {}) {
  const normalizedSelectedPointId = normalizePointId(selectedPointId)

  return {
    type: 'FeatureCollection',
    features: points
      .map(point => {
        const coordinates = getPointCoordinates(point)

        if (!coordinates) {
          return null
        }

        return {
          type: 'Feature',
          id: point.id,
          geometry: {
            type: 'Point',
            coordinates
          },
          properties: {
            id: point.id,
            name: point.name || 'Point de prélèvement',
            icon: getPointMarkerIconId(point),
            selected: normalizePointId(point.id) === normalizedSelectedPointId
          }
        }
      })
      .filter(Boolean)
  }
}

function ensureMarkerImages(map, points) {
  const pointsByMarkerId = new Map()

  for (const point of points) {
    const markerId = getPointMarkerIconId(point)

    if (map.hasImage(markerId) || pointsByMarkerId.has(markerId)) {
      continue
    }

    pointsByMarkerId.set(markerId, point)
  }

  for (const [markerId, point] of pointsByMarkerId) {
    const svgContainer = createUsagePieChart(getDashboardMarkerUsages(point))
    const dataURL = createSVGDataURL(svgContainer)
    const image = new Image()

    image.addEventListener('load', () => {
      if (!map.hasImage(markerId)) {
        map.addImage(markerId, image, {pixelRatio: window.devicePixelRatio || 1})
      }
    })

    image.src = dataURL
  }
}

function filterDashboardPointUsages(point) {
  return {
    ...point,
    usages: getDashboardMarkerUsages(point)
  }
}

function removePopup(popupRef) {
  popupRef.current?.remove()
  popupRef.current = null
}

function createUsageChip(usage) {
  const chip = document.createElement('span')
  chip.className = 'inline-flex max-w-full items-center rounded px-2 py-1 text-xs font-medium'
  chip.textContent = usage ? getUsageLabel(usage) : 'Usage non renseigné'
  chip.title = chip.textContent
  chip.style.backgroundColor = usage ? getUsageColor(usage) : '#eeeeee'
  chip.style.color = usage ? getUsageTextColor(usage) : 'var(--text-default-grey)'

  return chip
}

function appendSmallText(parent, text, className = 'fr-text--xs fr-mb-0 text-gray-600') {
  const element = document.createElement('p')
  element.className = className
  element.textContent = text
  element.style.overflowWrap = 'anywhere'
  parent.append(element)

  return element
}

function getCollecteurs(exploitation) {
  return (exploitation.collecteurs ?? [])
    .map(link => link.collecteur)
    .filter(Boolean)
}

function appendExploitationDetails(parent, exploitations, {showCollecteurs = true} = {}) {
  if (exploitations.length === 0) {
    appendSmallText(parent, 'Aucune exploitation associée à ce point.')
    return
  }

  const list = document.createElement('div')
  list.className = 'flex max-h-[240px] min-w-0 flex-col gap-2 overflow-y-auto pr-1'

  for (const exploitation of exploitations) {
    const item = document.createElement('div')
    item.className = 'min-w-0 border border-gray-200 bg-gray-50 p-2'

    if (isDashboardVisibleUsage(exploitation.usage)) {
      const header = document.createElement('div')
      header.className = 'fr-mb-2v'
      header.append(createUsageChip(exploitation.usage))
      item.append(header)
    }

    const preleveurLabel = getDeclarantTitleFromDeclarant(exploitation.declarant)
    appendSmallText(
      item,
      `Préleveur : ${preleveurLabel}`,
      'fr-text--sm fr-mb-1v break-words text-gray-900'
    )

    const collecteurs = getCollecteurs(exploitation)

    if (showCollecteurs && collecteurs.length > 0) {
      const collecteursText = collecteurs
        .map(collecteur => getDeclarantTitleFromDeclarant(collecteur))
        .join(', ')
      const label = collecteurs.length > 1 ? 'Collecteurs' : 'Collecteur'

      appendSmallText(item, `${label} : ${collecteursText}`)
    }

    list.append(item)
  }

  parent.append(list)
}

function appendPointUsagesSection(container, point) {
  const section = document.createElement('div')
  section.className = 'fr-mb-3v border-t border-gray-200 pt-3'

  appendSmallText(
    section,
    'Usages',
    'fr-text--xs fr-mb-1v font-semibold text-gray-700'
  )

  const usages = (point.usages ?? []).filter(usage => isDashboardVisibleUsage(usage))

  if (usages.length === 0) {
    appendSmallText(section, 'Usage non renseigné.')
  } else {
    const list = document.createElement('div')
    list.className = 'flex flex-wrap gap-1.5'

    for (const usage of usages) {
      list.append(createUsageChip(usage))
    }

    section.append(list)
  }

  container.append(section)
}

function appendAssociationsSection(
  container,
  point,
  loadExploitations,
  {showCollecteurs = true} = {}
) {
  const section = document.createElement('div')
  section.className = 'fr-mb-3v border-t border-gray-200 pt-3'

  appendSmallText(
    section,
    'Préleveurs',
    'fr-text--xs fr-mb-1v font-semibold text-gray-700'
  )

  const body = document.createElement('div')
  appendSmallText(body, 'Chargement des exploitations associées...')
  section.append(body)
  container.append(section)

  async function loadAndRenderExploitations() {
    try {
      const exploitations = await loadExploitations(point.id)

      if (!container.isConnected) {
        return
      }

      body.replaceChildren()
      appendExploitationDetails(body, exploitations, {showCollecteurs})
    } catch (error) {
      if (!container.isConnected) {
        return
      }

      body.replaceChildren()
      appendSmallText(
        body,
        error.message || 'Impossible de charger les exploitations associées.',
        'fr-text--sm fr-mb-0 text-red-700'
      )
    }
  }

  loadAndRenderExploitations()
}

function openPointPopup({
  loadExploitations,
  map,
  point,
  popupRef,
  showCollecteurs,
  showPreleveurs
}) {
  const coordinates = getPointCoordinates(point)

  if (!coordinates) {
    return
  }

  removePopup(popupRef)

  const container = document.createElement('div')
  container.className = 'min-w-0 p-2'
  container.style.width = 'min(320px, calc(100vw - 2rem))'
  container.style.maxWidth = '100%'

  const title = document.createElement('p')
  title.className = 'fr-text--md fr-mb-2v break-words font-semibold text-gray-900'
  title.textContent = point.name || 'Point de prélèvement'
  container.append(title)

  if (showPreleveurs) {
    appendAssociationsSection(container, point, loadExploitations, {showCollecteurs})
  } else {
    appendPointUsagesSection(container, point)
  }

  const button = document.createElement('button')
  button.className = 'fr-btn fr-btn--sm fr-btn--icon-right fr-icon-arrow-right-line'
  button.type = 'button'
  button.textContent = 'Voir la fiche du point'
  button.addEventListener('click', () => {
    window.location.assign(getPointPrelevementURL(point))
  })
  container.append(button)

  popupRef.current = new maplibre.Popup({
    closeButton: true,
    closeOnClick: true,
    anchor: computeBestPopupAnchor(map, coordinates),
    maxWidth: 'min(340px, calc(100vw - 2rem))',
    offset: 10
  })
    .setLngLat(coordinates)
    .setDOMContent(container)
    .addTo(map)
}

const DashboardPointsMap = ({
  monitoringStations = [],
  points,
  showCollecteurs = true,
  showPreleveurs = true
}) => {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const popupRef = useRef(null)
  const pointsRef = useRef(points)
  const monitoringStationsRef = useRef(monitoringStations)
  const selectedPointIdRef = useRef(null)
  const exploitationsCacheRef = useRef(new Map())
  const shouldTrackMapMovesRef = useRef(false)
  const isRecenteringRef = useRef(false)
  const [hasMapMoved, setHasMapMoved] = useState(false)
  const [selectedPointId, setSelectedPointId] = useState(null)
  const [visibleLayers, setVisibleLayers] = useState({
    points: true,
    piezometers: true,
    flowStations: true
  })
  const pointsWithVisibleUsages = useMemo(
    () => points.map(point => filterDashboardPointUsages(point)),
    [points]
  )
  const pointsWithCoordinates = useMemo(
    () => pointsWithVisibleUsages.filter(point => getPointCoordinates(point)),
    [pointsWithVisibleUsages]
  )
  const hasPointsWithCoordinates = pointsWithCoordinates.length > 0
  const monitoringStationsWithCoordinates = useMemo(
    () => monitoringStations.filter(station => getMonitoringStationCoordinates(station)),
    [monitoringStations]
  )
  const hasMonitoringStationsWithCoordinates = monitoringStationsWithCoordinates.length > 0
  const hasMapFeatures = hasPointsWithCoordinates || hasMonitoringStationsWithCoordinates
  const piezometerCount = monitoringStationsWithCoordinates.filter(station => station.type === 'PIEZOMETER').length
  const flowStationCount = monitoringStationsWithCoordinates.filter(station => station.type === 'FLOW_STATION').length

  useEffect(() => {
    pointsRef.current = pointsWithCoordinates
  }, [pointsWithCoordinates])

  useEffect(() => {
    monitoringStationsRef.current = monitoringStationsWithCoordinates
  }, [monitoringStationsWithCoordinates])

  useEffect(() => {
    selectedPointIdRef.current = selectedPointId
  }, [selectedPointId])

  const loadExploitations = useCallback(async pointId => {
    if (exploitationsCacheRef.current.has(pointId)) {
      return exploitationsCacheRef.current.get(pointId)
    }

    const result = await getExploitationsByPointIdAction(pointId)

    if (!result.success) {
      throw new Error(result.error || 'Impossible de charger les exploitations associées.')
    }

    const exploitations = result.data ?? []
    exploitationsCacheRef.current.set(pointId, exploitations)

    return exploitations
  }, [])

  useEffect(() => {
    if (mapRef.current || !containerRef.current || !hasMapFeatures) {
      return undefined
    }

    const initialPoints = pointsRef.current
    const initialMonitoringStations = monitoringStationsRef.current
    const firstCoordinates = getPointCoordinates(initialPoints[0])
      ?? getMonitoringStationCoordinates(initialMonitoringStations[0])
    const map = new maplibre.Map({
      container: containerRef.current,
      style: planIGN,
      center: firstCoordinates ?? DEFAULT_MAP_CENTER,
      zoom: firstCoordinates ? SINGLE_POINT_ZOOM : DEFAULT_MAP_ZOOM,
      attributionControl: {compact: true},
      maxZoom: IGN_RASTER_MAX_ZOOM,
      ...cooperativeGesturesMapOptions
    })

    mapRef.current = map
    map.addControl(new maplibre.NavigationControl({showCompass: false}), 'bottom-right')

    map.on('load', () => {
      ensureMarkerImages(map, pointsRef.current)
      ensureMonitoringMarkerImages(map)

      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: buildFeatures(pointsRef.current, {selectedPointId: selectedPointIdRef.current})
      })

      map.addSource(MARKERS_SOURCE_ID, {
        type: 'geojson',
        data: buildFeatures(pointsRef.current, {selectedPointId: selectedPointIdRef.current})
      })

      map.addSource(MONITORING_SOURCE_ID, {
        type: 'geojson',
        data: buildMonitoringFeatures(monitoringStationsRef.current)
      })

      map.addLayer({
        id: HIGHLIGHT_LAYER_ID,
        type: 'circle',
        source: MARKERS_SOURCE_ID,
        paint: {
          'circle-radius': [
            'case',
            ['==', ['get', 'selected'], true],
            19,
            0
          ],
          'circle-color': '#000091',
          'circle-opacity': [
            'case',
            ['==', ['get', 'selected'], true],
            0.22,
            0
          ],
          'circle-stroke-color': '#000091',
          'circle-stroke-width': [
            'case',
            ['==', ['get', 'selected'], true],
            2,
            0
          ]
        }
      })

      map.addLayer({
        id: MARKERS_LAYER_ID,
        type: 'symbol',
        source: MARKERS_SOURCE_ID,
        layout: {
          'icon-image': ['get', 'icon'],
          'icon-size': [
            'case',
            ['==', ['get', 'selected'], true],
            1.18,
            1
          ],
          'icon-allow-overlap': true
        }
      })

      map.addLayer({
        id: PIEZOMETER_LAYER_ID,
        type: 'symbol',
        source: MONITORING_SOURCE_ID,
        filter: ['==', ['get', 'type'], 'PIEZOMETER'],
        layout: {
          'icon-image': ['get', 'icon'],
          'icon-size': 1,
          'icon-allow-overlap': true
        }
      })

      map.addLayer({
        id: FLOW_STATION_LAYER_ID,
        type: 'symbol',
        source: MONITORING_SOURCE_ID,
        filter: ['==', ['get', 'type'], 'FLOW_STATION'],
        layout: {
          'icon-image': ['get', 'icon'],
          'icon-size': 1,
          'icon-allow-overlap': true
        }
      })

      fitPoints(map, pointsRef.current, monitoringStationsRef.current)

      const onMapMoveStart = () => {
        if (shouldTrackMapMovesRef.current && !isRecenteringRef.current) {
          setHasMapMoved(true)
        }
      }

      map.on('movestart', onMapMoveStart)
      map.once('idle', () => {
        shouldTrackMapMovesRef.current = true
      })

      const onMouseEnter = () => {
        map.getCanvas().style.cursor = 'pointer'
      }

      const onMouseLeave = () => {
        map.getCanvas().style.cursor = ''
      }

      const onClick = event => {
        const pointId = event.features?.[0]?.properties?.id
        const point = pointsRef.current.find(candidate => candidate.id === pointId)

        if (point) {
          setSelectedPointId(point.id)
          openPointPopup({
            loadExploitations,
            map,
            point,
            popupRef,
            showCollecteurs,
            showPreleveurs
          })
        }
      }

      map.on('mouseenter', MARKERS_LAYER_ID, onMouseEnter)
      map.on('mouseleave', MARKERS_LAYER_ID, onMouseLeave)
      map.on('click', MARKERS_LAYER_ID, onClick)
    })

    return () => {
      shouldTrackMapMovesRef.current = false
      isRecenteringRef.current = false
      removePopup(popupRef)
      map.remove()
      mapRef.current = null
    }
  }, [hasMapFeatures, loadExploitations, showCollecteurs, showPreleveurs])

  useEffect(() => {
    const map = mapRef.current

    if (!map?.getSource?.(MARKERS_SOURCE_ID)) {
      return
    }

    ensureMarkerImages(map, pointsWithCoordinates)
    const data = buildFeatures(pointsWithCoordinates, {
      selectedPointId: selectedPointIdRef.current
    })
    map.getSource(SOURCE_ID)?.setData(data)
    map.getSource(MARKERS_SOURCE_ID)?.setData(data)
    ensureMonitoringMarkerImages(map)
    map.getSource(MONITORING_SOURCE_ID)?.setData(buildMonitoringFeatures(monitoringStationsWithCoordinates))
    removePopup(popupRef)
    setHasMapMoved(false)

    if (pointsWithCoordinates.length === 0 && monitoringStationsWithCoordinates.length === 0) {
      isRecenteringRef.current = false
      return
    }

    isRecenteringRef.current = true
    fitPoints(map, pointsWithCoordinates, monitoringStationsWithCoordinates, {duration: 350})
    map.once('moveend', () => {
      isRecenteringRef.current = false
      setHasMapMoved(false)
    })
  }, [monitoringStationsWithCoordinates, pointsWithCoordinates])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.getLayer?.(MARKERS_LAYER_ID)) {
      return
    }

    const setVisibility = (layerId, visible) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none')
      }
    }

    setVisibility(MARKERS_LAYER_ID, visibleLayers.points)
    setVisibility(HIGHLIGHT_LAYER_ID, visibleLayers.points)
    setVisibility(PIEZOMETER_LAYER_ID, visibleLayers.piezometers)
    setVisibility(FLOW_STATION_LAYER_ID, visibleLayers.flowStations)

    if (!visibleLayers.points) {
      removePopup(popupRef)
      setSelectedPointId(null)
    }
  }, [visibleLayers])

  useEffect(() => {
    const map = mapRef.current

    if (!map?.getSource?.(MARKERS_SOURCE_ID)) {
      return
    }

    const data = buildFeatures(pointsWithCoordinates, {selectedPointId})
    map.getSource(SOURCE_ID)?.setData(data)
    map.getSource(MARKERS_SOURCE_ID)?.setData(data)
  }, [pointsWithCoordinates, selectedPointId])

  const handleRecenter = useCallback(() => {
    const map = mapRef.current

    if (!map) {
      return
    }

    isRecenteringRef.current = true
    setHasMapMoved(false)
    fitPoints(map, pointsWithCoordinates, monitoringStationsWithCoordinates, {duration: 350})
    map.once('moveend', () => {
      isRecenteringRef.current = false
      setHasMapMoved(false)
    })
  }, [monitoringStationsWithCoordinates, pointsWithCoordinates])

  return (
    <div className='dashboard-points-map-shell relative h-[360px] w-full overflow-visible border border-gray-200 bg-gray-100 md:h-[430px]'>
      <div ref={containerRef} className='h-full w-full' />

      {pointsWithCoordinates.length === 0 && monitoringStationsWithCoordinates.length === 0 && (
        <div className='absolute inset-0 flex items-center justify-center bg-gray-50 text-center text-gray-600'>
          Aucun point ni station avec coordonnées sur les zones sélectionnées.
        </div>
      )}

      {hasMapFeatures && (
        <div className='absolute bottom-2 left-2 z-10 max-w-[calc(100%-4.5rem)] bg-white p-2 shadow-md'>
          <fieldset className='m-0 border-0 p-0'>
            <legend className='sr-only'>Éléments affichés sur la carte</legend>
            <div className='flex flex-col gap-1.5 text-xs'>
              <label className={`flex items-center gap-2 ${hasPointsWithCoordinates ? 'cursor-pointer' : 'cursor-not-allowed text-gray-400'}`}>
                <input
                  checked={visibleLayers.points}
                  className='h-3.5 w-3.5 accent-[#000091]'
                  disabled={!hasPointsWithCoordinates}
                  type='checkbox'
                  onChange={event => setVisibleLayers(current => ({...current, points: event.target.checked}))}
                />
                <span>Points de prélèvement</span>
              </label>
              <label className={`flex items-center gap-2 ${piezometerCount > 0 ? 'cursor-pointer' : 'cursor-not-allowed text-gray-400'}`}>
                <input
                  checked={visibleLayers.piezometers}
                  className='h-3.5 w-3.5'
                  disabled={piezometerCount === 0}
                  style={{accentColor: '#0078F3'}}
                  type='checkbox'
                  onChange={event => setVisibleLayers(current => ({...current, piezometers: event.target.checked}))}
                />
                <span>Niveaux piézométriques</span>
              </label>
              <label className={`flex items-center gap-2 ${flowStationCount > 0 ? 'cursor-pointer' : 'cursor-not-allowed text-gray-400'}`}>
                <input
                  checked={visibleLayers.flowStations}
                  className='h-3.5 w-3.5'
                  disabled={flowStationCount === 0}
                  style={{accentColor: '#009081'}}
                  type='checkbox'
                  onChange={event => setVisibleLayers(current => ({...current, flowStations: event.target.checked}))}
                />
                <span>Mesures de débit</span>
              </label>
            </div>
          </fieldset>
        </div>
      )}

      {hasMapMoved && (
        <button
          type='button'
          className='fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-focus-3-line absolute right-2 top-2 z-10 bg-white shadow-sm'
          aria-label='Recentrer la carte sur tous les points'
          onClick={handleRecenter}
        >
          Recentrer la carte
        </button>
      )}
    </div>
  )
}

export default DashboardPointsMap
