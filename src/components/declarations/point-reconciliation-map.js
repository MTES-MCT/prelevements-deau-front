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
import {
  pointOriginLabels,
  pointWithdrawalTypeLabels
} from '@/lib/point-characteristics.js'
import {getPointFlowType, getPointFlowTypeLabel} from '@/lib/point-flow-types.js'
import {
  formatUsageReference,
  getUsageColor,
  getUsageReferenceLabel,
  getUsageTextColor
} from '@/lib/water-uses.js'

const SOURCE_ID = 'declaration-reconciliation-points'
const DEFAULT_MAP_ZOOM = 10
const FIT_BOUNDS_MAX_ZOOM = 15
const FIT_BOUNDS_PADDING = {
  top: 40,
  right: 40,
  bottom: 40,
  left: 40
}
const MAP_MOVE_DURATION = 180

const waterBodyTypeLabels = {
  SUPERFICIELLE: 'Eau superficielle',
  SOUTERRAIN: 'Eau souterraine',
  TRANSITION: 'Eau de transition'
}

function normalizeId(value) {
  return value === null || value === undefined ? null : String(value)
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

function buildFeatures(points, {activePointId, hoveredPointId, matchedPointIdSet}) {
  const normalizedActivePointId = normalizeId(activePointId)
  const normalizedHoveredPointId = normalizeId(hoveredPointId)

  return {
    type: 'FeatureCollection',
    features: points
      .map(point => {
        const coordinates = getPointCoordinates(point)
        const id = normalizeId(point.id)

        if (!coordinates || !id) {
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
            matched: matchedPointIdSet.has(id)
          }
        }
      })
      .filter(Boolean)
  }
}

function isChunkAssociatedWithPoint(selectedChunk, point) {
  return Boolean(selectedChunk?.pointPrelevementId)
    && normalizeId(selectedChunk.pointPrelevementId) === normalizeId(point?.id)
}

function getPopupHint({
  canReconcile,
  point,
  selectedChunk
}) {
  if (!selectedChunk) {
    return 'Sélectionnez une ligne dans la liste de gauche.'
  }

  if (!canReconcile) {
    return isChunkAssociatedWithPoint(selectedChunk, point)
      ? 'Point associé à la ligne sélectionnée.'
      : 'Point consultable uniquement dans ce mode.'
  }

  if (isChunkAssociatedWithPoint(selectedChunk, point)) {
    return 'Association actuelle de la ligne sélectionnée.'
  }

  if (selectedChunk.pointPrelevementId) {
    return 'Ce choix remplacera le point actuellement associé à la ligne sélectionnée.'
  }

  return 'Associer la ligne sélectionnée à ce point.'
}

function getConflictHint(conflict) {
  return conflict.periodLabel
    ? `Ce point est déjà associé à une autre ligne sur une période qui chevauche : ${conflict.periodLabel}.`
    : `Ce point est déjà associé à ${conflict.label}.`
}

function getPopupStatus({alreadyAssociated, canReconcile, hasConflict}) {
  if (hasConflict) {
    return {
      className: 'bg-[#fff4f3] text-[#b34000]',
      label: 'Déjà utilisé'
    }
  }

  if (alreadyAssociated) {
    return {
      className: 'bg-[#e6feda] text-[#18753c]',
      label: 'Association actuelle'
    }
  }

  if (!canReconcile) {
    return {
      className: 'bg-[#f6f6f6] text-gray-700',
      label: 'Consultation'
    }
  }

  return {
    className: 'bg-[#f5f5fe] text-[#000091]',
    label: 'Associable'
  }
}

function getReconcileButtonLabel({isSubmitting, selectedChunk}) {
  if (isSubmitting) {
    return 'Association…'
  }

  return selectedChunk?.pointPrelevementId ? 'Remplacer par ce point' : 'Associer à ce point'
}

function formatDate(value) {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat('fr-FR').format(date)
}

function formatPeriod(start, end) {
  const startLabel = formatDate(start)
  const endLabel = formatDate(end)

  if (startLabel && endLabel) {
    return startLabel === endLabel ? startLabel : `du ${startLabel} au ${endLabel}`
  }

  return startLabel || endLabel || null
}

