'use client'

import {useEffect, useMemo, useState} from 'react'

import {
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useTheme
} from '@mui/material'

import {getPointsPrelevement} from '@/app/api/points-prelevement.js'
import SidePanelLayout from '@/components/layout/side-panel.js'
import LoadingOverlay from '@/components/loading-overlay.js'
import Map from '@/components/map/index.js'
import Legend from '@/components/map/legend.js'
import MapFilters from '@/components/map/map-filters.js'
import SidePanel from '@/components/map/point-side-panel.js'
import useEvent from '@/hook/use-event.js'
import {extractTypeMilieu, extractUsages} from '@/lib/points-prelevement.js'

const Page = () => {
  const theme = useTheme()
  // État pour les données
  const [points, setPoints] = useState([])
  const [loading, setLoading] = useState(true)

  // États locaux pour l'interface
  const [selectedPoint, setSelectedPoint] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [filters, setFilters] = useState({
    name: '',
    typeMilieu: '',
    usages: []
  })
  const [filteredPoints, setFilteredPoints] = useState([])
  const [style, setStyle] = useState('plan-ign')

  // Récupération des données côté client via l'API
  useEffect(() => {
    async function fetchPoints() {
      try {
        const points = await getPointsPrelevement()
        setPoints(points)
      } catch (error) {
        console.error('Erreur lors du chargement des points:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPoints()
  }, [])

  // Calculer les options pour les filtres dès que les données sont disponibles
  const {typeMilieuOptions, usagesOptions} = useMemo(() => {
    const typeMilieuOptions = points ? extractTypeMilieu(points) : []
    const usagesOptions = points ? extractUsages(points) : []

    return {typeMilieuOptions, usagesOptions}
  }, [points])

  // Gestion de la sélection d'un point sur la carte
  const handleSelectedPoint = useEvent(pointId => {
    // On recherche dans le state actuel
    const point = points.find(p => p.id_point === pointId)
    setSelectedPoint(point)
    setExpanded(true)
  })

  // Mise à jour des points filtrés en fonction des filtres
  useEffect(() => {
    const filtered = points.filter(point => {
      let matches = true

      if (filters.name) {
        matches &&= point.nom && point.nom.toLowerCase().includes(filters.name.toLowerCase())
      }

      if (filters.typeMilieu) {
        matches &&= point.typeMilieu === filters.typeMilieu
      }

      if (filters.usages && filters.usages.length > 0) {
        matches &&= filters.usages.some(usage => point.usages.includes(usage))
      }

      return matches
    })

    setFilteredPoints(filtered.map(point => point.id_point))
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
        {loading && <LoadingOverlay />}
        {/* Barre de filtres */}
        <MapFilters
          filters={filters}
          typeMilieuOptions={typeMilieuOptions}
          usagesOptions={usagesOptions}
          onFilterChange={setFilters}
          onClearFilters={() =>
            setFilters({name: '', typeMilieu: '', usages: []})}
        />
        {/* Composant de la carte interactive */}
        <Map
          points={points}
          filteredPoints={filteredPoints}
          selectedPoint={selectedPoint}
          handleSelectedPoint={handleSelectedPoint}
          style={style}
          setStyle={setStyle}
        />
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            backgroundColor: theme.palette.background.default,
            height: 70,
            width: 300
          }}
        >
          <FormControl
            sx={{
              m: 2,
              position: 'absolute',
              width: 270
            }}
            size='small'
          >
            <InputLabel>Style de la carte</InputLabel>
            <Select
              value={style}
              label='Style de la carte'
              onChange={e => setStyle(e.target.value)}
            >
              <MenuItem value='vector'>Plan OpenMapTiles</MenuItem>
              <MenuItem value='plan-ign'>Plan IGN</MenuItem>
              <MenuItem value='photo'>Photographie aérienne</MenuItem>
              <MenuItem value='vector-ign'>IGN vectoriel</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <Legend />
      </Box>
    </SidePanelLayout>
  )
}

export default Page
