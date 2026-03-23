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
import {useRouter, useSearchParams} from 'next/navigation'

import SidePanelLayout from '@/components/layout/side-panel.js'
import Map from '@/components/map/index.js'
import Legend from '@/components/map/legend.js'
import PointsListHeader from '@/components/map/points-list-header.js'
import PointsList from '@/components/map/points-list.js'
import LoadingOverlay from '@/components/ui/LoadingOverlay/index.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import useEvent from '@/hook/use-event.js'
import {downloadCsv} from '@/lib/export-csv.js'
import {
  extractStatus,
  extractWaterBodyType,
  extractUsages
} from '@/lib/points-prelevement.js'
import {getPointPrelevementURL} from '@/lib/urls.js'
import {getPointsPrelevementAction} from '@/server/actions/points-prelevement.js'

const Page = () => {
  const theme = useTheme()
  const searchParams = useSearchParams()
  const router = useRouter()
  const selectedPointId = searchParams.get('point-prelevement')
  // État pour les données
  const [points, setPoints] = useState([])
  const [loading, setLoading] = useState(true)

  // États locaux pour l'interface
  const [expanded, setExpanded] = useState(false)
  const [filters, setFilters] = useState({
    name: '',
    typeMilieu: '',
    status: '',
    usages: []
  })
  const [filteredPoints, setFilteredPoints] = useState([])
  const [style, setStyle] = useState('plan-ign')

  // Récupération des données côté client via l'API
  useEffect(() => {
    async function fetchPoints() {
      try {
        const result = await getPointsPrelevementAction()
        if (result.success) {
          setPoints(result.data)
        }
      } catch (error) {
        console.error('Erreur lors du chargement des points:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPoints()
  }, [])

  // Calculer les options pour les filtres dès que les données sont disponibles
  const {waterBodyTypeOptions, usagesOptions, statusOptions} = useMemo(() => {
    const waterBodyTypeOptions = points ? extractWaterBodyType(points) : []
    const usagesOptions = points ? extractUsages(points) : []
    const statusOptions = points ? extractStatus(points) : []

    return {
      waterBodyTypeOptions,
      usagesOptions,
      statusOptions
    }
  }, [points])

  // Gestion de la sélection d'un point sur la carte
  const handleSelectedPoint = useEvent(point => {
    router.push(getPointPrelevementURL(point))
  })

  const handleFilter = useCallback(newFilters => {
    setFilters(prevFilters => ({...prevFilters, ...newFilters}))
  }, [])

  // Mise à jour des points filtrés en fonction des filtres
  useEffect(() => {
    const filtered = points.filter(point => {
      let matches = true

      if (filters.name) {
        // Normalisation de la chaîne de recherche
        const normalizedSearch = deburr(filters.name.toLowerCase().trim())

        // Normalisation des valeurs à comparer
        const normalizedName = point.name ? deburr(point.name.toLowerCase().trim()) : ''
        const idPointStr = String(point.id).toLowerCase()
        const preleveurMatches = point.preleveurs.some(preleveur => {
          const normalizedSocialReason = preleveur?.declarant?.socialReason ? deburr(preleveur?.declarant?.socialReason?.toLowerCase().trim()) : ''
          const normalizedLastName = preleveur.lastName ? deburr(preleveur.lastName.toLowerCase().trim()) : ''
          const normalizedFirstName = preleveur.firstName ? deburr(preleveur.firstName.toLowerCase().trim()) : ''

          return (
            normalizedSocialReason.includes(normalizedSearch)
              || normalizedLastName.includes(normalizedSearch)
              || normalizedFirstName.includes(normalizedSearch)
          )
        })

        matches &&= normalizedName.includes(normalizedSearch)
          || idPointStr.includes(normalizedSearch)
          || preleveurMatches
      }

      if (filters.waterBodyType) {
        matches &&= point.waterBodyType === filters.waterBodyType
      }

      if (filters.usages && filters.usages.length > 0) {
        matches &&= filters.usages.some(usage => point.usages.includes(usage))
      }

      if (filters.status) {
        matches &&= point.exploitationsStatus === filters.status
      }

      return matches
    })

    setFilteredPoints(filtered.map(point => point.id))
  }, [filters, points])

  const exportPointsList = () => {
    const result = points
      .filter(p => filteredPoints.includes(p.id))
      .map(p => ({
        id: p.id,
        name: p.name,
        waterBodyType: p.waterBodyType
      }))

    downloadCsv(result, 'points-prelevements-export.csv')
  }

  return (
    <>
      <StartDsfrOnHydration />

      <SidePanelLayout
        header={
          <PointsListHeader
            resultsCount={loading ? null : filteredPoints.length}
            filters={filters}
            typeMilieuOptions={waterBodyTypeOptions}
            usagesOptions={usagesOptions}
            statusOptions={statusOptions}
            exportList={exportPointsList}
            onFilter={handleFilter}
          />
        }
        isOpen={expanded}
        handleOpen={setExpanded}
        panelContent={
          <PointsList
            isLoading={loading}
            points={points.filter(pt => filteredPoints.includes(pt.id))}
          />
        }
      >
        <Box className='flex h-full flex-col relative'>
          {loading && <LoadingOverlay />}

          {/* Composant de la carte interactive */}
          <Map
            points={points}
            filteredPoints={filteredPoints}
            selectedPoint={selectedPointId ? points.find(point => selectedPointId === point.id) : null}
            handleSelectedPoint={handleSelectedPoint}
            mapStyle={style}
            options={{hash: true, cooperativeGestures: false}}
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
                variant='filled'
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
    </>
  )
}

export default Page
