'use client'

import {useEffect, useRef} from 'react'

import {fr} from '@codegouvfr/react-dsfr'
import {Box} from '@mui/material'
import maplibre from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {createRoot} from 'react-dom/client'

import Popup from './popup.js'
import photo from './styles/photo.json'
import planIGN from './styles/plan-ign.json'
import vectorIGN from './styles/vector-ign.json'
import vector from './styles/vector.json'

import {
  computeBestPopupAnchor,
  createUsagePieChart,
  createPointPrelevementFeatures,
  createSVGDataURL
} from '@/lib/points-prelevement.js'

const SOURCE_ID = 'points-prelevement'
const stylesMap = {
  photo,
  'plan-ign': planIGN,
  vector,
  'vector-ign': vectorIGN
}

function updateHighlightedPoint(map, selectedPoint) {
  if (selectedPoint) {
    // Exclure le point sélectionné de la couche de labels standard
    if (map.getLayer('points-prelevement-nom')) {
      // On applique un filtre pour ne pas afficher le point avec l'id sélectionné
      map.setFilter('points-prelevement-nom', ['!=', 'id_point', selectedPoint.id_point])
    }

    // Ajouter (ou mettre à jour) la couche de mise en surbrillance pour le point sélectionné
    if (map.getLayer('selected-point-prelevement-nom')) {
      // Mettre à jour le filtre si la couche existe déjà
      map.setFilter('selected-point-prelevement-nom', ['==', 'id_point', selectedPoint.id_point])
    } else {
      map.addLayer({
        id: 'selected-point-prelevement-nom',
        type: 'symbol',
        source: SOURCE_ID, // La source doit contenir tous les points
        filter: ['==', 'id_point', selectedPoint.id_point],
        layout: {
          'text-field': ['get', 'nom'],
          'text-size': 20,
          'text-allow-overlap': true, // Pour qu'il soit toujours visible
          'text-anchor': 'bottom',
          'text-offset': ['get', 'textOffset']
        },
        paint: {
          'text-halo-color': fr.colors.getHex({isDark: true}).decisions.background.flat.blueFrance.default,
          'text-halo-width': 2,
          'text-color': '#fff'
        },
        // S'assurer que la couche est visible à tous les niveaux de zoom
        minzoom: 0,
        maxzoom: 24
      })
    }

    // Placer la couche de mise en surbrillance au-dessus des autres
    map.moveLayer('selected-point-prelevement-nom')
  } else {
    // Aucun point sélectionné : réinitialiser le filtre pour afficher tous les labels
    if (map.getLayer('points-prelevement-nom')) {
      map.setFilter('points-prelevement-nom', null)
    }

    // Supprimer la couche dédiée si elle existe
    if (map.getLayer('selected-point-prelevement-nom')) {
      map.removeLayer('selected-point-prelevement-nom')
    }
  }
}

function loadMap(map, points) {
  // --- Chargement de la source et du layer de texte ---
  const geojson = createPointPrelevementFeatures(points)
  if (map.getSource(SOURCE_ID)) {
    map.getSource(SOURCE_ID).setData(geojson)
  } else {
    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: geojson
    })
  }

  // --- Préparation des marqueurs sous forme de couche symbol ---
  // On enrichit chaque feature d'une propriété "icon" unique.
  const markersFeatures = geojson.features.map(feature => {
    const id = feature.properties.id_point
    feature.properties.icon = 'marker-' + id
    return feature
  })
  const markersGeoJSON = {
    type: 'FeatureCollection',
    features: markersFeatures
  }
  if (map.getSource('points-markers')) {
    map.getSource('points-markers').setData(markersGeoJSON)
  } else {
    map.addSource('points-markers', {
      type: 'geojson',
      data: markersGeoJSON
    })
  }

  // Pour chaque feature, on ajoute l'image générée à partir du SVG si elle n'existe pas déjà.
  for (const feature of markersFeatures) {
    const markerId = feature.properties.icon
    if (!map.hasImage(markerId)) {
      const el = createUsagePieChart(feature.properties.usages)
      const dataURL = createSVGDataURL(el)
      const img = new Image()
      img.src = dataURL
      img.addEventListener('load', () => {
        if (!map.hasImage(markerId)) {
          map.addImage(markerId, img, {pixelRatio: window.devicePixelRatio})
        }
      })

      img.addEventListener('error', err => {
        console.error('Erreur lors du chargement de l\'image:', err)
      })
    }
  }

  if (!map.getLayer('markers-symbol')) {
    map.addLayer({
      id: 'markers-symbol',
      type: 'symbol',
      source: 'points-markers',
      layout: {
        'icon-image': ['get', 'icon'],
        'icon-size': 1,
        'icon-allow-overlap': true
      }
    })
  }

  if (!map.getLayer('points-prelevement-nom')) {
    map.addLayer({
      id: 'points-prelevement-nom',
      type: 'symbol',
      source: SOURCE_ID,
      layout: {
        'text-field': ['get', 'nom'],
        'text-anchor': 'bottom',
        'text-offset': ['get', 'textOffset']
      },
      paint: {
        'text-halo-color': '#fff',
        'text-halo-width': 2,
        'text-color': '#000'
      }
    })
  }
}

