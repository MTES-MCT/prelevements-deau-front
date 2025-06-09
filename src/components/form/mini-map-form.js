/* eslint-disable react-hooks/exhaustive-deps */

import {useEffect, useRef} from 'react'

import {Box} from '@mui/system'
import maplibre from 'maplibre-gl'

import 'maplibre-gl/dist/maplibre-gl.css'
import vectorIGN from '@/components/map/styles/vector-ign.json'

const MiniMapForm = ({setGeom}) => {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const geojson = useRef({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [55.55, -21.13]
        }
      }
    ]
  })

  useEffect(() => {
    if (!mapContainerRef.current) {
      return
    }

    const map = new maplibre.Map({
      container: mapContainerRef.current,
      style: vectorIGN,
      center: [55.55, -21.13],
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

  return (
    <Box className='flex h-full w-full relative border'>
      <div ref={mapContainerRef} className='flex h-full w-full' />
    </Box>
  )
}

export default MiniMapForm
