/* eslint-disable react-hooks/exhaustive-deps */

import {useEffect, useRef, useState} from 'react'

import Input from '@codegouvfr/react-dsfr/Input'
import {SegmentedControl} from '@codegouvfr/react-dsfr/SegmentedControl'
import Select from '@codegouvfr/react-dsfr/SelectNext'
import {Box} from '@mui/system'
import maplibre from 'maplibre-gl'

import 'maplibre-gl/dist/maplibre-gl.css'
import {cooperativeGesturesMapOptions} from '@/components/map/cooperative-gestures.js'
import {getMapMaxZoomForStyle} from '@/components/map/ign-raster.js'
import photo from '@/components/map/styles/photo.json'
import planIGN from '@/components/map/styles/plan-ign.json'
import {
  formatCoordinateInput,
  lambert93ToWgs84,
  parseCoordinateInput,
  wgs84ToLambert93
} from '@/lib/coordinates.js'

const stylesMap = {
  'plan-ign': planIGN,
  orthophoto: photo
}

const DEFAULT_CENTER = [2.213_749, 46.227_638]
const DEFAULT_ZOOM = 5
const GPS_COORDINATE_SYSTEM = 'gps'
const LAMBERT93_COORDINATE_SYSTEM = 'lambert93'

const coordinateSystemLabels = {
  [GPS_COORDINATE_SYSTEM]: 'GPS',
  [LAMBERT93_COORDINATE_SYSTEM]: 'Lambert 93'
}

function getSafeCoordinates(geom) {
  const coordinates = geom?.coordinates

  if (
    Array.isArray(coordinates)
    && coordinates.length === 2
    && coordinates.every(value => Number.isFinite(value))
  ) {
    return [...coordinates]
  }

  return [...DEFAULT_CENTER]
}

function getCoordinateInputs(coordinates, coordinateSystem) {
  if (coordinateSystem === LAMBERT93_COORDINATE_SYSTEM) {
    const lambertCoordinates = wgs84ToLambert93(coordinates) || []
    const [x, y] = lambertCoordinates

    return {
      x: formatCoordinateInput(x, 2),
      y: formatCoordinateInput(y, 2)
    }
  }

  return {
    latitude: formatCoordinateInput(coordinates[1]),
    longitude: formatCoordinateInput(coordinates[0])
  }
}

function getGpsCoordinatesFromInputs(coordinateInputs) {
  const latitude = parseCoordinateInput(coordinateInputs.latitude)
  const longitude = parseCoordinateInput(coordinateInputs.longitude)

  if (latitude === null || longitude === null) {
    return {
      error: 'Renseigner une latitude et une longitude numériques.'
    }
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return {
      error: 'La latitude doit être entre -90 et 90, et la longitude entre -180 et 180.'
    }
  }

  return {
    coordinates: [longitude, latitude]
  }
}

function getLambert93CoordinatesFromInputs(coordinateInputs) {
  const x = parseCoordinateInput(coordinateInputs.x)
  const y = parseCoordinateInput(coordinateInputs.y)

  if (x === null || y === null) {
    return {
      error: 'Renseigner des coordonnées Lambert 93 numériques.'
    }
  }

  const coordinates = lambert93ToWgs84([x, y])

  if (!coordinates) {
    return {
      error: 'Les coordonnées Lambert 93 ne peuvent pas être converties.'
    }
  }

  return {
    coordinates
  }
}

function getCoordinatesFromInputs(coordinateInputs, coordinateSystem) {
  return coordinateSystem === LAMBERT93_COORDINATE_SYSTEM
    ? getLambert93CoordinatesFromInputs(coordinateInputs)
    : getGpsCoordinatesFromInputs(coordinateInputs)
}

function createPointFeatureCollection(geom, coordinates) {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: geom
          ? {...geom}
          : {
            type: 'Point',
            coordinates: [...coordinates]
          }
      }
    ]
  }
}

function flattenCoordinatePairs(coordinates, pairs = []) {
  if (!Array.isArray(coordinates)) {
    return pairs
  }

  if (
    coordinates.length >= 2
    && typeof coordinates[0] === 'number'
    && typeof coordinates[1] === 'number'
  ) {
    pairs.push([coordinates[0], coordinates[1]])
    return pairs
  }

  for (const item of coordinates) {
    flattenCoordinatePairs(item, pairs)
  }

  return pairs
}

function getGeometryBounds(geometry) {
  const pairs = flattenCoordinatePairs(geometry?.coordinates)

  if (pairs.length === 0) {
    return null
  }

  const bounds = new maplibre.LngLatBounds(pairs[0], pairs[0])

  for (const pair of pairs.slice(1)) {
    bounds.extend(pair)
  }

  return bounds
}

function createBoundaryFeatureCollection(boundaryFeature) {
  if (!boundaryFeature?.geometry) {
    return null
  }

  return {
    type: 'FeatureCollection',
    features: [boundaryFeature]
  }
}

