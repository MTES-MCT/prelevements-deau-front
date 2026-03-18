'use client'

import {useEffect, useMemo, useState} from 'react'

import {deburr, toLower} from 'lodash-es'

import DeclarationItemCard from '@/components/declarations/instruction/declaration-item-card.js'
import SimpleLoading from '@/components/ui/SimpleLoading/index.js'
import {getSourcePeriod, getSourcePeriodLabel} from '@/lib/declaration.js'
import {getDeclarationURL} from '@/lib/urls.js'
import {getMySourcesAction} from '@/server/actions/sources.js'

const tabStatusMap = {
  'a-traiter': ['TO_INSTRUCT', 'INSTRUCTION_IN_PROGRESS'],
  traites: ['VALIDATED', 'REJECTED', 'PARTIALLY_VALIDATED']
}

const DeclarationList = ({status, filters, onAvailablePeriodsChange}) => {
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [sources, setSources] = useState()
  const [filteredSources, setFilteredSources] = useState([])

  useEffect(() => {
    async function fetchSources() {
      setIsLoading(true)

      const result = await getMySourcesAction({statuses: tabStatusMap[status] || []})
      if (result.success) {
        setSources(result.data.data)
      }

      setIsLoading(false)
    }

    fetchSources()
  }, [status])

  useEffect(() => {
    let filtered = sources || []

    if (filters.dossierNumber) {
      filtered = filtered.filter(d =>
        d?.declaration?.code?.toString().includes(filters.dossierNumber)
      )
    }

    if (filters.declarant) {
      const searchTerm = toLower(deburr(filters.declarant || ''))
      filtered = filtered.filter(d => {
        const raisonSociale = d?.declaration?.declarant?.socialReason
          ? toLower(deburr(d.declaration?.declarant.socialReason))
          : ''
        const lastName = d?.declaration?.declarant?.user?.lastName
          ? toLower(deburr(d.declaration?.declarant.user.lastName))
          : ''

        const firstName = d?.declaration?.declarant?.user?.firstName
          ? toLower(deburr(d.declaration?.declarant.user.firstName))
          : ''

        return raisonSociale.includes(searchTerm) || lastName.includes(searchTerm) || firstName.includes(searchTerm)
      })
    }

    if (filters.periode && filters.periode !== 'all') {
      filtered = filtered.filter(s => {
        const label = getSourcePeriodLabel(s) ?? 'Non renseignée'
        return label === filters.periode
      })
    }

    setFilteredSources(filtered)
  }, [filters, sources])

  const periodOptions = useMemo(() => {
    if (!Array.isArray(sources) || sources.length === 0) {
      return [{value: 'all', label: 'Tout'}]
    }

    const results = []
    const periods = new Set()

    for (const source of sources) {
      const {declaration} = source
      const label = getSourcePeriodLabel(source) ?? 'Non renseignée'
      if (periods.has(label)) {
        continue
      }

      periods.add(label)
      const {start, end} = getSourcePeriod(declaration)
      const sortKey = start?.getTime() ?? end?.getTime() ?? Number.POSITIVE_INFINITY
      results.push({value: label, label, sortKey})
    }

    results.sort((a, b) => a.sortKey - b.sortKey)
    return [{value: 'all', label: 'Tout'}, ...results.map(({value, label}) => ({value, label}))]
  }, [sources])

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

  if (filteredSources.length === 0) {
    return <p><i>Aucune déclaration ne correspond à ces paramètres</i></p>
  }

  return (
    <div>
      <div className='fr-p-1w text-right'>
        {filteredSources.length !== sources.length && (
          filteredSources.length === 1
            ? <i>1 déclaration correspond à cette recherche</i>
            : <i>{`${filteredSources.length} déclarations correspondent à cette recherche`}</i>
        )}
      </div>
      {filteredSources?.map((s, idx) => (
        <DeclarationItemCard
          key={s.id}
          background={idx % 2 === 0 ? 'primary' : 'secondary'}
          className='fr-mb-2w'
          source={s}
          url={getDeclarationURL(s.id)}
        />
      ))}
    </div>
  )
}

export default DeclarationList
