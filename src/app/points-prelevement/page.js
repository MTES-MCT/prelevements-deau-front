'use client'

import {
  useCallback, useEffect, useMemo, useState
} from 'react'

import {
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useTheme
} from '@mui/material'
import {deburr} from 'lodash-es'

import {getPointsPrelevement} from '@/app/api/points-prelevement.js'
import SidePanelLayout from '@/components/layout/side-panel.js'
import LoadingOverlay from '@/components/loading-overlay.js'
import Map from '@/components/map/index.js'
import Legend from '@/components/map/legend.js'
import PointHeader from '@/components/map/point-header.js'
import PointSidePanel from '@/components/map/point-side-panel.js'
import PointsListHeader from '@/components/map/points-list-header.js'
import PointsList from '@/components/map/points-list.js'
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

  const handleFilter = useCallback(newFilters => {
    setFilters(prevFilters => ({...prevFilters, ...newFilters}))
  }, [])

  // Mise à jour des points filtrés en fonction des filtres
  useEffect(() => {
    const filtered = points.filter(point => {
      let matches = true

      if (filters.name) {
        // Normalisation de la chaîne de recherche et du nom du point
        const normalizedSearch = deburr(filters.name.toLowerCase().trim())
        const normalizedName = point.nom ? deburr(point.nom.toLowerCase().trim()) : ''
        // Conversion de l'id_point en chaîne de caractères
        const idPointStr = String(point.id_point).toLowerCase()
        // Le matching est positif si le texte est inclus dans le nom ou dans l'id_point
        matches &&= normalizedName.includes(normalizedSearch) || idPointStr.includes(normalizedSearch)
      }

      if (filters.typeMilieu) {
        matches &&= point.type_milieu === filters.typeMilieu
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
      header={
        selectedPoint ? (
          <PointHeader
            point={selectedPoint}
            onClose={() => setSelectedPoint(null)}
          />
        ) : (
          <PointsListHeader
            resultsCount={loading ? null : filteredPoints.length}
            filters={filters}
            typeMilieuOptions={typeMilieuOptions}
            usagesOptions={usagesOptions}
            onFilter={handleFilter}
          />
        )
      }
      isOpen={expanded}
      handleOpen={setExpanded}
      panelContent={
        selectedPoint
          ? <PointSidePanel point={selectedPoint} />
          : (
            <PointsList
              isLoading={loading}
              points={points.filter(pt => filteredPoints.includes(pt.id_point))}
              onSelect={handleSelectedPoint}
            />
          )
      }
    >
      <Box className='flex h-full flex-col relative'>
        {loading && <LoadingOverlay />}

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
