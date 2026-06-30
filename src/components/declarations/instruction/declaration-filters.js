'use client'

import {useEffect, useMemo, useState} from 'react'

import {Button} from '@codegouvfr/react-dsfr/Button'
import {debounce} from 'lodash-es'

function withoutEmptyValues(values) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value)
  )
}

const DeclarationFilters = ({filters, setFilters}) => {
  const [declarantValue, setDeclarantValue] = useState(filters.declarant || '')
  const [dossierNumberValue, setDossierNumberValue] = useState(filters.dossierNumber || '')

  const debouncedSetTextFilter = useMemo(
    () => debounce((name, value) => {
      setFilters(previous => ({
        ...previous,
        [name]: value || undefined,
        page: undefined
      }))
    }, 300),
    [setFilters]
  )

  useEffect(() => {
    setDeclarantValue(filters.declarant || '')
    setDossierNumberValue(filters.dossierNumber || '')
  }, [filters.declarant, filters.dossierNumber])

  useEffect(() => () => {
    debouncedSetTextFilter.cancel()
  }, [debouncedSetTextFilter])

  const updateDateFilter = (name, value) => {
    setFilters(previous => ({
      ...previous,
      [name]: value || undefined,
      page: undefined
    }))
  }

  const resetFilters = () => {
    debouncedSetTextFilter.cancel()
    setDeclarantValue('')
    setDossierNumberValue('')
    setFilters(previous => withoutEmptyValues({pageSize: previous.pageSize}))
  }

  const hasActiveFilters = Boolean(
    filters.declarant
    || filters.dossierNumber
    || filters.startDate
    || filters.endDate
  )

  return (
    <section className='fr-mb-3w border border-gray-200 bg-white px-4 py-3' aria-label='Filtres des déclarations'>
      <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
        <h2 className='fr-h6 fr-mb-0'>Filtres</h2>

        <Button
          disabled={!hasActiveFilters}
          priority='tertiary no outline'
          size='small'
          iconId='fr-icon-refresh-line'
          onClick={resetFilters}
        >
          Réinitialiser
        </Button>
      </div>

      <div className='grid grid-cols-1 gap-x-4 gap-y-3 lg:grid-cols-[minmax(12rem,1fr)_minmax(10rem,.75fr)_minmax(25rem,1.25fr)] lg:items-end'>
        <div className='fr-input-group fr-mb-0 min-w-0'>
          <label className='fr-label min-h-6' htmlFor='declarations-declarant-filter'>Déclarant</label>
          <input
            className='fr-input'
            id='declarations-declarant-filter'
            type='search'
            value={declarantValue}
            onChange={event => {
              const {value} = event.target
              setDeclarantValue(value)
              debouncedSetTextFilter('declarant', value.trim())
            }}
          />
        </div>

        <div className='fr-input-group fr-mb-0 min-w-0'>
          <label className='fr-label min-h-6' htmlFor='declarations-number-filter'>Numéro</label>
          <input
            className='fr-input'
            id='declarations-number-filter'
            inputMode='numeric'
            value={dossierNumberValue}
            onChange={event => {
              const {value} = event.target
              setDossierNumberValue(value)
              debouncedSetTextFilter('dossierNumber', value.trim())
            }}
          />
        </div>

        <fieldset className='min-w-0'>
          <legend className='fr-label fr-mb-1w min-h-6'>Période concernée</legend>
          <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
            <div className='flex min-w-0 items-center gap-2'>
              <label className='fr-label fr-mb-0 w-8 shrink-0 text-right text-sm' htmlFor='declarations-start-date'>Du</label>
              <input
                className='fr-input'
                id='declarations-start-date'
                type='date'
                value={filters.startDate || ''}
                onChange={event => updateDateFilter('startDate', event.target.value)}
              />
            </div>
            <div className='flex min-w-0 items-center gap-2'>
              <label className='fr-label fr-mb-0 w-8 shrink-0 text-right text-sm' htmlFor='declarations-end-date'>Au</label>
              <input
                className='fr-input'
                id='declarations-end-date'
                min={filters.startDate || undefined}
                type='date'
                value={filters.endDate || ''}
                onChange={event => updateDateFilter('endDate', event.target.value)}
              />
            </div>
          </div>
        </fieldset>
      </div>
    </section>
  )
}

export default DeclarationFilters