function appendTextElement(parent, {
  className,
  text,
  tagName = 'div'
}) {
  if (!text) {
    return null
  }

  const element = document.createElement(tagName)
  element.className = className
  element.textContent = text
  parent.append(element)

  return element
}

function appendMetaRow(parent, label, value) {
  if (!value) {
    return
  }

  const row = document.createElement('div')
  row.className = 'flex items-start justify-between gap-3 border-t border-gray-200 py-1.5 text-xs'

  appendTextElement(row, {
    className: 'shrink-0 text-gray-500',
    text: label,
    tagName: 'span'
  })
  appendTextElement(row, {
    className: 'min-w-0 text-right font-medium text-gray-900',
    text: value,
    tagName: 'span'
  })

  parent.append(row)
}

function appendUsageReference(parent, usage, value) {
  if (!value) {
    return
  }

  const row = document.createElement('div')
  row.className = 'mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-gray-700'
  row.title = value

  appendTextElement(row, {
    className: 'shrink-0 text-gray-600',
    text: `${getUsageReferenceLabel(usage)} :`,
    tagName: 'span'
  })

  const usageValue = document.createElement('span')
  usageValue.className = 'inline-flex min-w-0 max-w-full items-center truncate px-1.5 py-0.5 text-[0.68rem] font-semibold leading-none'
  usageValue.style.backgroundColor = getUsageColor(usage)
  usageValue.style.color = getUsageTextColor(usage)
  usageValue.textContent = value
  row.append(usageValue)

  parent.append(row)
}

function appendPill(parent, value) {
  if (!value) {
    return
  }

  appendTextElement(parent, {
    className: 'rounded-sm bg-[#f6f6f6] px-2 py-1 text-[11px] font-medium text-gray-700',
    text: value,
    tagName: 'span'
  })
}

function appendPointDetails(parent, point) {
  const values = [
    getPointFlowTypeLabel(getPointFlowType(point)),
    waterBodyTypeLabels[point.waterBodyType] ?? point.waterBodyType,
    pointOriginLabels[point.nature] ?? point.nature,
    pointWithdrawalTypeLabels[point.withdrawalType] ?? point.withdrawalType
  ].filter(Boolean)

  if (values.length === 0) {
    return
  }

  const details = document.createElement('div')
  details.className = 'mb-3 flex flex-wrap gap-1.5'

  for (const value of values) {
    appendPill(details, value)
  }

  parent.append(details)
}

function appendAliasList(parent, aliases = []) {
  const cleanAliases = aliases
    .map(alias => String(alias ?? '').trim())
    .filter(Boolean)

  if (cleanAliases.length === 0) {
    return
  }

  appendTextElement(parent, {
    className: 'mt-2 text-[11px] font-medium uppercase text-gray-500',
    text: 'Noms reconnus'
  })

  const list = document.createElement('div')
  list.className = 'mt-1 flex flex-wrap gap-1'

  for (const alias of cleanAliases.slice(0, 5)) {
    appendTextElement(list, {
      className: 'rounded-sm bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-700',
      text: alias,
      tagName: 'span'
    })
  }

  if (cleanAliases.length > 5) {
    appendTextElement(list, {
      className: 'rounded-sm bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-700',
      text: `+${cleanAliases.length - 5}`,
      tagName: 'span'
    })
  }

  parent.append(list)
}

