import {useEffect, useRef} from 'react'

import * as maplibre from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

import {createMap} from './create-map.js'

// An offline fixture exercises the real MapLibre module worker and WebGL 2.
// No remote tiles, real point data or authenticated API are involved.
const MapCompatibility = () => {
  const containerRef = useRef(null)
  useEffect(() => {
    const map = createMap(maplibre, {
      container: containerRef.current,
      center: [2.35, 48.85],
      zoom: 10,
      attributionControl: false,
      style: {
        version: 8,
        sources: {
          fixture: {
            type: 'geojson',
            data: {
              type: 'FeatureCollection', features: [{
                type: 'Feature',
                properties: {name: 'Point de démonstration'},
                geometry: {type: 'Point', coordinates: [2.35, 48.85]}
              }]
            }
          }
        },
        layers: [
          {id: 'background', type: 'background', paint: {'background-color': '#f6f6f6'}},
          {
            id: 'points', type: 'circle', source: 'fixture', paint: {'circle-color': '#000091', 'circle-radius': 10}
          }
        ]
      }
    })
    if (!map) {
      return
    }

    const container = containerRef.current
    map.on('idle', () => {
      const features = map.queryRenderedFeatures({layers: ['points']})
      container.dataset.mapReady = features.length > 0 ? 'true' : 'false'
    })
    return () => map.remove()
  }, [])

  return <div ref={containerRef} aria-label='Carte de démonstration' role='region' style={{width: '100%', height: 320}} />
}

const metadata = {title: 'Cartes/Compatibilité', component: MapCompatibility}
export default metadata
export const GeoJSON = {}
