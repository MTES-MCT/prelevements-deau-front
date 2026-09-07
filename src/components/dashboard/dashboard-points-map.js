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
import {createRoot} from 'react-dom/client'

import {
  getVisibleMapFeatures,
  resolveMapLayerVisibility
} from './dashboard-map-layers.js'

import {cooperativeGesturesMapOptions} from '@/components/map/cooperative-gestures.js'
import {IGN_RASTER_MAX_ZOOM} from '@/components/map/ign-raster.js'
import MapPopupCard from '@/components/map/map-popup-card.js'
import Popup from '@/components/map/popup.js'
import planIGN from '@/components/map/styles/plan-ign.json'
import {
  canLoadDashboardPointActors,
  getResolvedCachedValue,
  indexDashboardMapItems,
  loadCachedValue,
  normalizeDashboardPointActors
} from '@/lib/dashboard-map-popups.js'
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
  isDashboardVisibleUsage
} from '@/lib/water-uses.js'
import {getDashboardPointActorsAction} from '@/server/actions/dashboard.js'
import {getPointPrelevementDisplayName} from '@/utils/point-prelevement.js'

const MARKERS_SOURCE_ID = 'dashboard-points-markers'
const MARKERS_LAYER_ID = 'dashboard-points-markers-symbol'
const MONITORING_SOURCE_ID = 'dashboard-monitoring-stations'
const PIEZOMETER_LAYER_ID = 'dashboard-piezometers'
const FLOW_STATION_LAYER_ID = 'dashboard-flow-stations'
const PIEZOMETER_ICON_ID = 'dashboard-piezometer-marker'
const FLOW_STATION_ICON_ID = 'dashboard-flow-station-marker'
const POPUP_ACTORS_HOVER_DELAY = 160
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
    background: 'var(--app-monitoring-piezo-background, #E3E3FD)',
    color: 'var(--app-monitoring-piezo-text, #000091)'
  },
  FLOW_STATION: {
    label: 'Mesure de débit',
    source: 'Hub’Eau / Hydrométrie',
    background: 'var(--app-monitoring-flow-background, #B8FEC9)',
    color: 'var(--app-monitoring-flow-text, #18753C)'
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

const DefinitionRow = ({label, value}) => {
  if (value === null || value === undefined || value === '') {
    return null
  }

  return (
    <div className='grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-2 border-t border-gray-200 py-1.5 text-xs first:border-t-0'>
      <dt className='text-gray-600'>{label}</dt>
      <dd className='m-0 min-w-0 break-words font-medium text-gray-900'>{value}</dd>
    </div>
  )
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

const LatestMeasurement = ({station, typeConfig}) => {
  const measurement = station.latestMeasurement
  if (!measurement) {
    return (
      <div className='my-2.5 border-y border-gray-200 py-2.5'>
        <p className='fr-text--xs fr-mb-1v font-semibold text-gray-600'>Dernière donnée affichée</p>
        <p className='fr-text--xs fr-mb-0 break-words text-gray-600'>
          Aucune donnée disponible sur la période affichée.
        </p>
      </div>
    )
  }

  let value
  if (station.type === 'PIEZOMETER') {
    if (isFiniteNumber(measurement.depth)) {
      value = `${formatNumber(measurement.depth)} m de profondeur`
    } else if (isFiniteNumber(measurement.levelNgf)) {
      value = `${formatNumber(measurement.levelNgf)} m NGF`
    } else {
      value = 'Valeur indisponible'
    }
  } else {
    value = isFiniteNumber(measurement.valueLitersPerSecond)
      ? `${formatNumber(measurement.valueLitersPerSecond)} L/s`
      : 'Valeur indisponible'
  }

  const ngfValue = (
    station.type === 'PIEZOMETER'
    && isFiniteNumber(measurement.depth)
    && isFiniteNumber(measurement.levelNgf)
  ) ? `Cote : ${formatNumber(measurement.levelNgf)} m NGF` : null

  const measuredAt = formatDate(measurement.at, {
    includeTime: station.type === 'FLOW_STATION' && measurement.granularity === 'REALTIME'
  })
  const nature = station.type === 'PIEZOMETER'
    ? getGroundwaterMeasurementNature(measurement)
    : getFlowMeasurementNature(measurement)
  const measurementDescription = [measuredAt, nature].filter(Boolean).join(' · ')

  return (
    <div className='my-2.5 border-y border-gray-200 py-2.5'>
      <p className='fr-text--xs fr-mb-1v font-semibold text-gray-600'>Dernière donnée affichée</p>
      <p className='fr-text--lg fr-mb-1v font-bold' style={{color: typeConfig.color}}>
        {value}
      </p>
      {ngfValue && <p className='fr-text--xs fr-mb-0 break-words text-gray-600'>{ngfValue}</p>}
      <p className='fr-text--xs fr-mb-0 break-words text-gray-600'>{measurementDescription}</p>
    </div>
  )
}

const MonitoringStationPopup = ({dismissable, station, onAction}) => {
  const typeConfig = MONITORING_STATION_TYPES[station.type]
  if (!typeConfig) {
    return null
  }

  const stationDetails = station.details ?? {}
  const openedAt = formatDate(stationDetails.openedAt)
  const commonRows = [
    {label: 'Commune', value: stationDetails.commune},
    {label: 'Département', value: stationDetails.department}
  ]
  const typeRows = station.type === 'PIEZOMETER'
    ? [
      {
        label: 'Profondeur de l’ouvrage',
        value: isFiniteNumber(stationDetails.investigationDepthMeters)
          ? `${formatNumber(stationDetails.investigationDepthMeters)} m`
          : null
      },
      {
        label: 'Altitude de la station',
        value: isFiniteNumber(stationDetails.altitudeMeters)
          ? `${formatNumber(stationDetails.altitudeMeters)} m`
          : null
      },
      {label: 'Code BSS', value: station.stationCode},
      {label: 'Identifiant BSS', value: station.bssId}
    ]
    : [
      {label: 'Cours d’eau', value: stationDetails.watercourse},
      {
        label: 'Altitude de référence',
        value: isFiniteNumber(stationDetails.altitudeMeters)
          ? `${formatNumber(stationDetails.altitudeMeters)} m`
          : null
      },
      {label: 'Code station', value: station.stationCode},
      {label: 'Code site', value: station.siteCode},
      {
        label: 'État de la station',
        value: stationDetails.inService === null || stationDetails.inService === undefined
          ? null
          : (stationDetails.inService ? 'En service' : 'Hors service')
      }
    ]
  const lifecycleRows = [
    {
      label: station.type === 'PIEZOMETER' ? 'Début des mesures' : 'Mise en service',
      value: openedAt
    },
    {
      label: 'Fermeture',
      value: station.type === 'PIEZOMETER' ? null : formatDate(stationDetails.closedAt)
    },
    {
      label: station.zones?.length > 1 ? 'Territoires' : 'Territoire',
      value: station.zones?.map(zone => zone.name).filter(Boolean).join(', ')
    }
  ]
  const details = station.type === 'PIEZOMETER'
    ? [...commonRows, ...typeRows, ...lifecycleRows]
    : [typeRows[0], ...commonRows, ...typeRows.slice(1), ...lifecycleRows]

  return (
    <MapPopupCard
      actionLabel={dismissable && onAction ? 'Voir la fiche de la station' : undefined}
      dismissable={dismissable}
      eyebrow={(
        <span
          className='fr-mb-1v inline-flex px-2 py-1 text-xs font-semibold'
          style={{backgroundColor: typeConfig.background, color: typeConfig.color}}
        >
          {typeConfig.label}
        </span>
      )}
      subtitle={station.providerLabel && station.providerLabel !== station.label
        ? station.providerLabel
        : null}
      title={station.label}
      width='20.625rem'
      onAction={onAction}
    >
      <LatestMeasurement station={station} typeConfig={typeConfig} />

      <dl className='fr-mb-0'>
        {details.map(detail => (
          <DefinitionRow key={detail.label} label={detail.label} value={detail.value} />
        ))}
      </dl>

      <p className='fr-text--xs fr-mb-0 mt-2.5 border-t border-gray-200 pt-2 text-gray-500'>
        Données : {typeConfig.source}
      </p>
    </MapPopupCard>
  )
}

const DashboardPointsMap = ({
  capabilities,
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
  const popupRootRef = useRef(null)
  const popupActorsTimeoutRef = useRef(null)
  const activePopupFeatureKeyRef = useRef(null)
  const popupPersistentRef = useRef(false)
  const pointsRef = useRef(points)
  const monitoringStationsRef = useRef(monitoringStations)
  const pointsByIdRef = useRef(new Map())
  const monitoringStationsByIdRef = useRef(new Map())
  const fittedGeometrySignatureRef = useRef(null)
  const pointActorsCacheRef = useRef(new Map())
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
  const pointsById = useMemo(
    () => indexDashboardMapItems(pointsWithCoordinates),
    [pointsWithCoordinates]
  )
  const monitoringStationsById = useMemo(
    () => indexDashboardMapItems(monitoringStationsWithCoordinates),
    [monitoringStationsWithCoordinates]
  )
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
  const popupOptionsRef = useRef(null)
  popupOptionsRef.current = {
    preferUsageName,
    readPointActors: canLoadDashboardPointActors(capabilities, {showPreleveurs}),
    readPointDetails: capabilities?.readPointDetails === true,
    showCollecteurs
  }

  useEffect(() => {
    pointsRef.current = pointsWithCoordinates
    pointsByIdRef.current = pointsById
  }, [pointsById, pointsWithCoordinates])

  useEffect(() => {
    monitoringStationsRef.current = monitoringStationsWithCoordinates
    monitoringStationsByIdRef.current = monitoringStationsById
  }, [monitoringStationsById, monitoringStationsWithCoordinates])

  const removePopup = useCallback(() => {
    if (popupActorsTimeoutRef.current !== null) {
      window.clearTimeout(popupActorsTimeoutRef.current)
      popupActorsTimeoutRef.current = null
    }

    activePopupFeatureKeyRef.current = null
    popupPersistentRef.current = false
    const root = popupRootRef.current
    popupRootRef.current = null
    const popup = popupRef.current
    popupRef.current = null
    root?.unmount()
    popup?.remove()
  }, [])

  const loadPointActors = useCallback(pointId => {
    if (!popupOptionsRef.current.readPointActors) {
      return Promise.resolve(null)
    }

    return loadCachedValue(pointActorsCacheRef.current, pointId, async () => {
      const result = await getDashboardPointActorsAction(pointId)

      if (!result.success) {
        throw new Error(result.error || 'Impossible de charger les acteurs associés.')
      }

      return normalizeDashboardPointActors(result.data)
    })
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

      const mountPopup = ({coordinates, featureKey, maxWidth, offset, persistent, render}) => {
        removePopup()
        const container = document.createElement('div')
        const root = createRoot(container)
        popupRootRef.current = root
        activePopupFeatureKeyRef.current = featureKey
        popupPersistentRef.current = persistent
        render(root)

        const dynamicPopup = new maplibre.Popup({
          className: 'points-prelevement-map-popup',
          closeButton: persistent,
          closeOnClick: persistent,
          anchor: computeBestPopupAnchor(map, coordinates),
          maxWidth,
          offset
        })
          .setLngLat(coordinates)
          .setDOMContent(container)
          .addTo(map)
        popupRef.current = dynamicPopup

        dynamicPopup.on('close', () => {
          if (popupRef.current !== dynamicPopup) {
            return
          }

          if (popupActorsTimeoutRef.current !== null) {
            window.clearTimeout(popupActorsTimeoutRef.current)
            popupActorsTimeoutRef.current = null
          }

          activePopupFeatureKeyRef.current = null
          popupPersistentRef.current = false
          popupRef.current = null
          const activeRoot = popupRootRef.current
          popupRootRef.current = null
          activeRoot?.unmount()
        })

        return {popup: dynamicPopup, root}
      }

      const openPointPopup = (point, {persistent = false} = {}) => {
        const coordinates = getPointCoordinates(point)
        if (!coordinates) {
          return
        }

        const featureKey = `point:${point.id}`
        const options = popupOptionsRef.current
        const cachedActors = options.readPointActors
          ? getResolvedCachedValue(pointActorsCacheRef.current, point.id)
          : null
        const canLoadActors = options.readPointActors
        const renderPointPopup = (root, {actors = cachedActors, actorsError = false} = {}) => {
          const pointWithActors = actors
            ? {
              ...point,
              collecteurs: options.showCollecteurs ? actors.collecteurs : [],
              preleveurs: actors.preleveurs
            }
            : point

          root.render(
            <Popup
              actionLabel={persistent && options.readPointDetails ? 'Voir la fiche du point' : undefined}
              declarantsError={actorsError}
              declarantsLoading={canLoadActors && !actors && !actorsError}
              dismissable={persistent}
              point={pointWithActors}
              preferUsageName={options.preferUsageName}
              showDeclarants={canLoadActors}
              onAction={persistent && options.readPointDetails
                ? () => router.push(getPointPrelevementURL(point))
                : undefined}
            />
          )
        }

        const mountedPopup = mountPopup({
          coordinates,
          featureKey,
          maxWidth: 'min(320px, calc(100vw - 1.5rem))',
          offset: 10,
          persistent,
          render: root => renderPointPopup(root)
        })

        if (canLoadActors && !cachedActors) {
          popupActorsTimeoutRef.current = window.setTimeout(async () => {
            popupActorsTimeoutRef.current = null

            try {
              const actors = await loadPointActors(point.id)
              if (
                activePopupFeatureKeyRef.current !== featureKey
                || popupRef.current !== mountedPopup.popup
                || popupRootRef.current !== mountedPopup.root
              ) {
                return
              }

              renderPointPopup(mountedPopup.root, {actors})
            } catch {
              if (
                activePopupFeatureKeyRef.current !== featureKey
                || popupRef.current !== mountedPopup.popup
                || popupRootRef.current !== mountedPopup.root
              ) {
                return
              }

              renderPointPopup(mountedPopup.root, {actorsError: true})
            }
          }, persistent ? 0 : POPUP_ACTORS_HOVER_DELAY)
        }
      }

      const openMonitoringStationPopup = (station, {persistent = false} = {}) => {
        const coordinates = getMonitoringStationCoordinates(station)
        const stationURL = getMonitoringStationURL(station)
        if (!coordinates || !MONITORING_STATION_TYPES[station.type]) {
          return
        }

        mountPopup({
          coordinates,
          featureKey: `station:${station.id}`,
          maxWidth: 'min(350px, calc(100vw - 1.5rem))',
          offset: 12,
          persistent,
          render: root => root.render(
            <MonitoringStationPopup
              dismissable={persistent}
              station={station}
              onAction={persistent && stationURL
                ? () => window.open(stationURL, '_blank', 'noopener,noreferrer')
                : undefined}
            />
          )
        })
      }

      const closeHoveredPopup = () => {
        map.getCanvas().style.cursor = ''
        if (!popupPersistentRef.current) {
          removePopup()
        }
      }

      const onPointMove = event => {
        const pointId = event.features?.[0]?.properties?.id
        const point = pointsByIdRef.current.get(String(pointId))
        const featureKey = point ? `point:${point.id}` : null

        map.getCanvas().style.cursor = point ? 'pointer' : ''
        if (
          !point
          || popupPersistentRef.current
          || activePopupFeatureKeyRef.current === featureKey
        ) {
          return
        }

        openPointPopup(point)
      }

      const onMonitoringStationMove = event => {
        const stationId = event.features?.[0]?.properties?.id
        const station = monitoringStationsByIdRef.current.get(String(stationId))
        const featureKey = station ? `station:${station.id}` : null

        map.getCanvas().style.cursor = station ? 'pointer' : ''
        if (
          !station
          || popupPersistentRef.current
          || activePopupFeatureKeyRef.current === featureKey
        ) {
          return
        }

        openMonitoringStationPopup(station)
      }

      const onPointClick = event => {
        const pointId = event.features?.[0]?.properties?.id
        const point = pointsByIdRef.current.get(String(pointId))

        if (point) {
          openPointPopup(point, {persistent: true})
        }
      }

      const onMonitoringStationClick = event => {
        const stationId = event.features?.[0]?.properties?.id
        const station = monitoringStationsByIdRef.current.get(String(stationId))

        if (station) {
          openMonitoringStationPopup(station, {persistent: true})
        }
      }

      map.on('mousemove', MARKERS_LAYER_ID, onPointMove)
      map.on('mouseleave', MARKERS_LAYER_ID, closeHoveredPopup)
      map.on('click', MARKERS_LAYER_ID, onPointClick)

      for (const layerId of [PIEZOMETER_LAYER_ID, FLOW_STATION_LAYER_ID]) {
        map.on('mousemove', layerId, onMonitoringStationMove)
        map.on('mouseleave', layerId, closeHoveredPopup)
        map.on('click', layerId, onMonitoringStationClick)
      }
    })

    return () => {
      shouldTrackMapMovesRef.current = false
      isRecenteringRef.current = false
      removePopup()
      map.remove()
      mapRef.current = null
    }
  }, [hasMapFeatures, loadPointActors, preferUsageName, removePopup, router])

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
    removePopup()

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
    removePopup,
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
    removePopup()
  }, [removePopup, visibleLayers])

  useEffect(() => {
    removePopup()
  }, [
    capabilities?.readPointActors,
    capabilities?.readPointDetails,
    removePopup,
    showCollecteurs,
    showPreleveurs
  ])

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
