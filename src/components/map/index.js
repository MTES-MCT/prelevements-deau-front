'use client'

import {useEffect, useRef, useState} from 'react'

import {
  Box, Select, MenuItem, Paper
} from '@mui/material'
import maplibre from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {createRoot} from 'react-dom/client'

import Legend from './legend.js'
import Popup from './popup.js'
import vector from './styles/vector.json'

const activeLayers = ['points-prelevement-usages', 'points-prelevement-milieux']

function highlightPoint(map, layerId, pointId) {
  map.setPaintProperty(layerId, 'circle-stroke-color', [
    'case',
    ['==', ['get', 'id_point'], pointId],
    'hotpink',
    'black'
  ])

  map.setPaintProperty(layerId, 'circle-stroke-width', [
    'case',
    ['==', ['get', 'id_point'], pointId],
    3,
    1
  ])
}

const Map = ({points, selectedPoint, handleSelectedPoint}) => {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const [legend, setLegend] = useState('milieux')
  const [filters, setFilters] = useState([])

  const handleFilters = e => {
    if (filters.includes(e)) {
      setFilters(filters.filter(filter => filter !== e))
    } else {
      setFilters([...filters, e])
    }
  }

  const handleLegendChange = event => {
    const newLegend = event.target.value
    setLegend(newLegend)

    if (mapRef.current) {
      if (newLegend === 'usages') {
        mapRef.current.setLayoutProperty('points-prelevement-usages', 'visibility', 'visible')
        mapRef.current.setLayoutProperty('points-prelevement-milieux', 'visibility', 'none')
      } else {
        mapRef.current.setLayoutProperty('points-prelevement-usages', 'visibility', 'none')
        mapRef.current.setLayoutProperty('points-prelevement-milieux', 'visibility', 'visible')
      }

      if (selectedPoint) {
        highlightPoint(mapRef.current, `points-prelevement-${newLegend}`, selectedPoint.id_point)
      }
    }

    setFilters([])
    mapRef.current.setFilter('points-prelevement-milieux', null)
    mapRef.current.setFilter('points-prelevement-usages', null)
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

    map.on('mouseenter', activeLayers, e => {
      map.getCanvas().style.cursor = 'pointer'

      const coordinates = [...e.features[0].geometry.coordinates]
      const {properties} = e.features[0]

      const popupContainer = document.createElement('div')
      const root = createRoot(popupContainer)

      const hoveredPoint = points.find(point => point.id_point === properties.id_point)

      root.render(<Popup point={hoveredPoint} />)

      mapPopup.setLngLat(coordinates)
        .setDOMContent(popupContainer)
        .addTo(map)
    })

    map.on('mouseleave', activeLayers, () => {
      map.getCanvas().style.cursor = ''
      mapPopup.remove()
    })

    map.on('click', activeLayers, e => {
      const {properties, layer} = e.features[0]

      highlightPoint(map, layer.id, properties.id_point)
      handleSelectedPoint(properties.id_point)
    })

    map.on('load', async () => {
      mapRef.current.setLayoutProperty('points-prelevement-milieux', 'visibility', 'visible')
      mapRef.current.setLayoutProperty('points-prelevement-usages', 'visibility', 'none')
      map.getSource('points-prelevement').setData({
        type: 'FeatureCollection',
        features: points.map(point => ({
          type: 'Feature',
          geometry: point.geom,
          id: point.id_point,
          properties: {
            ...point
          }
        }))
      })
    })

    const scale = new maplibre.ScaleControl({
      maxWidth: 80,
      unit: 'metric'
    })
    map.addControl(scale)

    return () => map && map.remove()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (mapRef.current && mapRef.current.isStyleLoaded()) {
      if (legend === 'usages') {
        const filter = filters.length > 0
          ? ['match', ['get', 'usage'], filters, false, true]
          : ['match', ['get', 'usage'], '', true, true]

        mapRef.current.setFilter('points-prelevement-usages', filter)
      }

      if (legend === 'typesMilieu') {
        const filter = filters.length > 0
          ? ['match', ['get', 'typeMilieu'], filters, false, true]
          : ['match', ['get', 'typeMilieu'], '', true, true]

        mapRef.current.setFilter('points-prelevement-milieux', filter)
      }
    }
  }, [filters, legend])

  return (
    <Box className='flex h-full w-full relative'>
      <div ref={mapContainerRef} className='flex h-full w-full' />

      <Paper
        elevation={2}
        sx={{
          position: 'absolute',
          top: 10,
          right: 10,
          padding: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 1
        }}
      >
        <Select value={legend} variant='outlined' size='small' onChange={handleLegendChange}>
          <MenuItem value='milieux'>Types de milieu</MenuItem>
          <MenuItem value='usages'>Usages</MenuItem>
        </Select>
        <Legend
          legend={legend}
          activeFilters={filters}
          setFilters={handleFilters}
        />
      </Paper>
    </Box>
  )
}

export default Map
