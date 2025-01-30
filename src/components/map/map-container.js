'use client'

import {useCallback, useState} from 'react'

import Map from './index.js'

import SidePanelLayout from '@/components/layout/side-panel.js'
import SidePanel from '@/components/map/point-side-panel.js'

const Layout = ({points}) => {
  // État pour le point sélectionné
  const [selectedPoint, setSelectedPoint] = useState(null)
  // État qui gère si le panneau est "déplié" (true) ou "replié" (false)
  const [expanded, setExpanded] = useState(false)

  // Sélection d’un point sur la carte => on déplie éventuellement le panneau
  const handleSelectedPoint = useCallback(pointId => {
    const selectedPoint = points.find(point => point.id_point === pointId)
    setSelectedPoint(selectedPoint)
    setExpanded(true)
  }, [points])

  return (
    <SidePanelLayout
      title={selectedPoint ? selectedPoint.nom || 'Pas de nom renseigné' : 'Aucun point sélectionné'}
      isOpen={expanded}
      handleOpen={setExpanded}
      panelContent={<SidePanel point={selectedPoint} />}
    >
      <Map points={points} handleSelectedPoint={handleSelectedPoint} />
    </SidePanelLayout>
  )
}

export default Layout
