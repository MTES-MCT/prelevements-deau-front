'use client'

import {
  useCallback, useEffect, useMemo, useState
} from 'react'

import ToggleSwitch from '@codegouvfr/react-dsfr/ToggleSwitch.js'
import {
  Box
} from '@mui/material'
import {deburr} from 'lodash-es'

import {getPointsPrelevement} from '@/app/api/points-prelevement.js'
import MapFilters from '@/components/map/map-filters.js'
import PointsList from '@/components/map/points-list.js'
import {RichMap} from '@/components/map/rich-map.js'
import EntityHeader from '@/components/ui/EntityHeader/index.js'
import LoadingOverlay from '@/components/ui/LoadingOverlay/index.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {
  extractStatus,
  extractTypeMilieu,
  extractUsages,
  extractCommunes
} from '@/lib/points-prelevement.js'

const ViewMode = {
  MAP: 'map',
  LIST: 'list'
}

const Page = () => {
  // État pour les données
  const [points, setPoints] = useState([])
  const [loading, setLoading] = useState(true)

  // États locaux pour l'interface
  const [viewMode, setViewMode] = useState(ViewMode.MAP)
  const [filters, setFilters] = useState({
    name: '',
    typeMilieu: '',
    status: '',
    communes: [],
    usages: []
  })
  const filteredPoints = useMemo(() => {
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

    return filtered.map(point => point.id_point)
  }, [filters, points])

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

  const handleFilter = useCallback(newFilters => {
    setFilters(prevFilters => ({...prevFilters, ...newFilters}))
  }, [])

  return (
    <>
      <StartDsfrOnHydration />

      <Box className='flex flex-col fr-container h-full w-full'>
        <EntityHeader title='Points de prélèvement' hrefButtons={[{
          label: 'Création d\'un point de prélèvement',
          icon: 'fr-icon-add-line',
          alt: 'Création d\'un point de prélèvement',
          href: '/points-prelevement/new'
        }]}
        >
          <nav className='flex border p-4 gap-4 justify-between items-center'>
            <MapFilters
              filters={filters}
              typeMilieuOptions={typeMilieuOptions}
              usagesOptions={usagesOptions}
              statusOptions={statusOptions}
              communesOptions={communesOptions}
              onFilterChange={handleFilter}
            />
            <div>
              <ToggleSwitch
                showCheckedHint={false}
                label='Afficher vue liste'
                checked={viewMode === ViewMode.LIST}
                onChange={() => setViewMode(prevState => prevState === ViewMode.MAP ? ViewMode.LIST : ViewMode.MAP)} />
            </div>
          </nav>

          {
            viewMode === ViewMode.MAP
              ? <Box className='relative flex w-full h-[550px] mt-2'>
                {loading && <LoadingOverlay />}

                <RichMap points={points} filteredPoints={filteredPoints} />
              </Box>
              : <PointsList isLoading={loading} points={points.filter(pt => filteredPoints.includes(pt.id_point))} />
          }
        </EntityHeader>
      </Box>
    </>
  )
}

export default Page