const Map = ({points, filteredPoints, selectedPoint, handleSelectedPoint, style}) => {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const popupRef = useRef(null)
  const currentStyleRef = useRef(style)

  // Stocke la valeur actuelle de "points" pour être accessible dans les callbacks
  const pointsRef = useRef(points)
  useEffect(() => {
    pointsRef.current = points
  }, [points])

  useEffect(() => {
    if (!mapContainerRef.current) {
      return
    }

    const map = new maplibre.Map({
      container: mapContainerRef.current,
      style: stylesMap[style],
      center: mapRef.current ? mapRef.current.getCenter() : [55.55, -21.13],
      zoom: mapRef.current ? mapRef.current.getZoom() : 10,
      hash: true,
      debug: true,
      attributionControl: {compact: true}
    })
    mapRef.current = map

    // Contrôle d'échelle
    const scale = new maplibre.ScaleControl({
      maxWidth: 80,
      unit: 'metric'
    })
    map.addControl(scale, 'bottom-right')

    // Popup réutilisable
    popupRef.current = new maplibre.Popup({
      closeButton: false,
      closeOnClick: false
    })

    // Définition des callbacks pour la couche "markers-symbol"
    const onMarkerMouseEnter = e => {
      map.getCanvas().style.cursor = 'pointer'
      if (e.features && e.features.length > 0) {
        const feature = e.features[0]
        const pointId = feature.properties.id_point
        const hoveredPoint = pointsRef.current.find(point => point.id_point === pointId)
        const popupContainer = document.createElement('div')
        const root = createRoot(popupContainer)
        root.render(<Popup point={hoveredPoint} />)
        if (popupRef.current) {
          popupRef.current.remove()
        }

        const coords = feature.geometry.coordinates
        const dynamicPopup = new maplibre.Popup({
          closeButton: false,
          closeOnClick: false,
          anchor: computeBestPopupAnchor(map, coords)
        })
          .setLngLat(coords)
          .setDOMContent(popupContainer)
          .addTo(map)
        popupRef.current = dynamicPopup
      }
    }

    const onMarkerMouseLeave = () => {
      map.getCanvas().style.cursor = ''
      if (popupRef.current) {
        popupRef.current.remove()
      }
    }

    const onMarkerClick = e => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0]
        handleSelectedPoint(feature.properties)
        if (popupRef.current) {
          popupRef.current.remove()
        }
      }
    }

    // Attache les événements une fois que la carte est chargée
    map.on('load', () => {
      map.on('mouseenter', 'markers-symbol', onMarkerMouseEnter)
      map.on('mouseleave', 'markers-symbol', onMarkerMouseLeave)
      map.on('click', 'markers-symbol', onMarkerClick)
    })

    return () => {
      map.remove()
    }
  }, [style, points, handleSelectedPoint])

  // Mise à jour des sources lorsque les points filtrés changent
  useEffect(() => {
    if (!mapRef.current) {
      return
    }

    const visiblePoints = points.filter(pt => filteredPoints.includes(pt.id_point))
    if (mapRef.current.getSource(SOURCE_ID)) {
      mapRef.current.getSource(SOURCE_ID).setData(createPointPrelevementFeatures(visiblePoints))
    }

    if (mapRef.current.getSource('points-markers')) {
      const baseGeojson = createPointPrelevementFeatures(visiblePoints)
      const markersFeatures = baseGeojson.features.map(feature => {
        const id = feature.properties.id_point
        feature.properties.icon = 'marker-' + id
        return feature
      })
      const markersGeoJSON = {
        type: 'FeatureCollection',
        features: markersFeatures
      }
      mapRef.current.getSource('points-markers').setData(markersGeoJSON)
    }
  }, [points, filteredPoints])

  // Mise à jour du style de la carte et chargement des données
  useEffect(() => {
    const map = mapRef.current

    if (map) {
      if (style !== currentStyleRef.current) {
        currentStyleRef.current = style
        map.setStyle(style)
      }

      map.on('load', () => {
        loadMap(map, points)
        updateHighlightedPoint(map, selectedPoint)
      })
    }
  }, [points, style, selectedPoint])

  useEffect(() => {
    const map = mapRef.current
    if (selectedPoint) {
      const coords
      = selectedPoint.coordinates
      || (selectedPoint.geom && selectedPoint.geom.coordinates)
      if (coords) {
        map.flyTo({
          center: coords,
          zoom: 14,
          speed: 1.2,
          curve: 1.42
        })
      }
    }

    if (map && map.getLayer('points-prelevement-nom')) {
      updateHighlightedPoint(map, selectedPoint)
    }
  }, [selectedPoint])

  return (
    <Box className='flex h-full w-full relative'>
      <div ref={mapContainerRef} className='flex h-full w-full' />
    </Box>
  )
}

export default Map
