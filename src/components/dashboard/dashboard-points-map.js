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

function buildBounds(points) {
  const coordinates = points
    .map(point => getPointCoordinates(point))
    .filter(Boolean)

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

function fitPoints(map, points, {duration = 0} = {}) {
  if (!map || points.length === 0) {
    return
  }

  if (points.length === 1) {
    const coordinates = getPointCoordinates(points[0])

    if (coordinates) {
      map.easeTo({
        center: coordinates,
        zoom: SINGLE_POINT_ZOOM,
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
  points,
  showCollecteurs = true,
  showPreleveurs = true
}) => {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const popupRef = useRef(null)
  const pointsRef = useRef(points)
  const selectedPointIdRef = useRef(null)
  const exploitationsCacheRef = useRef(new Map())
  const shouldTrackMapMovesRef = useRef(false)
  const isRecenteringRef = useRef(false)
  const [hasMapMoved, setHasMapMoved] = useState(false)
  const [selectedPointId, setSelectedPointId] = useState(null)
  const pointsWithVisibleUsages = useMemo(
    () => points.map(point => filterDashboardPointUsages(point)),
    [points]
  )
  const pointsWithCoordinates = useMemo(
    () => pointsWithVisibleUsages.filter(point => getPointCoordinates(point)),
    [pointsWithVisibleUsages]
  )
  const hasPointsWithCoordinates = pointsWithCoordinates.length > 0

  useEffect(() => {
    pointsRef.current = pointsWithCoordinates
  }, [pointsWithCoordinates])

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
    if (mapRef.current || !containerRef.current || !hasPointsWithCoordinates) {
      return undefined
    }

    const initialPoints = pointsRef.current
    const firstCoordinates = getPointCoordinates(initialPoints[0])
    const map = new maplibre.Map({
      container: containerRef.current,
      style: planIGN,
      center: firstCoordinates ?? DEFAULT_MAP_CENTER,
      zoom: firstCoordinates ? SINGLE_POINT_ZOOM : DEFAULT_MAP_ZOOM,
      attributionControl: {compact: true},
      ...cooperativeGesturesMapOptions
    })

    mapRef.current = map

    map.on('load', () => {
      ensureMarkerImages(map, pointsRef.current)

      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: buildFeatures(pointsRef.current, {selectedPointId: selectedPointIdRef.current})
      })

      map.addSource(MARKERS_SOURCE_ID, {
        type: 'geojson',
        data: buildFeatures(pointsRef.current, {selectedPointId: selectedPointIdRef.current})
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

      fitPoints(map, pointsRef.current)

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
  }, [hasPointsWithCoordinates, loadExploitations, showCollecteurs, showPreleveurs])

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
    removePopup(popupRef)
    setHasMapMoved(false)

    if (pointsWithCoordinates.length === 0) {
      isRecenteringRef.current = false
      return
    }

    isRecenteringRef.current = true
    fitPoints(map, pointsWithCoordinates, {duration: 350})
    map.once('moveend', () => {
      isRecenteringRef.current = false
      setHasMapMoved(false)
    })
  }, [pointsWithCoordinates])

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
    fitPoints(map, pointsWithCoordinates, {duration: 350})
    map.once('moveend', () => {
      isRecenteringRef.current = false
      setHasMapMoved(false)
    })
  }, [pointsWithCoordinates])

  return (
    <div className='dashboard-points-map-shell relative h-[360px] w-full overflow-visible border border-gray-200 bg-gray-100 md:h-[430px]'>
      <div ref={containerRef} className='h-full w-full' />

      {pointsWithCoordinates.length === 0 && (
        <div className='absolute inset-0 flex items-center justify-center bg-gray-50 text-center text-gray-600'>
          Aucun point avec coordonnées sur les zones sélectionnées.
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
