'use client'

import {useEffect, useState} from 'react'

import {deburr, toLower} from 'lodash-es'

import {getDossiersByStatus} from '@/app/api/dossiers.js'
import DossierCard from '@/components/declarations/dossier/dossier-card.js'
import SimpleLoading from '@/components/ui/simple-loading.js'
import {getDossierURL} from '@/lib/urls.js'

const DossiersList = ({status, filters}) => {
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [dossiers, setDossiers] = useState([])
  const [filteredDossiers, setFilteredDossiers] = useState([])

  useEffect(() => {
    async function fetchDossiers() {
      setIsLoading(true)

      const dossiers = await getDossiersByStatus(status)
      setDossiers(dossiers)

      setIsLoading(false)
    }

    fetchDossiers()
  }, [status])

  useEffect(() => {
    let filtered = dossiers || []

    if (filters.numeroDossier) {
      filtered = filtered.filter(d =>
        d.number?.toString().includes(filters.numeroDossier)
      )
    }

    if (filters.declarant) {
      const searchTerm = toLower(deburr(filters.declarant || ''))

      filtered = filtered.filter(d => {
        const raisonSociale = d?.declarant?.raisonSociale
          ? toLower(deburr(d.declarant.raisonSociale))
          : ''
        const nomDemandeur = d?.demandeur?.nom
          ? toLower(deburr(d.demandeur.nom))
          : ''

        return raisonSociale.includes(searchTerm) || nomDemandeur.includes(searchTerm)
      })
    }

    if (filters.periode) {
      const monthMatch = filters.periode.match(/^month-(\d{4})-(\d{1,2})$/)
      if (monthMatch) {
        const year = Number.parseInt(monthMatch[1], 10)
        const month = Number.parseInt(monthMatch[2], 10) // 1-based month from value
        filtered = filtered.filter(d => {
          if (!d.dateDepot) {
            return false
          }

          const date = new Date(d.dateDepot)
          return date.getFullYear() === year && (date.getMonth() + 1) === month
        })
      }
    }

    if (filters.typePrelevement && filters.typePrelevement !== 'all') {
      filtered = filtered.filter(d => {
        if (filters.typePrelevement === 'aep-zre') {
          return d.typePrelevement === 'aep-zre'
        }

        if (filters.typePrelevement === 'camion-citerne') {
          return d.typePrelevement === 'camion-citerne'
        }

        if (filters.typePrelevement === 'icpe-hors-zre') {
          return d.typePrelevement === 'icpe-hors-zre'
        }

        if (filters.typePrelevement === 'autre') {
          return d.typePrelevement === 'autre'
        }

        return true
      })
    }

    setFilteredDossiers(filtered)
  }, [filters, dossiers])

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  if (isLoading) {
    return <SimpleLoading />
  }

  if (filteredDossiers.length === 0) {
    return <p><i>Aucun dossier ne correspond à ces paramètres</i></p>
  }

  return (
    <div>
      <div className='fr-p-1w text-right'>
        {filteredDossiers.length !== dossiers.length && (
          filteredDossiers.length === 1
            ? <i>1 dossier correspond à cette recherche</i>
            : <i>{`${filteredDossiers.length} dossiers correpondent à cette recherche`}</i>
        )}
      </div>
      {filteredDossiers?.map((d, idx) => (
        <DossierCard
          key={d._id}
          background={idx % 2 === 0 ? 'primary' : 'secondary'}
          className='fr-mb-2w'
          dossier={d}
          url={getDossierURL(d)}
        />
      ))}
    </div>
  )
}

export default DossiersList
