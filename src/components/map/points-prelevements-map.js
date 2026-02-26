import {useEffect, useRef} from 'react'

import {fr} from '@codegouvfr/react-dsfr'
import {useIsDark} from '@codegouvfr/react-dsfr/useIsDark'
import {Box} from '@mui/system'
import maplibre from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

import photo from './styles/photo.json'
import planIGN from './styles/plan-ign.json'
import vectorIGN from './styles/vector-ign.json'
import vector from './styles/vector.json'

import {createPointPrelevementFeatures} from '@/lib/points-prelevement.js'

const stylesMap = {
  photo,
  'plan-ign': planIGN,
  vector,
  'vector-ign': vectorIGN
}

const PointsPrelevementsMap = ({pointsPrelevement, handleClick, style = 'vector', pointsStatus = {}}) => {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const {isDark} = useIsDark()

  useEffect(() => {
    if (!mapContainerRef.current || !pointsPrelevement?.length) {
      return
    }

    const pointsWithStatus = pointsPrelevement.map(p => ({
      ...p,
      status: pointsStatus[p.id] || 'unknown'
    }))

    // Compute center from coordinates
    const coords = pointsWithStatus.map(p => p.coordinates.coordinates)
    const lons = coords.map(c => c[0])
    const lats = coords.map(c => c[1])
    const center = [
      lons.reduce((sum, v) => sum + v, 0) / lons.length,
      lats.reduce((sum, v) => sum + v, 0) / lats.length
    ]

    const map = new maplibre.Map({
      container: mapContainerRef.current,
      style: stylesMap[style],
      center,
      attributionControl: {compact: true},
      zoom: 10
    })
    mapRef.current = map

    map.on('load', () => {
      const geojson = createPointPrelevementFeatures(pointsWithStatus)
      map.addSource('points-prelevement', {type: 'geojson', data: geojson})

      // Circle layer for points
      map.addLayer({
        id: 'points-prelevement-circles',
        type: 'circle',
        source: 'points-prelevement',
        paint: {
          'circle-radius': 10,
          'circle-color': [
            'case',
            ['==', ['get', 'status'], 'success'],
            fr.colors.getHex({isDark}).decisions.background.actionHigh.success.default,
            ['==', ['get', 'status'], 'warning'],
            fr.colors.getHex({isDark}).decisions.background.actionHigh.warning.default,
            ['==', ['get', 'status'], 'error'],
            fr.colors.getHex({isDark}).decisions.background.actionHigh.redMarianne.default,
            fr.colors.getHex({isDark}).decisions.background.actionHigh.success.default
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      })

      // Labels layer
      map.addLayer({
        id: 'points-prelevement-labels',
        type: 'symbol',
        source: 'points-prelevement',
        layout: {
          'text-field': ['concat', ['get', 'name']],
          'text-anchor': 'bottom',
          'text-offset': ['get', 'textOffset']
        },
        paint: {
          'text-halo-color': '#fff',
          'text-halo-width': 2,
          'text-color': '#000'
        }
      })

      // Popup on hover
      const popup = new maplibre.Popup({
        closeButton: false,
        closeOnClick: false
      })

      map.on('mouseenter', 'points-prelevement-circles', e => {
        const feature = e.features[0]
        const {coordinates} = feature.geometry
        map.getCanvas().style.cursor = feature.properties.status === 'unknown' ? '' : 'pointer'
        const text = feature.properties.status === 'unknown'
          ? 'Aucun prélèvement n’est disponible pour ce point'
          : feature.properties.name
        popup.setLngLat(coordinates).setText(text).addTo(map)
      })

      map.on('mouseleave', 'points-prelevement-circles', () => {
        map.getCanvas().style.cursor = ''
        popup.remove()
      })

      // Click handler to call prop
      map.on('click', 'points-prelevement-circles', e => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0]
          if (feature.properties.status !== 'unknown') {
            handleClick(feature.properties.id)
          }
        }
      })
    })

    return () => {
      map.remove()
    }
  }, [pointsPrelevement, handleClick, style, pointsStatus, isDark])

  return (
    <Box className='h-[300px] w-full relative'>
      <div ref={mapContainerRef} className='flex h-full w-full' />
    </Box>
  )
}

export default PointsPrelevementsMap
