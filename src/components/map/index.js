'use client'

import {useEffect, useRef} from 'react'

import maplibre from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {createRoot} from 'react-dom/client'

import Popup from './popup.js'
import vector from './styles/vector.json'

const Map = ({points, handleSelectedPoint}) => {
  const mapContainerRef = useRef(null)

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

    map.on('load', () => {
      map.addSource('points-prelevement', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: points.map(point => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: point.position.coordinates
            },
            id: point.id_point,
            properties: {
              id: point.id_point,
              nom: point.nom,
              coursEau: point.cours_eau,
              codeMeso: point.code_meso,
              inseeCom: point.insee_com,
              precision: point.precision_geom,
              autresNoms: point.autres_noms,
              codeAiot: point.code_aiot,
              codeBdlisa: point.code_bdlisa,
              codeBnpe: point.code_bnpe,
              codeBvBdcarthage: point.code_bv_bdcarthage,
              codeMeContinentalesBv: point.code_me_continentales_bv,
              detailLocalisation: point.detail_localisation,
              profondeur: point.profondeur,
              remarque: point.remarque,
              reservoirBiologique: point.reservoir_biologique,
              typeMilieu: point.type_milieu,
              zre: point.zre
            }
          }))
        }
      })

      map.addLayer({
        id: 'points-prelevement',
        type: 'circle',
        source: 'points-prelevement',
        paint: {
          'circle-color': 'deepskyblue',
          'circle-radius': 5,
          'circle-stroke-width': 1,
          'circle-stroke-color': 'black'
        }
      })
    })

    const mapPopup = new maplibre.Popup({
      closeButton: false,
      closeOnClick: false
    })

    map.on('mouseenter', 'points-prelevement', e => {
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

    map.on('mouseleave', 'points-prelevement', () => {
      map.getCanvas().style.cursor = ''
      mapPopup.remove()
    })

    map.on('click', 'points-prelevement', e => {
      const {properties} = e.features[0]

      handleSelectedPoint(properties)
    })

    return () => map && map.remove()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={mapContainerRef}
      style={{
        height: '100%',
        width: '60%',
        position: 'relative',
        color: 'black'
      }}
    />
  )
}

export default Map