const MiniMapForm = ({geom, setGeom, boundaryFeature = null}) => {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const currentStyleRef = useRef('plan-ign')
  const coordinateSystemRef = useRef(LAMBERT93_COORDINATE_SYSTEM)
  const initialCoordinates = getSafeCoordinates(geom)
  const [style, setStyle] = useState(currentStyleRef.current)
  const [coordinateSystem, setCoordinateSystem] = useState(LAMBERT93_COORDINATE_SYSTEM)
  const [coordinates, setCoordinates] = useState(initialCoordinates)
  const [coordinateInputs, setCoordinateInputs] = useState(
    getCoordinateInputs(initialCoordinates, LAMBERT93_COORDINATE_SYSTEM)
  )
  const [coordinateError, setCoordinateError] = useState(null)
  const geojson = useRef(createPointFeatureCollection(geom, coordinates))
  const boundaryGeojson = useRef(createBoundaryFeatureCollection(boundaryFeature))

  const addBoundaryLayer = map => {
    if (!boundaryGeojson.current) {
      return
    }

    if (!map.getSource('zone-boundary')) {
      map.addSource('zone-boundary', {
        type: 'geojson',
        data: boundaryGeojson.current
      })
    }

    if (!map.getLayer('zone-boundary-fill')) {
      map.addLayer({
        id: 'zone-boundary-fill',
        type: 'fill',
        source: 'zone-boundary',
        paint: {
          'fill-color': '#000091',
          'fill-opacity': 0.08
        }
      })
    }

    if (!map.getLayer('zone-boundary-line')) {
      map.addLayer({
        id: 'zone-boundary-line',
        type: 'line',
        source: 'zone-boundary',
        paint: {
          'line-color': '#000091',
          'line-width': 2,
          'line-opacity': 0.9
        }
      })
    }
  }

  const addPointLayer = map => {
    if (!map.getSource('point')) {
      map.addSource('point', {
        type: 'geojson',
        data: geojson.current
      })
    }

    if (!map.getLayer('point')) {
      map.addLayer({
        id: 'point',
        type: 'circle',
        source: 'point',
        paint: {
          'circle-radius': 10,
          'circle-color': '#007cbf',
          'circle-stroke-width': 2,
          'circle-stroke-color': 'white'
        }
      })
    }
  }

  const fitBoundaryIfPossible = map => {
    if (geom || !boundaryFeature?.geometry) {
      return
    }

    const bounds = getGeometryBounds(boundaryFeature.geometry)

    if (!bounds) {
      return
    }

    map.fitBounds(bounds, {
      padding: 40,
      duration: 0,
      maxZoom: 12
    })
  }

  const handleCoordinateSystemChange = nextCoordinateSystem => {
    coordinateSystemRef.current = nextCoordinateSystem
    setCoordinateSystem(nextCoordinateSystem)
    setCoordinateInputs(getCoordinateInputs(coordinates, nextCoordinateSystem))
    setCoordinateError(null)
  }

  const handleCoordinateInput = (key, value) => {
    const nextInputs = {
      ...coordinateInputs,
      [key]: value
    }

    setCoordinateInputs(nextInputs)

    const result = getCoordinatesFromInputs(nextInputs, coordinateSystem)

    if (result.error) {
      setCoordinateError(result.error)
      return
    }

    setCoordinateError(null)
    updateGeometry(result.coordinates, {syncInputs: false})
  }

  const updateGeometry = (newCoords, {syncInputs = true} = {}) => {
    setCoordinates([...newCoords])
    geojson.current.features[0].geometry.coordinates = [...newCoords]
    setGeom({
      type: 'Point',
      coordinates: [...newCoords]
    })

    if (syncInputs) {
      setCoordinateInputs(getCoordinateInputs(newCoords, coordinateSystemRef.current))
    }

    if (mapRef.current && mapRef.current.getSource('point')) {
      mapRef.current.getSource('point').setData(geojson.current)
      mapRef.current.flyTo({
        center: newCoords
      })
    }
  }

  useEffect(() => {
    if (!mapContainerRef.current) {
      return
    }

    const boundaryBounds = boundaryFeature?.geometry ? getGeometryBounds(boundaryFeature.geometry) : null

    const map = new maplibre.Map({
      container: mapContainerRef.current,
      style: stylesMap[style],
      center: geom ? geom.coordinates : boundaryBounds?.getCenter()?.toArray?.() || DEFAULT_CENTER,
      zoom: geom ? 11 : DEFAULT_ZOOM,
      attributionControl: {compact: true},
      maxZoom: getMapMaxZoomForStyle(style),
      ...cooperativeGesturesMapOptions
    })

    const canvas = map.getCanvasContainer()

    mapRef.current = map

    function onMove(e) {
      const coords = e.lngLat

      canvas.style.cursor = 'grabbing'

      geojson.current.features[0].geometry.coordinates = [coords.lng, coords.lat]
      map.getSource('point').setData(geojson.current)
    }

    map.on('load', () => {
      addBoundaryLayer(map)
      addPointLayer(map)
      fitBoundaryIfPossible(map)

      map.on('mouseenter', 'point', () => {
        map.setPaintProperty('point', 'circle-color', '#000091')
        canvas.style.cursor = 'move'
      })

      map.on('mouseleave', 'point', () => {
        map.setPaintProperty('point', 'circle-color', '#007cbf')
        canvas.style.cursor = ''
      })

      map.on('click', e => {
        const newCoords = [e.lngLat.lng, e.lngLat.lat]
        updateGeometry(newCoords)
      })

      map.on('mousedown', 'point', e => {
        e.preventDefault()

        canvas.style.cursor = 'grab'

        map.on('mousemove', onMove)
        map.once('mouseup', () => {
          const newCoords = geojson.current.features[0].geometry.coordinates
          updateGeometry(newCoords)
          map.off('mousemove', onMove)
        })
      })
    })

    return () => {
      map.remove()
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current

    if (map && style !== currentStyleRef.current) {
      const center = map.getCenter()
      const zoom = map.getZoom()
      const maxZoom = getMapMaxZoomForStyle(style)

      map.setMaxZoom(maxZoom)
      map.setStyle(stylesMap[style])

      map.once('styledata', () => {
        map.setCenter(center)
        map.setZoom(Math.min(zoom, maxZoom))
        addBoundaryLayer(map)
        addPointLayer(map)

        if (map.getSource('point')) {
          map.getSource('point').setData(geojson.current)
        }
      })

      currentStyleRef.current = style
    }
  }, [style])

  return (
    <Box className='flex flex-col h-full w-full relative border'>
      <div ref={mapContainerRef} className='flex h-full w-full' />
      {boundaryFeature && (
        <div className='absolute top-3 right-3 fr-badge fr-badge--info fr-badge--no-icon'>
          Limite de zone affichée
        </div>
      )}
      <Select
        style={{position: 'absolute'}}
        nativeSelectProps={{
          defaultValue: 'plan-ign',
          onChange: e => setStyle(e.target.value)
        }}
        options={[
          {value: 'plan-ign', label: 'Plan IGN'},
          {value: 'orthophoto', label: 'Photographie aérienne'}
        ]}
      />
      <div className='border-t border-gray-200 bg-white p-4'>
        <SegmentedControl
          className='fr-mb-2w'
          legend='Format de saisie des coordonnées'
          segments={[
            {
              label: coordinateSystemLabels[LAMBERT93_COORDINATE_SYSTEM],
              nativeInputProps: {
                checked: coordinateSystem === LAMBERT93_COORDINATE_SYSTEM,
                onChange: () => handleCoordinateSystemChange(LAMBERT93_COORDINATE_SYSTEM)
              }
            },
            {
              label: coordinateSystemLabels[GPS_COORDINATE_SYSTEM],
              nativeInputProps: {
                checked: coordinateSystem === GPS_COORDINATE_SYSTEM,
                onChange: () => handleCoordinateSystemChange(GPS_COORDINATE_SYSTEM)
              }
            }
          ]}
        />

        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
          {coordinateSystem === LAMBERT93_COORDINATE_SYSTEM ? (
            <>
              <Input
                label='X Lambert 93'
                hintText='Ex. 652469,12'
                state={coordinateError ? 'error' : 'default'}
                stateRelatedMessage={coordinateError || undefined}
                nativeInputProps={{
                  inputMode: 'decimal',
                  autoComplete: 'off',
                  value: coordinateInputs.x,
                  onChange: e => handleCoordinateInput('x', e.target.value)
                }}
              />
              <Input
                label='Y Lambert 93'
                hintText='Ex. 6862035,25'
                state={coordinateError ? 'error' : 'default'}
                stateRelatedMessage={coordinateError || undefined}
                nativeInputProps={{
                  inputMode: 'decimal',
                  autoComplete: 'off',
                  value: coordinateInputs.y,
                  onChange: e => handleCoordinateInput('y', e.target.value)
                }}
              />
            </>
          ) : (
            <>
              <Input
                label='Latitude GPS'
                hintText='Ex. 46,227638'
                state={coordinateError ? 'error' : 'default'}
                stateRelatedMessage={coordinateError || undefined}
                nativeInputProps={{
                  inputMode: 'decimal',
                  autoComplete: 'off',
                  value: coordinateInputs.latitude,
                  onChange: e => handleCoordinateInput('latitude', e.target.value)
                }}
              />
              <Input
                label='Longitude GPS'
                hintText='Ex. 2,213749'
                state={coordinateError ? 'error' : 'default'}
                stateRelatedMessage={coordinateError || undefined}
                nativeInputProps={{
                  inputMode: 'decimal',
                  autoComplete: 'off',
                  value: coordinateInputs.longitude,
                  onChange: e => handleCoordinateInput('longitude', e.target.value)
                }}
              />
            </>
          )}
        </div>
      </div>
    </Box>
  )
}

export default MiniMapForm
