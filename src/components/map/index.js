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

const Map = ({points, handleSelectedPoint}) => {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const [legend, setLegend] = useState('typesMilieu')
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

      handleSelectedPoint(properties.id_point)
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
          <MenuItem value='typesMilieu'>Types de milieu</MenuItem>
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
