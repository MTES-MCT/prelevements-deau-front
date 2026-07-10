/* eslint-disable camelcase */
'use client'

import {useEffect, useState} from 'react'

import {Autocomplete, CircularProgress, TextField} from '@mui/material'

import {
  getStructureEstablishment,
  getStructureName,
  structureToDeclarantPatch
} from '@/lib/structure-search.js'

const MINIMUM_SEARCH_LENGTH = 3
const SEARCH_ENDPOINT = 'https://recherche-entreprises.api.gouv.fr/search'

function getResultLocation(structure, searchTerm) {
  const establishment = getStructureEstablishment(structure, searchTerm)

  return [establishment?.code_postal, establishment?.libelle_commune]
    .filter(Boolean)
    .join(' ')
}

const SearchByStructure = ({setPreleveur}) => {
  const [inputValue, setInputValue] = useState('')
  const [selectedStructure, setSelectedStructure] = useState(null)
  const [structures, setStructures] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchError, setSearchError] = useState(null)

  useEffect(() => {
    const searchTerm = inputValue.trim()
    const selectedLabel = selectedStructure ? getStructureName(selectedStructure) : ''

    if (selectedStructure && searchTerm === selectedLabel) {
      setIsLoading(false)
      setSearchError(null)
      return undefined
    }

    if (searchTerm.length < MINIMUM_SEARCH_LENGTH) {
      setStructures([])
      setIsLoading(false)
      setSearchError(null)
      return undefined
    }

    const abortController = new AbortController()
    const timeout = setTimeout(async () => {
      setIsLoading(true)
      setSearchError(null)

      try {
        const parameters = new URLSearchParams({
          q: searchTerm,
          per_page: '10',
          minimal: 'true',
          include: 'siege,matching_etablissements,complements'
        })
        const response = await fetch(`${SEARCH_ENDPOINT}?${parameters}`, {
          headers: {Accept: 'application/json'},
          signal: abortController.signal
        })

        if (!response.ok) {
          throw new Error(`Recherche indisponible (${response.status})`)
        }

        const data = await response.json()
        setStructures(Array.isArray(data.results) ? data.results : [])
      } catch (error) {
        if (error.name !== 'AbortError') {
          setStructures([])
          setSearchError('La recherche de structure est momentanément indisponible.')
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false)
        }
      }
    }, 300)

    return () => {
      clearTimeout(timeout)
      abortController.abort()
    }
  }, [inputValue, selectedStructure])

  const handleSelection = structure => {
    setSelectedStructure(structure)

    if (!structure) {
      return
    }

    const searchTerm = inputValue
    setInputValue(getStructureName(structure))
    setPreleveur(previous => ({
      ...previous,
      ...structureToDeclarantPatch(structure, searchTerm)
    }))
  }

  const noOptionsText = searchError
    || (inputValue.trim().length < MINIMUM_SEARCH_LENGTH
      ? 'Saisissez au moins 3 caractères'
      : 'Aucune structure trouvée')

  return (
    <div className='fr-input-group fr-mb-0'>
      <label className='fr-label' htmlFor='structure-search'>
        Rechercher une structure{' '}
        <span className='fr-hint-text' id='structure-search-hint'>
          Entreprise, association ou organisme public, par nom, SIREN ou SIRET.
        </span>
      </label>
      <Autocomplete
        fullWidth
        forcePopupIcon
        filterOptions={options => options}
        id='structure-search'
        inputValue={inputValue}
        isOptionEqualToValue={(option, value) => option.siren === value.siren}
        loading={isLoading}
        loadingText='Recherche en cours…'
        noOptionsText={noOptionsText}
        options={structures}
        value={selectedStructure}
        getOptionKey={structure => structure.siren}
        getOptionLabel={getStructureName}
        renderInput={parameters => (
          <TextField
            {...parameters}
            error={Boolean(searchError)}
            placeholder='Nom, SIREN ou SIRET'
            size='small'
            slotProps={{
              htmlInput: {
                ...parameters.inputProps,
                'aria-describedby': searchError ? 'structure-search-error' : 'structure-search-hint'
              },
              input: {
                ...parameters.InputProps,
                endAdornment: (
                  <>
                    {isLoading && <CircularProgress color='inherit' size={18} />}
                    {parameters.InputProps.endAdornment}
                  </>
                )
              }
            }}
            sx={{
              mt: 1,
              '& .MuiOutlinedInput-root': {
                borderRadius: 0,
                color: 'var(--text-default-grey)',
                backgroundColor: 'var(--background-contrast-grey)'
              },
              '& .MuiAutocomplete-clearIndicator, & .MuiAutocomplete-popupIndicator': {
                color: 'var(--text-action-high-blue-france)'
              }
            }}
          />
        )}
        renderOption={(optionProps, structure) => {
          const {key, ...props} = optionProps
          const establishment = getStructureEstablishment(structure, inputValue)
          const identifier = establishment?.siret || structure.siren
          const location = getResultLocation(structure, inputValue)
          const isAssociation = structure.complements?.est_association === true

          return (
            <li key={key || structure.siren} {...props}>
              <div className='min-w-0 w-full py-1'>
                <div className='flex flex-wrap items-center gap-2'>
                  <span className='font-medium break-words'>{getStructureName(structure)}</span>
                  {isAssociation && (
                    <span className='fr-badge fr-badge--sm fr-badge--no-icon'>Association</span>
                  )}
                </div>
                <div className='mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-[var(--text-default-grey)] opacity-80'>
                  <span>{identifier?.length === 14 ? 'SIRET' : 'SIREN'} {identifier}</span>
                  {location && <span>{location}</span>}
                </div>
              </div>
            </li>
          )
        }}
        onChange={(_event, structure) => handleSelection(structure)}
        onInputChange={(_event, value, reason) => {
          setInputValue(value)

          if (reason === 'input' || reason === 'clear') {
            setSelectedStructure(null)
          }
        }}
      />
      {searchError && (
        <p className='fr-error-text fr-mt-1v' id='structure-search-error' aria-live='polite'>
          {searchError}
        </p>
      )}
    </div>
  )
}

export default SearchByStructure
