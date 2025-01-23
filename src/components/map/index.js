'use client'

import {useEffect, useRef} from 'react'

import {Box, Button} from '@mui/material'
import maplibre from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {createRoot} from 'react-dom/client'

import Popup from './popup.js'
import vector from './styles/vector.json'

const Map = ({points, handleSelectedPoint}) => {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)

  function changeLayout() {
    const layout = mapRef.current.getLayoutProperty('points-prelevement-usages', 'visibility')

    if (layout === 'visible') {
      mapRef.current.setLayoutProperty('points-prelevement-usages', 'visibility', 'none')
      mapRef.current.setLayoutProperty('points-prelevement-milieux', 'visibility', 'visible')
    } else {
      mapRef.current.setLayoutProperty('points-prelevement-usages', 'visibility', 'visible')
      mapRef.current.setLayoutProperty('points-prelevement-milieux', 'visibility', 'none')
    }
  }

  useEffect(() => {
    if (!mapContainerRef.current) {
      return
    }

    const map = new maplibre.Map({
      container: mapContainerRef.current,
      style: vector,
      center: [55.55, -21.13],
      zoom: 9,
      debug: true,
      attributionControl: {compact: true}
    })

    const mapPopup = new maplibre.Popup({
      closeButton: false,
      closeOnClick: false
    })

    mapRef.current = map

    map.on('mouseenter', 'points-prelevement-usages', e => {
      map.getCanvas().style.cursor = 'pointer'

      const coordinates = [...e.features[0].geometry.coordinates]
      const {properties} = e.features[0]

      const popupContainer = document.createElement('div')
      const root = createRoot(popupContainer)

      root.render(<Popup properties={properties} />)

      mapPopup.setLngLat(coordinates)
        .setDOMContent(popupContainer)
        .addTo(map)
    })

    map.on('mouseleave', 'points-prelevement-usages', () => {
      map.getCanvas().style.cursor = ''
      mapPopup.remove()
    })

    map.on('click', 'points-prelevement-usages', e => {
      const {properties} = e.features[0]

      map.setPaintProperty('points-prelevement-usages', 'circle-stroke-color', [
        'case',
        ['==', ['get', 'id_point'], properties.id_point],
        'hotpink',
        'black'
      ])

      map.setPaintProperty('points-prelevement-usages', 'circle-stroke-width', [
        'case',
        ['==', ['get', 'id_point'], properties.id_point],
        3,
        1
      ])

      handleSelectedPoint(properties)
    })

    map.on('mouseenter', 'points-prelevement-milieux', e => {
      map.getCanvas().style.cursor = 'pointer'

      const coordinates = [...e.features[0].geometry.coordinates]
      const {properties} = e.features[0]

      const popupContainer = document.createElement('div')
      const root = createRoot(popupContainer)

      root.render(<Popup properties={properties} />)

      mapPopup.setLngLat(coordinates)
        .setDOMContent(popupContainer)
        .addTo(map)
    })

    map.on('mouseleave', 'points-prelevement-milieux', () => {
      map.getCanvas().style.cursor = ''
      mapPopup.remove()
    })

    map.on('click', 'points-prelevement-milieux', e => {
      const {properties} = e.features[0]

      map.setPaintProperty('points-prelevement-milieux', 'circle-stroke-color', [
        'case',
        ['==', ['get', 'id_point'], properties.id_point],
        'hotpink',
        'black'
      ])

      map.setPaintProperty('points-prelevement-milieux', 'circle-stroke-width', [
        'case',
        ['==', ['get', 'id_point'], properties.id_point],
        3,
        1
      ])

      handleSelectedPoint(properties)
    })

    map.on('load', async () => {
      mapRef.current.setLayoutProperty('points-prelevement-usages', 'visibility', 'visible')
      map.getSource('points-prelevement').setData({
        type: 'FeatureCollection',
        features: points.map(point => ({
          type: 'Feature',
          geometry: point.geom,
          id: point.id_point,
          properties: {
            ...point,
            usage: JSON.parse(point.exploitation[0].usage)
          }
        }))
      })
    })

    return () => map && map.remove()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Box
      sx={{
        position: 'relative',
        height: '100%',
        width: '60%'
      }}
    >
      <div
        ref={mapContainerRef}
        style={{
          height: '100%',
          width: '100%',
          position: 'relative'
        }}
      />
      <Button
        type='button'
        variant='contained'
        sx={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 1
        }}
        onClick={() => changeLayout()}
      >
        Changer
      </Button>
    </Box>
  )
}

export default Map
