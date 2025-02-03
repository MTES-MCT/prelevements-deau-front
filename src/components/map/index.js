'use client'

import {useCallback, useEffect, useRef} from 'react'

import {fr} from '@codegouvfr/react-dsfr'
import {Box} from '@mui/material'
import maplibre from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {createRoot} from 'react-dom/client'

import Popup from './popup.js'
import vector from './styles/vector.json'

import {
  eauSouterraine,
  eauSurface,
  createDonutChart,
  createUsagePieChart,
  createPointPrelevementFeatures
} from '@/lib/point-prelevements-map.js'

const SOURCE_ID = 'points-prelevement'

const Map = ({points, selectedPoint, handleSelectedPoint}) => {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const popupRef = useRef(null)

  /**
   * Cache des markers :
   *  - clé : id unique (cluster_id ou id_point)
   *  - valeur : instance de maplibre.Marker
   */
  const markersCacheRef = useRef({})
  /** Markers actuellement ajoutés sur la carte */
  const markersOnScreenRef = useRef({})

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

    // Création d'une instance de popup réutilisable
    popupRef.current = new maplibre.Popup({
      closeButton: false,
      closeOnClick: false
    })

    const scale = new maplibre.ScaleControl({
      maxWidth: 80,
      unit: 'metric'
    })
    map.addControl(scale)

    mapRef.current = map

    map.on('load', async () => {
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: createPointPrelevementFeatures(points),
        cluster: true,
        clusterRadius: 80,
        clusterProperties: {
          // Comptage pour chaque type d'environnement
          eauSurface: ['+', ['case', eauSurface, 1, 0]],
          eauSouterraine: ['+', ['case', eauSouterraine, 1, 0]]
        }
      })

      // Layer combiné affichant le nom et le typeMilieu (entre parenthèses sur deux lignes)
      map.addLayer({
        id: 'points-prelevement-nom',
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['!=', 'cluster', true],
        layout: {
          'text-field': [
            'concat',
            ['get', 'nom'],
            '\n(',
            ['get', 'typeMilieu'],
            ')'
          ],
          'text-anchor': 'bottom',
          'text-offset': ['get', 'textOffset']
        },
        paint: {
          'text-halo-color': '#fff',
          'text-halo-width': 2,
          'text-color': '#000'
        }
      })
    })

    // À chaque fois que la source GeoJSON est chargée, on met à jour les markers.
    map.on('data', e => {
      if (e.sourceId !== SOURCE_ID || !e.isSourceLoaded) {
        return
      }

      map.on('move', updateMarkers)
      map.on('moveend', updateMarkers)
      updateMarkers()
    })

    return () => {
      if (map) {
        map.remove()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateMarkers = useCallback(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) {
      return
    }

    const newMarkers = {}
    const features = map.querySourceFeatures(SOURCE_ID)

    for (const feature of features) {
      const coords = feature.geometry.coordinates
      const props = feature.properties
      const id = props.cluster ? props.cluster_id : props.id_point

      let marker = markersCacheRef.current[id]
      if (!marker) {
        const el = props.cluster
          ? createDonutChart(props)
          : createUsagePieChart(props)

        if (!props.cluster && !el.dataset.eventsAttached) {
          el.dataset.eventsAttached = 'true'
          el.addEventListener('mouseenter', () => {
            map.getCanvas().style.cursor = 'pointer'
            const popupContainer = document.createElement('div')
            const root = createRoot(popupContainer)
            const hoveredPoint = points.find(
              point => point.id_point === props.id_point
            )
            root.render(<Popup point={hoveredPoint} />)
            popupRef.current
              .setLngLat(coords)
              .setDOMContent(popupContainer)
              .addTo(map)
          })
          el.addEventListener('mouseleave', () => {
            map.getCanvas().style.cursor = ''
            popupRef.current.remove()
          })
          el.addEventListener('click', () => {
            handleSelectedPoint(props.id_point)
            popupRef.current.remove()
          })
        }

        markersCacheRef.current[id] = new maplibre.Marker({element: el}).setLngLat(coords)
        marker = markersCacheRef.current[id]
      }

      newMarkers[id] = marker

      if (!markersOnScreenRef.current[id]) {
        marker.addTo(map)
      }
    }

    // Retire de la carte les markers qui ne sont plus visibles.
    for (const id in markersOnScreenRef.current) {
      if (!newMarkers[id]) {
        markersOnScreenRef.current[id].remove()
      }
    }

    markersOnScreenRef.current = newMarkers
  }, [points, handleSelectedPoint])

  /**
   * À chaque changement de selectedPoint, on met à jour le style du layer
   * "points-prelevement-nom" pour mettre en évidence le point sélectionné.
   */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.getLayer('points-prelevement-nom')) {
      return
    }

    if (selectedPoint) {
      map.setLayoutProperty('points-prelevement-nom', 'text-size', 20)
      map.setPaintProperty(
        'points-prelevement-nom',
        'text-halo-color',
        [
          'case',
          ['==', ['get', 'id_point'], selectedPoint.id_point],
          fr.colors.getHex({isDark: true}).decisions.background.flat.blueFrance.default,
          '#fff'
        ]
      )
      map.setPaintProperty(
        'points-prelevement-nom',
        'text-color',
        [
          'case',
          ['==', ['get', 'id_point'], selectedPoint.id_point],
          '#fff',
          '#000'
        ]
      )
    } else {
      map.setLayoutProperty('points-prelevement-nom', 'text-size', 16)
      map.setPaintProperty('points-prelevement-nom', 'text-halo-color', '#fff')
      map.setPaintProperty('points-prelevement-nom', 'text-color', '#000')
    }
  }, [selectedPoint])

  return (
    <Box className='flex h-full w-full relative'>
      <div ref={mapContainerRef} className='flex h-full w-full' />
    </Box>
  )
}

export default Map
