'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import {useRouter} from '@bprogress/next/app'
import maplibre from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

import {
  getVisibleMapFeatures,
  resolveMapLayerVisibility
} from './dashboard-map-layers.js'

import {cooperativeGesturesMapOptions} from '@/components/map/cooperative-gestures.js'
import {IGN_RASTER_MAX_ZOOM} from '@/components/map/ign-raster.js'
import planIGN from '@/components/map/styles/plan-ign.json'
import {getDeclarantTitleFromDeclarant} from '@/lib/declarants.js'
import {getMonitoringStationURL} from '@/lib/monitoring-stations.js'
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
import {
  getPointPrelevementDisplayName,
  getPointPrelevementTechnicalReference
} from '@/utils/point-prelevement.js'

const MARKERS_SOURCE_ID = 'dashboard-points-markers'
const MARKERS_LAYER_ID = 'dashboard-points-markers-symbol'
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
const NUMBER_FORMATTER = new Intl.NumberFormat('fr-FR', {maximumFractionDigits: 2})
const DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', {dateStyle: 'medium'})
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short'
})
const MONITORING_STATION_TYPES = {
  PIEZOMETER: {
    label: 'Niveau piézométrique',
    source: 'Hub’Eau / ADES (BRGM)',
    background: '#E3E3FD',
    color: '#000091'
  },
  FLOW_STATION: {
    label: 'Mesure de débit',
    source: 'Hub’Eau / Hydrométrie',
    background: '#B8FEC9',
    color: '#18753C'
  }
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

function getMapGeometrySignature(points, monitoringStations) {
  return JSON.stringify([
    ...points.map(point => ['point', point.id, ...getPointCoordinates(point)]),
    ...monitoringStations.map(station => [
      'station',
      station.id,
      ...getMonitoringStationCoordinates(station)
    ])
  ].sort((first, second) => String(first[1]).localeCompare(String(second[1]))))
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

function buildFeatures(points, {preferUsageName = false} = {}) {
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
            name: getPointPrelevementDisplayName(point, {
              fallback: 'Point de prélèvement',
              preferUsageName
            }),
            icon: getPointMarkerIconId(point)
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

function isFiniteNumber(value) {
  return value !== null && value !== undefined && Number.isFinite(Number(value))
}

function formatNumber(value) {
  return NUMBER_FORMATTER.format(Number(value))
}

function formatDate(value, {includeTime = false} = {}) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) {
    return null
  }

  return (includeTime ? DATE_TIME_FORMATTER : DATE_FORMATTER).format(date)
}

function appendDefinitionRow(parent, label, value) {
  if (value === null || value === undefined || value === '') {
    return
  }

  const row = document.createElement('div')
  row.className = 'grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-2 border-t border-gray-200 py-1.5 text-xs first:border-t-0'

  const term = document.createElement('dt')
  term.className = 'text-gray-600'
  term.textContent = label

  const description = document.createElement('dd')
  description.className = 'm-0 min-w-0 break-words font-medium text-gray-900'
  description.textContent = value

  row.append(term, description)
  parent.append(row)
}

function getGroundwaterMeasurementNature(measurement) {
  if (measurement.aggregation === 'WEEKLY_MEAN') {
    return 'Moyenne hebdomadaire de données validées'
  }

  return measurement.origin === 'REALTIME'
    ? 'Temps réel non validé'
    : 'Donnée validée ADES'
}

function getFlowMeasurementNature(measurement) {
  if (measurement.granularity === 'DAILY') {
    return 'Moyenne journalière'
  }

  if (measurement.granularity === 'MONTHLY') {
    return 'Moyenne mensuelle'
  }

  return 'Temps réel'
}

function appendLatestMeasurement(parent, station, typeConfig) {
  const section = document.createElement('div')
  section.className = 'my-3 border-y border-gray-200 py-3'

  appendSmallText(section, 'Dernière donnée affichée', 'fr-text--xs fr-mb-1v font-semibold text-gray-600')

  const measurement = station.latestMeasurement
  if (!measurement) {
    appendSmallText(section, 'Aucune donnée disponible sur la période affichée.')
    parent.append(section)
    return
  }

  const value = document.createElement('p')
  value.className = 'fr-text--lg fr-mb-1v font-bold'
  value.style.color = typeConfig.color

  if (station.type === 'PIEZOMETER') {
    if (isFiniteNumber(measurement.depth)) {
      value.textContent = `${formatNumber(measurement.depth)} m de profondeur`
    } else if (isFiniteNumber(measurement.levelNgf)) {
      value.textContent = `${formatNumber(measurement.levelNgf)} m NGF`
    } else {
      value.textContent = 'Valeur indisponible'
    }
  } else {
    value.textContent = isFiniteNumber(measurement.valueLitersPerSecond)
      ? `${formatNumber(measurement.valueLitersPerSecond)} L/s`
      : 'Valeur indisponible'
  }

  section.append(value)

  if (
    station.type === 'PIEZOMETER'
    && isFiniteNumber(measurement.depth)
    && isFiniteNumber(measurement.levelNgf)
  ) {
    appendSmallText(section, `Cote : ${formatNumber(measurement.levelNgf)} m NGF`)
  }

  const measuredAt = formatDate(measurement.at, {
    includeTime: station.type === 'FLOW_STATION' && measurement.granularity === 'REALTIME'
  })
  const nature = station.type === 'PIEZOMETER'
    ? getGroundwaterMeasurementNature(measurement)
    : getFlowMeasurementNature(measurement)
  appendSmallText(section, [measuredAt, nature].filter(Boolean).join(' · '))
  parent.append(section)
}

function openMonitoringStationPopup({map, popupRef, station}) {
  const coordinates = getMonitoringStationCoordinates(station)
  const typeConfig = MONITORING_STATION_TYPES[station.type]
  if (!coordinates || !typeConfig) {
    return
  }

  removePopup(popupRef)

  const container = document.createElement('div')
  container.className = 'min-w-0 p-3'
  container.style.width = 'min(330px, calc(100vw - 2rem))'
  container.style.maxWidth = '100%'

  const badge = document.createElement('span')
  badge.className = 'mb-2 inline-flex px-2 py-1 text-xs font-semibold'
  badge.style.backgroundColor = typeConfig.background
  badge.style.color = typeConfig.color
  badge.textContent = typeConfig.label
  container.append(badge)

  const title = document.createElement('p')
  title.className = 'fr-text--md fr-mb-1v break-words font-semibold text-gray-900'
  title.textContent = station.label
  container.append(title)

  if (station.providerLabel && station.providerLabel !== station.label) {
    appendSmallText(container, station.providerLabel)
  }

  appendLatestMeasurement(container, station, typeConfig)

  const details = document.createElement('dl')
  details.className = 'fr-mb-0'
  const stationDetails = station.details ?? {}

  if (station.type === 'PIEZOMETER') {
    appendDefinitionRow(details, 'Commune', stationDetails.commune)
    appendDefinitionRow(details, 'Département', stationDetails.department)
    appendDefinitionRow(
      details,
      'Profondeur de l’ouvrage',
      isFiniteNumber(stationDetails.investigationDepthMeters)
        ? `${formatNumber(stationDetails.investigationDepthMeters)} m`
        : null
    )
    appendDefinitionRow(
      details,
      'Altitude de la station',
      isFiniteNumber(stationDetails.altitudeMeters)
        ? `${formatNumber(stationDetails.altitudeMeters)} m`
        : null
    )
    appendDefinitionRow(details, 'Code BSS', station.stationCode)
    appendDefinitionRow(details, 'Identifiant BSS', station.bssId)
  } else {
    appendDefinitionRow(details, 'Cours d’eau', stationDetails.watercourse)
    appendDefinitionRow(details, 'Commune', stationDetails.commune)
    appendDefinitionRow(details, 'Département', stationDetails.department)
    appendDefinitionRow(
      details,
      'Altitude de référence',
      isFiniteNumber(stationDetails.altitudeMeters)
        ? `${formatNumber(stationDetails.altitudeMeters)} m`
        : null
    )
    appendDefinitionRow(details, 'Code station', station.stationCode)
    appendDefinitionRow(details, 'Code site', station.siteCode)
    appendDefinitionRow(
      details,
      'État de la station',
      stationDetails.inService === null || stationDetails.inService === undefined
        ? null
        : (stationDetails.inService ? 'En service' : 'Hors service')
    )
  }

  const openedAt = formatDate(stationDetails.openedAt)
  appendDefinitionRow(
    details,
    station.type === 'PIEZOMETER' ? 'Début des mesures' : 'Mise en service',
    openedAt
  )
  appendDefinitionRow(
    details,
    station.type === 'PIEZOMETER' ? null : 'Fermeture',
    station.type === 'PIEZOMETER' ? null : formatDate(stationDetails.closedAt)
  )
  appendDefinitionRow(
    details,
    station.zones?.length > 1 ? 'Territoires' : 'Territoire',
    station.zones?.map(zone => zone.name).filter(Boolean).join(', ')
  )
  container.append(details)

  appendSmallText(
    container,
    `Données : ${typeConfig.source}`,
    'fr-text--xs fr-mb-0 mt-3 border-t border-gray-200 pt-2 text-gray-500'
  )

  popupRef.current = new maplibre.Popup({
    closeButton: false,
    closeOnClick: false,
    anchor: computeBestPopupAnchor(map, coordinates),
    maxWidth: 'min(350px, calc(100vw - 2rem))',
    offset: 12
  })
    .setLngLat(coordinates)
    .setDOMContent(container)
    .addTo(map)
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
  preferUsageName,
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
  title.textContent = getPointPrelevementDisplayName(point, {
    fallback: 'Point de prélèvement',
    preferUsageName
  })
  container.append(title)

  const technicalReference = getPointPrelevementTechnicalReference(point, {preferUsageName})
  if (technicalReference) {
    const reference = document.createElement('p')
    reference.className = 'fr-text--xs fr-mb-2v break-all text-gray-600'
    reference.textContent = `Référence : ${technicalReference}`
    container.append(reference)
  }

  if (showPreleveurs) {
    appendAssociationsSection(container, point, loadExploitations, {showCollecteurs})
  } else {
    appendPointUsagesSection(container, point)
  }

  popupRef.current = new maplibre.Popup({
    closeButton: false,
    closeOnClick: false,
    anchor: computeBestPopupAnchor(map, coordinates),
    maxWidth: 'min(340px, calc(100vw - 2rem))',
    offset: 10
  })
    .setLngLat(coordinates)
    .setDOMContent(container)
    .addTo(map)
}

const DashboardPointsMap = ({
  initialLayerVisibility,
  monitoringStations = [],
  points,
  pointsLegendLabel = 'Points de prélèvement',
  preferUsageName = false,
  showCollecteurs = true,
  showPreleveurs = true
}) => {
  const router = useRouter()
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const popupRef = useRef(null)
  const pointsRef = useRef(points)
  const monitoringStationsRef = useRef(monitoringStations)
  const hoveredFeatureKeyRef = useRef(null)
  const fittedGeometrySignatureRef = useRef(null)
  const exploitationsCacheRef = useRef(new Map())
  const shouldTrackMapMovesRef = useRef(false)
  const isRecenteringRef = useRef(false)
  const [hasMapMoved, setHasMapMoved] = useState(false)
  const [visibleLayers, setVisibleLayers] = useState(() =>
    resolveMapLayerVisibility(initialLayerVisibility))
  const visibleLayersRef = useRef(visibleLayers)
  visibleLayersRef.current = visibleLayers
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
  const visibleMapFeatures = useMemo(
    () => getVisibleMapFeatures({
      monitoringStations: monitoringStationsWithCoordinates,
      points: pointsWithCoordinates,
      visibleLayers
    }),
    [monitoringStationsWithCoordinates, pointsWithCoordinates, visibleLayers]
  )
  const visibleMapGeometrySignature = useMemo(
    () => getMapGeometrySignature(
      visibleMapFeatures.points,
      visibleMapFeatures.monitoringStations
    ),
    [visibleMapFeatures]
  )
  const piezometerCount = monitoringStationsWithCoordinates.filter(station => station.type === 'PIEZOMETER').length
  const flowStationCount = monitoringStationsWithCoordinates.filter(station => station.type === 'FLOW_STATION').length

  useEffect(() => {
    pointsRef.current = pointsWithCoordinates
  }, [pointsWithCoordinates])

  useEffect(() => {
    monitoringStationsRef.current = monitoringStationsWithCoordinates
  }, [monitoringStationsWithCoordinates])

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
    const initialVisibleFeatures = getVisibleMapFeatures({
      monitoringStations: initialMonitoringStations,
      points: initialPoints,
      visibleLayers: visibleLayersRef.current
    })
    const firstCoordinates = getPointCoordinates(initialVisibleFeatures.points[0])
      ?? getMonitoringStationCoordinates(initialVisibleFeatures.monitoringStations[0])
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

      map.addSource(MARKERS_SOURCE_ID, {
        type: 'geojson',
        data: buildFeatures(pointsRef.current, {preferUsageName})
      })

      map.addSource(MONITORING_SOURCE_ID, {
        type: 'geojson',
        data: buildMonitoringFeatures(monitoringStationsRef.current)
      })

      map.addLayer({
        id: MARKERS_LAYER_ID,
        type: 'symbol',
        source: MARKERS_SOURCE_ID,
        layout: {
          'icon-image': ['get', 'icon'],
          'icon-size': 1,
          'icon-allow-overlap': true,
          visibility: visibleLayersRef.current.points ? 'visible' : 'none'
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
          'icon-allow-overlap': true,
          visibility: visibleLayersRef.current.piezometers ? 'visible' : 'none'
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
          'icon-allow-overlap': true,
          visibility: visibleLayersRef.current.flowStations ? 'visible' : 'none'
        }
      })

      const visibleFeatures = getVisibleMapFeatures({
        monitoringStations: monitoringStationsRef.current,
        points: pointsRef.current,
        visibleLayers: visibleLayersRef.current
      })
      fitPoints(map, visibleFeatures.points, visibleFeatures.monitoringStations)
      fittedGeometrySignatureRef.current = getMapGeometrySignature(
        visibleFeatures.points,
        visibleFeatures.monitoringStations
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

      const closeHoveredPopup = () => {
        hoveredFeatureKeyRef.current = null
        map.getCanvas().style.cursor = ''
        removePopup(popupRef)
      }

      const onPointHover = event => {
        const pointId = event.features?.[0]?.properties?.id
        const point = pointsRef.current.find(candidate => String(candidate.id) === String(pointId))
        const featureKey = point ? `point:${point.id}` : null

        map.getCanvas().style.cursor = point ? 'pointer' : ''
        if (!point || hoveredFeatureKeyRef.current === featureKey) {
          return
        }

        hoveredFeatureKeyRef.current = featureKey
        openPointPopup({
          loadExploitations,
          map,
          point,
          popupRef,
          preferUsageName,
          showCollecteurs,
          showPreleveurs
        })
      }

      const onMonitoringStationHover = event => {
        const stationId = event.features?.[0]?.properties?.id
        const station = monitoringStationsRef.current.find(candidate =>
          String(candidate.id) === String(stationId))
        const featureKey = station ? `station:${station.id}` : null

        map.getCanvas().style.cursor = station ? 'pointer' : ''
        if (!station || hoveredFeatureKeyRef.current === featureKey) {
          return
        }

        hoveredFeatureKeyRef.current = featureKey
        openMonitoringStationPopup({map, popupRef, station})
      }

      const onPointClick = event => {
        const pointId = event.features?.[0]?.properties?.id
        const point = pointsRef.current.find(candidate => String(candidate.id) === String(pointId))

        if (point) {
          router.push(getPointPrelevementURL(point))
        }
      }

      const onMonitoringStationClick = event => {
        const stationId = event.features?.[0]?.properties?.id
        const station = monitoringStationsRef.current.find(candidate =>
          String(candidate.id) === String(stationId))
        const url = getMonitoringStationURL(station)

        if (url) {
          window.open(url, '_blank', 'noopener,noreferrer')
        }
      }

      map.on('mousemove', MARKERS_LAYER_ID, onPointHover)
      map.on('mouseleave', MARKERS_LAYER_ID, closeHoveredPopup)
      map.on('click', MARKERS_LAYER_ID, onPointClick)

      for (const layerId of [PIEZOMETER_LAYER_ID, FLOW_STATION_LAYER_ID]) {
        map.on('mousemove', layerId, onMonitoringStationHover)
        map.on('mouseleave', layerId, closeHoveredPopup)
        map.on('click', layerId, onMonitoringStationClick)
      }
    })

    return () => {
      shouldTrackMapMovesRef.current = false
      isRecenteringRef.current = false
      hoveredFeatureKeyRef.current = null
      removePopup(popupRef)
      map.remove()
      mapRef.current = null
    }
  }, [hasMapFeatures, loadExploitations, preferUsageName, router, showCollecteurs, showPreleveurs])

  useEffect(() => {
    const map = mapRef.current

    if (!map?.getSource?.(MARKERS_SOURCE_ID)) {
      return
    }

    ensureMarkerImages(map, pointsWithCoordinates)
    const data = buildFeatures(pointsWithCoordinates, {preferUsageName})
    map.getSource(MARKERS_SOURCE_ID)?.setData(data)
    ensureMonitoringMarkerImages(map)
    map.getSource(MONITORING_SOURCE_ID)?.setData(buildMonitoringFeatures(monitoringStationsWithCoordinates))
    hoveredFeatureKeyRef.current = null
    removePopup(popupRef)

    if (fittedGeometrySignatureRef.current === visibleMapGeometrySignature) {
      return
    }

    fittedGeometrySignatureRef.current = visibleMapGeometrySignature
    setHasMapMoved(false)

    if (
      visibleMapFeatures.points.length === 0
      && visibleMapFeatures.monitoringStations.length === 0
    ) {
      isRecenteringRef.current = false
      return
    }

    isRecenteringRef.current = true
    fitPoints(
      map,
      visibleMapFeatures.points,
      visibleMapFeatures.monitoringStations,
      {duration: 350}
    )
    map.once('moveend', () => {
      isRecenteringRef.current = false
      setHasMapMoved(false)
    })
  }, [
    monitoringStationsWithCoordinates,
    pointsWithCoordinates,
    preferUsageName,
    visibleMapFeatures,
    visibleMapGeometrySignature
  ])

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
    setVisibility(PIEZOMETER_LAYER_ID, visibleLayers.piezometers)
    setVisibility(FLOW_STATION_LAYER_ID, visibleLayers.flowStations)
    hoveredFeatureKeyRef.current = null
    removePopup(popupRef)
  }, [visibleLayers])

  const handleRecenter = useCallback(() => {
    const map = mapRef.current

    if (!map) {
      return
    }

    isRecenteringRef.current = true
    setHasMapMoved(false)
    fitPoints(
      map,
      visibleMapFeatures.points,
      visibleMapFeatures.monitoringStations,
      {duration: 350}
    )
    map.once('moveend', () => {
      isRecenteringRef.current = false
      setHasMapMoved(false)
    })
  }, [visibleMapFeatures])

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
              {hasPointsWithCoordinates && (
                <label className='flex cursor-pointer items-center gap-2'>
                  <input
                    checked={visibleLayers.points}
                    className='h-3.5 w-3.5 accent-[#000091]'
                    type='checkbox'
                    onChange={event => setVisibleLayers(current => ({...current, points: event.target.checked}))}
                  />
                  <span className='min-w-0 flex-1'>{pointsLegendLabel}</span>
                  <span className='shrink-0 tabular-nums text-gray-500'>
                    {NUMBER_FORMATTER.format(pointsWithCoordinates.length)}
                  </span>
                </label>
              )}
              {piezometerCount > 0 && (
                <label className='flex cursor-pointer items-center gap-2'>
                  <input
                    checked={visibleLayers.piezometers}
                    className='h-3.5 w-3.5'
                    style={{accentColor: '#0078F3'}}
                    type='checkbox'
                    onChange={event => setVisibleLayers(current => ({...current, piezometers: event.target.checked}))}
                  />
                  <span className='min-w-0 flex-1'>Points piézométriques</span>
                  <span className='shrink-0 tabular-nums text-gray-500'>
                    {NUMBER_FORMATTER.format(piezometerCount)}
                  </span>
                </label>
              )}
              {flowStationCount > 0 && (
                <label className='flex cursor-pointer items-center gap-2'>
                  <input
                    checked={visibleLayers.flowStations}
                    className='h-3.5 w-3.5'
                    style={{accentColor: '#009081'}}
                    type='checkbox'
                    onChange={event => setVisibleLayers(current => ({...current, flowStations: event.target.checked}))}
                  />
                  <span className='min-w-0 flex-1'>Mesures de débit</span>
                  <span className='shrink-0 tabular-nums text-gray-500'>
                    {NUMBER_FORMATTER.format(flowStationCount)}
                  </span>
                </label>
              )}
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
