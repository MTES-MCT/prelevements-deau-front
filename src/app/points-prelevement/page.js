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

import {getPointsPrelevement} from '@/app/api/points-prelevement.js'
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
  extractTypeMilieu,
  extractUsages,
  extractCommunes
} from '@/lib/points-prelevement.js'
import {getPointPrelevementURL} from '@/lib/urls.js'

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
    communes: [],
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
  const {typeMilieuOptions, usagesOptions, statusOptions, communesOptions} = useMemo(() => {
    const typeMilieuOptions = points ? extractTypeMilieu(points) : []
    const usagesOptions = points ? extractUsages(points) : []
    const statusOptions = points ? extractStatus(points) : []
    const communesOptions = points ? extractCommunes(points) : []

    return {
      typeMilieuOptions,
      usagesOptions,
      statusOptions,
      communesOptions
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
        const normalizedName = point.nom ? deburr(point.nom.toLowerCase().trim()) : ''
        const idPointStr = String(point.id_point).toLowerCase()
        const preleveurMatches = point.preleveurs.some(preleveur => {
          const normalizedRaisonSociale = preleveur.raison_sociale ? deburr(preleveur.raison_sociale.toLowerCase().trim()) : ''
          const normalizedSigle = preleveur.sigle ? deburr(preleveur.sigle.toLowerCase().trim()) : ''
          const normalizedNom = preleveur.nom ? deburr(preleveur.nom.toLowerCase().trim()) : ''
          const normalizedPrenom = preleveur.prenom ? deburr(preleveur.prenom.toLowerCase().trim()) : ''

          return (
            normalizedRaisonSociale.includes(normalizedSearch)
              || normalizedSigle.includes(normalizedSearch)
              || normalizedNom.includes(normalizedSearch)
              || normalizedPrenom.includes(normalizedSearch)
          )
        })

        matches &&= normalizedName.includes(normalizedSearch)
          || idPointStr.includes(normalizedSearch)
          || preleveurMatches
      }

      if (filters.typeMilieu) {
        matches &&= point.type_milieu === filters.typeMilieu
      }

      if (filters.status) {
        matches &&= point.exploitationsStatus === filters.status
      }

      if (filters.usages && filters.usages.length > 0) {
        matches &&= filters.usages.some(usage => point.usages.includes(usage))
      }

      if (filters.communes && filters.communes.length > 0) {
        const communeStr = point.commune && point.commune.nom && point.commune.code
          ? `${point.commune.nom} - ${point.commune.code}`
          : null
        matches &&= communeStr ? filters.communes.includes(communeStr) : false
      }

      return matches
    })

    setFilteredPoints(filtered.map(point => point.id_point))
  }, [filters, points])

  const exportPointsList = () => {
    const result = points.filter(p => filteredPoints.includes(p.id_point))

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
            typeMilieuOptions={typeMilieuOptions}
            usagesOptions={usagesOptions}
            statusOptions={statusOptions}
            communesOptions={communesOptions}
            exportList={exportPointsList}
            onFilter={handleFilter}
          />
        }
        isOpen={expanded}
        handleOpen={setExpanded}
        panelContent={
          <PointsList
            isLoading={loading}
            points={points.filter(pt => filteredPoints.includes(pt.id_point))}
          />
        }
      >
        <Box className='flex h-full flex-col relative'>
          {loading && <LoadingOverlay />}

          {/* Composant de la carte interactive */}
          <Map
            points={points}
            filteredPoints={filteredPoints}
            selectedPoint={selectedPointId ? points.find(point => selectedPointId === point.id_point) : null}
            handleSelectedPoint={handleSelectedPoint}
            mapStyle={style}
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
    </>
  )
}

export default Page
