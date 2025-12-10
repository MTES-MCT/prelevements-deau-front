'use client'

import {useEffect, useMemo, useState} from 'react'

import {deburr, toLower} from 'lodash-es'

import DossierCard from '@/components/declarations/dossier/dossier-card.js'
import SimpleLoading from '@/components/ui/SimpleLoading/index.js'
import {getDossierPeriod, getDossierPeriodLabel} from '@/lib/dossier.js'
import {getDossierURL} from '@/lib/urls.js'
import {getDossiersByStatusAction} from '@/server/actions/dossiers.js'

const DossiersList = ({status, filters, onAvailablePeriodsChange}) => {
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [dossiers, setDossiers] = useState()
  const [filteredDossiers, setFilteredDossiers] = useState([])

  useEffect(() => {
    async function fetchDossiers() {
      setIsLoading(true)

      const result = await getDossiersByStatusAction(status)
      if (result.success) {
        setDossiers(result.data)
      }

      setIsLoading(false)
    }

    fetchDossiers()
  }, [status])

  useEffect(() => {
    let filtered = dossiers || []

    if (filters.dossierNumber) {
      filtered = filtered.filter(d =>
        d.ds.dossierNumber?.toString().includes(filters.dossierNumber)
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

    if (filters.periode && filters.periode !== 'all') {
      filtered = filtered.filter(d => {
        const label = getDossierPeriodLabel(d) ?? 'Non renseignée'
        return label === filters.periode
      })
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

  const periodOptions = useMemo(() => {
    if (!Array.isArray(dossiers) || dossiers.length === 0) {
      return [{value: 'all', label: 'Tout'}]
    }

    const results = []
    const periods = new Set()

    for (const dossier of dossiers) {
      const label = getDossierPeriodLabel(dossier) ?? 'Non renseignée'
      if (periods.has(label)) {
        continue
      }

      periods.add(label)
      const {start, end} = getDossierPeriod(dossier)
      const sortKey = start?.getTime() ?? end?.getTime() ?? Number.POSITIVE_INFINITY
      results.push({value: label, label, sortKey})
    }

    results.sort((a, b) => a.sortKey - b.sortKey)
    return [{value: 'all', label: 'Tout'}, ...results.map(({value, label}) => ({value, label}))]
  }, [dossiers])

  useEffect(() => {
    if (onAvailablePeriodsChange) {
      onAvailablePeriodsChange(periodOptions)
    }
  }, [onAvailablePeriodsChange, periodOptions])

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
            : <i>{`${filteredDossiers.length} dossiers correspondent à cette recherche`}</i>
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
