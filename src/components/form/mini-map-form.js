/* eslint-disable react-hooks/exhaustive-deps */

import {useEffect, useRef, useState} from 'react'

import Input from '@codegouvfr/react-dsfr/Input'
import Select from '@codegouvfr/react-dsfr/SelectNext'
import {Box} from '@mui/system'
import maplibre from 'maplibre-gl'

import 'maplibre-gl/dist/maplibre-gl.css'
import photo from '@/components/map/styles/photo.json'
import planIGN from '@/components/map/styles/plan-ign.json'

const stylesMap = {
  'plan-ign': planIGN,
  orthophoto: photo
}

const MiniMapForm = ({geom, setGeom}) => {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const currentStyleRef = useRef('plan-ign')
  const [style, setStyle] = useState(currentStyleRef.current)
  const [coordinates, setCoordinates] = useState(
    geom ? [...geom.coordinates] : [55.55, -21.13]
  )
  const geojson = useRef({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: geom
          ? {...geom} : {
            type: 'Point',
            coordinates: [...coordinates]
          }
      }
    ]
  })

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

  // Synchronisation entre la carte et les inputs
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

    const map = new maplibre.Map({
      container: mapContainerRef.current,
      style: stylesMap[style],
      center: geom ? geom.coordinates : [55.55, -21.13],
      zoom: 11,
      attributionControl: {compact: true}
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
      map.addSource('point', {
        type: 'geojson',
        data: geojson.current
      })
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
          setGeom(geojson.current.features[0].geometry)
          map.off('mousemove', onMove)
        })
      })
    })

    return () => {
      map.remove()
    }
  }, [])

  // Mise à jour du style de la carte
  useEffect(() => {
    const map = mapRef.current

    if (map && style !== currentStyleRef.current) {
      const center = map.getCenter()
      const zoom = map.getZoom()

      map.setStyle(stylesMap[style])

      map.once('styledata', () => {
        map.setCenter(center)
        map.setZoom(zoom)

        if (map.getSource('point')) {
          map.getSource('point').setData(geojson.current)
        } else {
          map.addSource('point', {
            type: 'geojson',
            data: geojson.current
          })
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
      })

      currentStyleRef.current = style
    }
  }, [style])

  return (
    <Box className='flex flex-col h-full w-full relative border'>
      <div ref={mapContainerRef} className='flex h-full w-full' />
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
            value: geojson.current.features[0].geometry.coordinates[0],
            onChange: e => handleCoordinate(e.target.value, 'longitude')
          }}
        />
        <Input
          label='Latitude'
          nativeInputProps={{
            value: geojson.current.features[0].geometry.coordinates[1],
            onChange: e => handleCoordinate(e.target.value, 'latitude')
          }}
        />
      </div>
    </Box>
  )
}

export default MiniMapForm