function createPopupNode({
  canReconcile,
  conflict,
  isSubmitting,
  onSelectConflictChunk,
  point,
  selectedChunk,
  showSelectedChunkUsage,
  onReconcilePoint
}) {
  const container = document.createElement('div')
  container.className = 'w-[300px] p-1'
  const alreadyAssociated = isChunkAssociatedWithPoint(selectedChunk, point)
  const hasConflict = Boolean(conflict && !alreadyAssociated)
  const statusData = getPopupStatus({alreadyAssociated, canReconcile, hasConflict})

  const status = document.createElement('div')
  status.className = [
    'mb-2 inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-bold uppercase',
    statusData.className
  ].join(' ')
  status.textContent = statusData.label
  container.append(status)

  const title = document.createElement('div')
  title.className = 'mb-1 text-base font-bold leading-snug text-gray-900'
  title.textContent = point.name || 'Point de prélèvement'
  container.append(title)

  const hint = document.createElement('div')
  hint.className = hasConflict
    ? 'mb-3 border-l-4 border-[#ce614a] bg-[#fff4f3] px-2 py-1.5 text-xs text-[#6b1f00]'
    : 'mb-3 text-xs text-gray-600'
  hint.textContent = hasConflict
    ? `${getConflictHint(conflict)} Ouvrez la ligne concernée pour la modifier ou retirer son association.`
    : getPopupHint({
      canReconcile,
      point,
      selectedChunk
    })
  container.append(hint)

  appendPointDetails(container, point)

  const meta = document.createElement('div')
  meta.className = 'mb-3'
  appendMetaRow(meta, 'Dernières données', formatDate(point.mostRecentAvailableDate))
  if (meta.childElementCount > 0) {
    container.append(meta)
  }

  appendAliasList(container, point.pointPrelevementNameAliases)

  if (selectedChunk) {
    const selectedPeriodLabel = formatPeriod(selectedChunk.minDate, selectedChunk.maxDate)
    const selectedUsageLabel = formatUsageReference(selectedChunk.usage)
    const selectedLine = document.createElement('div')
    selectedLine.className = 'mt-3 border-t border-gray-200 pt-2 text-xs text-gray-700'
    appendTextElement(selectedLine, {
      className: 'font-medium text-gray-900',
      text: 'Ligne sélectionnée'
    })
    appendTextElement(selectedLine, {
      className: 'mt-0.5 truncate',
      text: selectedChunk.pointPrelevementName || `Ligne ${selectedChunk.index + 1}`
    })

    if (showSelectedChunkUsage) {
      appendUsageReference(selectedLine, selectedChunk.usage, selectedUsageLabel)
    }

    appendTextElement(selectedLine, {
      className: 'mt-0.5 text-gray-500',
      text: selectedPeriodLabel
        ? `Données du fichier : ${selectedPeriodLabel}`
        : null
    })
    container.append(selectedLine)
  }

  if (hasConflict) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'fr-btn fr-btn--secondary fr-btn--sm mt-3 w-full justify-center'
    button.textContent = 'Ouvrir la ligne concernée'
    button.addEventListener('click', () => onSelectConflictChunk?.(conflict.chunkId))
    container.append(button)
    return container
  }

  if (canReconcile && selectedChunk && !alreadyAssociated) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'fr-btn fr-btn--sm mt-3 w-full justify-center'
    button.disabled = Boolean(isSubmitting)
    button.textContent = getReconcileButtonLabel({isSubmitting, selectedChunk})
    button.addEventListener('click', () => onReconcilePoint(point.id))
    container.append(button)
  }

  return container
}

function removePointPopup(popupRef) {
  popupRef.current?.remove()
  popupRef.current = null
}

function openPointPopup({
  map,
  point,
  popupRef,
  props
}) {
  const coordinates = getPointCoordinates(point)

  if (!coordinates) {
    return
  }

  removePointPopup(popupRef)
  popupRef.current = new maplibre.Popup({
    closeButton: true,
    closeOnClick: true,
    maxWidth: '340px'
  })
    .setLngLat(coordinates)
    .setDOMContent(createPopupNode({
      canReconcile: props.canReconcile,
      conflict: props.pointConflictById?.[point.id],
      isSubmitting: props.isSubmitting,
      onReconcilePoint: props.onReconcilePoint,
      onSelectConflictChunk: props.onSelectConflictChunk,
      point,
      selectedChunk: props.selectedChunk,
      showSelectedChunkUsage: props.showSelectedChunkUsage
    }))
    .addTo(map)
}

