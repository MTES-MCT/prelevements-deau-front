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

function updateHighlightedPoint(map, selectedPoint, showLabels = true) {
  if (selectedPoint && showLabels) {
    // Exclure le point sélectionné de la couche de labels standard
    if (map.getLayer('points-prelevement-nom')) {
      // On applique un filtre pour ne pas afficher le point avec l'id sélectionné
      map.setFilter('points-prelevement-nom', ['!=', 'id', selectedPoint.id])
    }

    // Ajouter (ou mettre à jour) la couche de mise en surbrillance pour le point sélectionné
    if (map.getLayer('selected-point-prelevement-nom')) {
      // Mettre à jour le filtre si la couche existe déjà
      map.setFilter('selected-point-prelevement-nom', ['==', 'id', selectedPoint.id])
    } else {
      map.addLayer({
        id: 'selected-point-prelevement-nom',
        type: 'symbol',
        source: SOURCE_ID, // La source doit contenir tous les points
        filter: ['==', 'id', selectedPoint.id],
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
    // Aucun point sélectionné ou labels désactivés : réinitialiser le filtre pour afficher tous les labels
    if (map.getLayer('points-prelevement-nom')) {
      map.setFilter('points-prelevement-nom', null)
    }

    // Supprimer la couche dédiée si elle existe
    if (map.getLayer('selected-point-prelevement-nom')) {
      map.removeLayer('selected-point-prelevement-nom')
    }
  }
}

function loadMap(map, points, showLabels = true) {
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
    const {id} = feature.properties
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
      const el = createUsagePieChart(feature.properties.usages || [])
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

  if (map.getLayer('points-prelevement-nom')) {
    // Update visibility if layer already exists
    map.setLayoutProperty('points-prelevement-nom', 'visibility', showLabels ? 'visible' : 'none')
  } else {
    map.addLayer({
      id: 'points-prelevement-nom',
      type: 'symbol',
      source: SOURCE_ID,
      layout: {
        'text-field': ['get', 'nom'],
        'text-anchor': 'bottom',
        'text-offset': ['get', 'textOffset'],
        visibility: showLabels ? 'visible' : 'none'
      },
      paint: {
        'text-halo-color': '#fff',
        'text-halo-width': 2,
        'text-color': '#000'
      }
    })
  }
}

const Map = ({points, filteredPoints, selectedPoint, handleSelectedPoint, mapStyle = 'plan-ign', showLabels = true, options = {}}) => {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const popupRef = useRef(null)
  const currentStyleRef = useRef(mapStyle)

  // Stocke la valeur actuelle de "points" pour être accessible dans les callbacks
  const pointsRef = useRef(points)
  useEffect(() => {
    pointsRef.current = points
  }, [points])

  useEffect(() => {
    if (!mapContainerRef.current) {
      return
    }

    // Calculate initial center and zoom based on points to avoid visible transitions
    const mapConfig = {
      container: mapContainerRef.current,
      style: stylesMap[mapStyle],
      center: [2.5, 46.5],
      zoom: 5,
      hash: options.hash ?? false,
      cooperativeGestures: options.cooperativeGestures ?? true,
      locale: {
        'CooperativeGesturesHandler.WindowsHelpText': 'Utilisez Ctrl + molette pour zoomer sur la carte',
        'CooperativeGesturesHandler.MacHelpText': 'Utilisez ⌘ + molette pour zoomer sur la carte',
        'CooperativeGesturesHandler.MobileHelpText': 'Utilisez deux doigts pour déplacer la carte'
      },
      attributionControl: {compact: true}
    }

    let boundsToFit = null
    let fitBoundsOptions = null

    if (points && points.length > 0) {
      const coordinates = points
        .map(point => point.coordinates?.coordinates)
        .filter(Boolean)

      if (coordinates.length === 1) {
        mapConfig.center = coordinates[0]
      } else if (coordinates.length > 1) {
        const bounds = new maplibre.LngLatBounds(coordinates[0], coordinates[1])
        for (const coord of coordinates) {
          bounds.extend(coord)
        }

        boundsToFit = bounds
        fitBoundsOptions = {
          padding: 80,
          duration: 0
        }
      }
    }

    const map = new maplibre.Map(mapConfig)
    mapRef.current = map

    // Apply bounds after map creation if needed
    if (boundsToFit) {
      map.fitBounds(boundsToFit, fitBoundsOptions)
    }

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
        const pointId = feature.properties.id
        const hoveredPoint = pointsRef.current.find(point => point.id === pointId)
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
      if (e.features && e.features.length > 0 && handleSelectedPoint) {
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
  }, [mapStyle, points, handleSelectedPoint, options.hash, options.cooperativeGestures])

  // Mise à jour des sources lorsque les points filtrés changent
  useEffect(() => {
    if (!mapRef.current) {
      return
    }

    const visiblePoints = points.filter(pt => filteredPoints.includes(pt.id))
    if (mapRef.current.getSource(SOURCE_ID)) {
      mapRef.current.getSource(SOURCE_ID).setData(createPointPrelevementFeatures(visiblePoints))
    }

    if (mapRef.current.getSource('points-markers')) {
      const baseGeojson = createPointPrelevementFeatures(visiblePoints)
      const markersFeatures = baseGeojson.features.map(feature => {
        const {id} = feature.properties
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
      if (mapStyle !== currentStyleRef.current) {
        currentStyleRef.current = mapStyle
        map.setStyle(stylesMap[mapStyle])
      }

      map.on('load', () => {
        loadMap(map, points, showLabels)
        updateHighlightedPoint(map, selectedPoint, showLabels)
      })
    }
  }, [points, mapStyle, selectedPoint, showLabels])

  useEffect(() => {
    const map = mapRef.current
    if (selectedPoint) {
      const coords = selectedPoint.coordinates.coordinates
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
      updateHighlightedPoint(map, selectedPoint, showLabels)
    }
  }, [selectedPoint, showLabels])

  // Update labels visibility when showLabels changes
  useEffect(() => {
    const map = mapRef.current
    if (map && map.getLayer('points-prelevement-nom')) {
      map.setLayoutProperty('points-prelevement-nom', 'visibility', showLabels ? 'visible' : 'none')
    }

    // Also update the highlighted point layer
    if (map) {
      updateHighlightedPoint(map, selectedPoint, showLabels)
    }
  }, [showLabels, selectedPoint])

  return (
    <Box className='flex h-full w-full relative'>
      <div ref={mapContainerRef} className='flex h-full w-full' />
    </Box>
  )
}

export default Map
