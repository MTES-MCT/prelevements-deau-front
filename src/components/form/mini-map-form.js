/* eslint-disable react-hooks/exhaustive-deps */

import {useEffect, useRef, useState} from 'react'

import Input from '@codegouvfr/react-dsfr/Input'
import Select from '@codegouvfr/react-dsfr/SelectNext'
import {Box} from '@mui/system'
import maplibre from 'maplibre-gl'

import 'maplibre-gl/dist/maplibre-gl.css'
import {cooperativeGesturesMapOptions} from '@/components/map/cooperative-gestures.js'
import photo from '@/components/map/styles/photo.json'
import planIGN from '@/components/map/styles/plan-ign.json'

const stylesMap = {
  'plan-ign': planIGN,
  orthophoto: photo
}

const DEFAULT_CENTER = [2.213_749, 46.227_638]
const DEFAULT_ZOOM = 5

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
  const [style, setStyle] = useState(currentStyleRef.current)
  const [coordinates, setCoordinates] = useState(
    geom ? [...geom.coordinates] : DEFAULT_CENTER
  )
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

  const handleCoordinate = (value, coordType) => {
    const numValue = Number.parseFloat(value)
    if (Number.isNaN(numValue)) {
      return
    }

    const newCoords = [...coordinates]
    const index = coordType === 'longitude' ? 0 : 1
    newCoords[index] = numValue

    setCoordinates(newCoords)
    updateGeometry(newCoords)

    setGeom({
      type: 'Point',
      coordinates: newCoords
    })
  }

  const updateGeometry = newCoords => {
    geojson.current.features[0].geometry.coordinates = [...newCoords]
    setGeom({
      type: 'Point',
      coordinates: [...newCoords]
    })

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
        geojson.current.features[0].geometry.coordinates = newCoords

        map.getSource('point').setData(geojson.current)
        setCoordinates(newCoords)

        setGeom({
          type: 'Point',
          coordinates: newCoords
        })
      })

      map.on('mousedown', 'point', e => {
        e.preventDefault()

        canvas.style.cursor = 'grab'

        map.on('mousemove', onMove)
        map.once('mouseup', () => {
          const newCoords = geojson.current.features[0].geometry.coordinates
          setCoordinates([...newCoords])
          setGeom(geojson.current.features[0].geometry)
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

      map.setStyle(stylesMap[style])

      map.once('styledata', () => {
        map.setCenter(center)
        map.setZoom(zoom)
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
      <div className='p-5 grid grid-cols-2 gap-4'>
        <Input
          label='Longitude'
          nativeInputProps={{
            value: coordinates[0],
            onChange: e => handleCoordinate(e.target.value, 'longitude')
          }}
        />
        <Input
          label='Latitude'
          nativeInputProps={{
            value: coordinates[1],
            onChange: e => handleCoordinate(e.target.value, 'latitude')
          }}
        />
      </div>
    </Box>
  )
}

export default MiniMapForm
