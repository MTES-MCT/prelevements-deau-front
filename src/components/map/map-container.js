'use client'

import {useCallback, useEffect, useState} from 'react'

import {Box} from '@mui/material'

import Map from './index.js'

import SidePanelLayout from '@/components/layout/side-panel.js'
import MapFilters from '@/components/map/map-filters.js'
import SidePanel from '@/components/map/point-side-panel.js'

const Layout = ({points, usagesOptions, typeMilieuOptions}) => {
  // État pour le point sélectionné
  const [selectedPoint, setSelectedPoint] = useState(null)
  // État qui gère si le panneau latéral est "déplié"
  const [expanded, setExpanded] = useState(false)
  // État des filtres
  const [filters, setFilters] = useState({
    name: '',
    typeMilieu: '',
    usages: []
  })
  const [filteredPoints, setFilteredPoints] = useState([...points])

  // Sélection d’un point sur la carte => on déplie éventuellement le panneau latéral
  const handleSelectedPoint = useCallback(pointId => {
    const selectedPoint = points.find(point => point.id_point === pointId)
    setSelectedPoint(selectedPoint)
    setExpanded(true)
  }, [points])

  // Fonction pour effacer tous les filtres
  const handleClearFilters = () => {
    setFilters({
      name: '',
      typeMilieu: '',
      usages: []
    })
  }

  useEffect(() => {
    // Filtrage des points en fonction des filtres sélectionnés
    const filteredPoints = points.filter(point => {
      let matches = true
      if (filters.name) {
        matches
        &&= point.nom
        && point.nom.toLowerCase().includes(filters.name.toLowerCase())
      }

      if (filters.typeMilieu) {
        matches &&= point.typeMilieu === filters.typeMilieu
      }

      if (filters.usages && filters.usages.length > 0) {
      // Supposons que la propriété "usage" de chaque point est une chaîne
        matches &&= filters.usages.some(usage => point.usages.includes(usage))
      }

      return matches
    })

    setFilteredPoints(filteredPoints.map(point => point.id_point))
  }, [filters, points])

  return (
    <SidePanelLayout
      title={
        selectedPoint
          ? selectedPoint.nom || 'Pas de nom renseigné'
          : 'Aucun point sélectionné'
      }
      isOpen={expanded}
      handleOpen={setExpanded}
      panelContent={<SidePanel point={selectedPoint} />}
    >
      <Box className='flex h-full flex-col relative'>
        {/* Affichage de la barre de filtres en haut */}
        <MapFilters
          filters={filters}
          typeMilieuOptions={typeMilieuOptions}
          usagesOptions={usagesOptions}
          onFilterChange={setFilters}
          onClearFilters={handleClearFilters}
        />
        <Map
          points={points}
          filteredPoints={filteredPoints}
          selectedPoint={selectedPoint}
          handleSelectedPoint={handleSelectedPoint}
        />
      </Box>
    </SidePanelLayout>
  )
}

export default Layout
