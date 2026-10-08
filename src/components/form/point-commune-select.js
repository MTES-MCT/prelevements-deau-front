'use client'

import {useEffect, useState} from 'react'
import {Autocomplete, TextField} from '@mui/material'

import {searchCommunesAction} from '@/server/actions/communes.js'

export default function PointCommuneSelect({point, setPoint, disabled = false}) {
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const value = point.communeCode ? {code: point.communeCode, name: point.communeName} : null

  useEffect(() => {
    let current = true
    const timer = setTimeout(async () => {
      if (query.trim().length < 2) return
      setLoading(true)
      try {
        const response = await searchCommunesAction(query)
        if (!current) return
        setOptions(response.success ? response.data : [])
        setError(response.success ? null : 'La recherche de commune a échoué. Réessayez.')
      } catch {
        if (!current) return
        setOptions([])
        setError('La recherche de commune a échoué. Réessayez.')
      } finally {
        if (current) setLoading(false)
      }
    }, 250)
    return () => { current = false; clearTimeout(timer) }
  }, [query])

  return <Autocomplete
    className='fr-mb-3w'
    disabled={disabled}
    disableClearable
    value={value}
    options={options}
    filterOptions={items => items}
    getOptionLabel={option => `${option.name || option.code} (${option.code})`}
    isOptionEqualToValue={(option, selected) => option.code === selected.code}
    onInputChange={(_event, text, reason) => {
      if (reason !== 'input') return
      setQuery(text)
      setOptions([])
      setError(null)
      setLoading(false)
    }}
    onChange={(_event, selected) => setPoint(previous => ({...previous,
      communeCode: selected?.code ?? null, communeName: selected?.name ?? null}))}
    loading={loading}
    loadingText='Recherche…'
    noOptionsText={query.trim().length < 2 ? 'Saisissez au moins deux caractères' : 'Aucune commune trouvée'}
    renderInput={params => <TextField {...params} label='Commune' error={Boolean(error)}
      helperText={error || 'Recherchez par nom ou code INSEE.'} />}
  />
}