const PointReconciliationMap = ({
  activePointId = null,
  canReconcile = false,
  emptyMessage = 'Aucun point géolocalisé.',
  focusRequestKey = 0,
  hoveredPointId = null,
  isSubmitting = false,
  matchedPointIds = [],
  onFocusPoint,
  onHoverPoint,
  onReconcilePoint,
  onSelectConflictChunk,
  pointConflictById = {},
  points = [],
  selectedChunk = null,
  showSelectedChunkUsage = true
}) => {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const popupRef = useRef(null)
  const lastFocusRequestKeyRef = useRef(focusRequestKey)
  const pointsWithCoordinatesRef = useRef([])
  const mapStateRef = useRef({
    activePointId,
    hoveredPointId,
    matchedPointIdSet: new Set()
  })
  const latestPropsRef = useRef({
    canReconcile,
    isSubmitting,
    onFocusPoint,
    onHoverPoint,
    onReconcilePoint,
    onSelectConflictChunk,
    pointConflictById,
    selectedChunk,
    showSelectedChunkUsage
  })
  const [hasMapMoved, setHasMapMoved] = useState(false)
  const pointsWithCoordinates = useMemo(
    () => points.filter(point => getPointCoordinates(point)),
    [points]
  )
  const matchedPointIdSet = useMemo(
    () => new Set(matchedPointIds.map(pointId => normalizeId(pointId)).filter(Boolean)),
    [matchedPointIds]
  )
  const hasPointsWithCoordinates = pointsWithCoordinates.length > 0

  useEffect(() => {
    pointsWithCoordinatesRef.current = pointsWithCoordinates
  }, [pointsWithCoordinates])

  useEffect(() => {
    latestPropsRef.current = {
      canReconcile,
      isSubmitting,
      onFocusPoint,
      onHoverPoint,
      onReconcilePoint,
      onSelectConflictChunk,
      pointConflictById,
      selectedChunk,
      showSelectedChunkUsage
    }
  }, [
    canReconcile,
    isSubmitting,
    onFocusPoint,
    onHoverPoint,
    onReconcilePoint,
    onSelectConflictChunk,
    pointConflictById,
    selectedChunk,
    showSelectedChunkUsage
  ])

  useEffect(() => {
    mapStateRef.current = {
      activePointId,
      hoveredPointId,
      matchedPointIdSet
    }
  }, [activePointId, hoveredPointId, matchedPointIdSet])

  useEffect(() => {
    if (mapRef.current || !containerRef.current || !hasPointsWithCoordinates) {
      return undefined
    }

    const initialPoints = pointsWithCoordinatesRef.current
    const firstCoordinates = getPointCoordinates(initialPoints[0])
    const map = new maplibre.Map({
      container: containerRef.current,
      style: planIGN,
      center: firstCoordinates,
      attributionControl: {compact: true},
      zoom: DEFAULT_MAP_ZOOM,
      maxZoom: IGN_RASTER_MAX_ZOOM,
      ...cooperativeGesturesMapOptions
    })

    mapRef.current = map
    map.addControl(new maplibre.NavigationControl({showCompass: false}), 'bottom-right')

    map.on('load', () => {
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: buildFeatures(pointsWithCoordinatesRef.current, mapStateRef.current)
      })

      map.addLayer({
        id: `${SOURCE_ID}-halos`,
        type: 'circle',
        source: SOURCE_ID,
        paint: {
          'circle-radius': [
            'case',
            ['==', ['get', 'active'], true],
            28,
            ['==', ['get', 'matched'], true],
            15,
            ['==', ['get', 'hovered'], true],
            15,
            0
          ],
          'circle-color': [
            'case',
            ['==', ['get', 'active'], true],
            '#000091',
            ['==', ['get', 'matched'], true],
            '#18753c',
            ['==', ['get', 'hovered'], true],
            '#6a6af4',
            '#000091'
          ],
          'circle-opacity': [
            'case',
            ['==', ['get', 'active'], true],
            0.24,
            0.18
          ],
          'circle-stroke-color': '#000091',
          'circle-stroke-width': [
            'case',
            ['==', ['get', 'active'], true],
            2,
            0
          ]
        }
      })

      map.addLayer({
        id: `${SOURCE_ID}-pins`,
        type: 'circle',
        source: SOURCE_ID,
        paint: {
          'circle-radius': [
            'case',
            ['==', ['get', 'active'], true],
            15,
            ['==', ['get', 'matched'], true],
            10,
            ['==', ['get', 'hovered'], true],
            10,
            8
          ],
          'circle-color': [
            'case',
            ['==', ['get', 'active'], true],
            '#000091',
            ['==', ['get', 'matched'], true],
            '#18753c',
            ['==', ['get', 'hovered'], true],
            '#6a6af4',
            '#000091'
          ],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': [
            'case',
            ['==', ['get', 'active'], true],
            4,
            ['==', ['get', 'matched'], true],
            2,
            2
          ]
        }
      })

      fitPoints(map, pointsWithCoordinatesRef.current)

      map.once('idle', () => {
        map.on('movestart', event => {
          if (event.originalEvent) {
            setHasMapMoved(true)
          }
        })
      })

      const onMouseEnter = event => {
        const feature = event.features?.[0]
        const id = feature?.properties?.id

        map.getCanvas().style.cursor = 'pointer'
        if (id) {
          latestPropsRef.current.onHoverPoint?.(id)
        }
      }

      const onMouseMove = event => {
        const feature = event.features?.[0]
        const id = feature?.properties?.id

        if (id) {
          latestPropsRef.current.onHoverPoint?.(id)
        }
      }

      const onMouseLeave = () => {
        map.getCanvas().style.cursor = ''
        latestPropsRef.current.onHoverPoint?.(null)
      }

      const onClick = event => {
        const feature = event.features?.[0]
        const id = feature?.properties?.id
        const point = pointsWithCoordinatesRef.current.find(candidate => normalizeId(candidate.id) === normalizeId(id))

        if (!point) {
          return
        }

        latestPropsRef.current.onFocusPoint?.(point.id)
        openPointPopup({
          map,
          point,
          popupRef,
          props: latestPropsRef.current
        })
      }

      map.on('mouseenter', `${SOURCE_ID}-pins`, onMouseEnter)
      map.on('mousemove', `${SOURCE_ID}-pins`, onMouseMove)
      map.on('mouseleave', `${SOURCE_ID}-pins`, onMouseLeave)
      map.on('click', `${SOURCE_ID}-pins`, onClick)
    })

    return () => {
      removePointPopup(popupRef)
      map.remove()
      mapRef.current = null
    }
  }, [hasPointsWithCoordinates])

  useEffect(() => {
    const map = mapRef.current
    const source = map?.getSource?.(SOURCE_ID)

    if (!source?.setData) {
      return
    }

    source.setData(buildFeatures(pointsWithCoordinates, {
      activePointId,
      hoveredPointId,
      matchedPointIdSet
    }))
  }, [activePointId, hoveredPointId, matchedPointIdSet, pointsWithCoordinates])

  useEffect(() => {
    if (!activePointId) {
      removePointPopup(popupRef)
    }
  }, [activePointId, selectedChunk?.id])

  useEffect(() => {
    if (focusRequestKey === lastFocusRequestKeyRef.current) {
      return
    }

    lastFocusRequestKeyRef.current = focusRequestKey

    const map = mapRef.current
    const point = pointsWithCoordinates.find(candidate => normalizeId(candidate.id) === normalizeId(activePointId))
    const coordinates = point ? getPointCoordinates(point) : null

    if (!map || !point || !coordinates) {
      return
    }

    map.easeTo({
      center: coordinates,
      zoom: map.getZoom(),
      duration: MAP_MOVE_DURATION
    })

    openPointPopup({
      map,
      point,
      popupRef,
      props: latestPropsRef.current
    })
  }, [activePointId, focusRequestKey, pointsWithCoordinates])

  const fitVisiblePoints = useCallback(() => {
    const map = mapRef.current

    if (!map) {
      return
    }

    setHasMapMoved(false)
    fitPoints(map, pointsWithCoordinates, {duration: MAP_MOVE_DURATION})
  }, [pointsWithCoordinates])

  if (pointsWithCoordinates.length === 0) {
    return (
      <div className='flex h-[clamp(380px,62vh,640px)] items-center justify-center border border-dashed border-gray-300 bg-white p-4 text-center'>
        <p className='fr-hint-text fr-mb-0'>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className='declaration-reconciliation-map-shell relative h-[clamp(380px,62vh,640px)] w-full overflow-visible border border-gray-300 bg-white'>
      {hasMapMoved && (
        <button
          type='button'
          className='fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-focus-3-line absolute right-2 top-2 z-20 bg-white shadow-sm'
          aria-label='Recentrer la carte sur tous les points'
          onClick={fitVisiblePoints}
        >
          Recentrer
        </button>
      )}
      <div ref={containerRef} className='h-full w-full' />
    </div>
  )
}

export default PointReconciliationMap
