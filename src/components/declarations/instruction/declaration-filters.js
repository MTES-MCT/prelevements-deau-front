'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import {Button} from '@codegouvfr/react-dsfr/Button'
import {debounce} from 'lodash-es'

import {
  getCanonicalTextFilterValue,
  getCanonicalTextFilterSnapshot,
  registerPendingTextFilterNavigation,
  reconcileTextFilterSnapshotDrafts,
  textFilterSnapshotsAreEqual,
  withTextFilterSnapshot
} from '@/lib/text-filter-draft.js'

const declarationTypeFilterOptions = [
  {
    checkboxClassName: 'accent-[#18753c]',
    checkedClassName: 'border-[#18753c] bg-[#e6f4ea] text-[#18753c]',
    colorClassName: 'text-[#18753c]',
    iconClassName: 'fr-icon-edit-line',
    label: 'Saisie rapide',
    value: 'MANUAL'
  },
  {
    checkboxClassName: 'accent-[#8d533e]',
    checkedClassName: 'border-[#8d533e] bg-[#fff4f0] text-[#8d533e]',
    colorClassName: 'text-[#8d533e]',
    iconClassName: 'fr-icon-upload-line',
    label: 'Fichier déposé',
    value: 'SPREADSHEET'
  },
  {
    checkboxClassName: 'accent-[#000091]',
    checkedClassName: 'border-[#000091] bg-[#eeeeff] text-[#000091]',
    colorClassName: 'text-[#000091]',
    iconClassName: 'fr-icon-focus-3-line',
    label: 'Télérelève',
    value: 'API'
  }
]
const declarationTypeFilterValues = declarationTypeFilterOptions.map(option => option.value)
const defaultDeclarationTypeFilterValues = declarationTypeFilterValues.filter(value => value !== 'API')
const emptyDeclarationTypesFilterValue = 'NONE'
const pointsToAssociateFilterValue = 'true'
const spreadsheetDeclarationType = 'SPREADSHEET'

function withoutEmptyValues(values) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value)
  )
}

function parseSelectedTypes(value) {
  if (!value) {
    return defaultDeclarationTypeFilterValues
  }

  if (value === emptyDeclarationTypesFilterValue) {
    return []
  }

  const values = String(value)
    .split(',')
    .map(type => type.trim())
    .filter(type => declarationTypeFilterValues.includes(type))

  return values.length > 0 ? values : defaultDeclarationTypeFilterValues
}

function serializeSelectedTypes(types) {
  if (
    types.length === defaultDeclarationTypeFilterValues.length
    && defaultDeclarationTypeFilterValues.every(value => types.includes(value))
  ) {
    return undefined
  }

  return types.length === 0 ? emptyDeclarationTypesFilterValue : types.join(',')
}

const DeclarationFilters = ({filters, setFilters}) => {
  const [declarantValue, setDeclarantValue] = useState(filters.declarant || '')
  const [dossierNumberValue, setDossierNumberValue] = useState(filters.dossierNumber || '')
  const currentFiltersRef = useRef(filters)
  const setFiltersRef = useRef(setFilters)
  const textFilterDraftsRef = useRef({
    declarant: filters.declarant || '',
    dossierNumber: filters.dossierNumber || ''
  })
  const committedTextFiltersRef = useRef(getCanonicalTextFilterSnapshot(filters))
  const pendingTextFilterNavigationsRef = useRef([])
  const selectedTypes = useMemo(() => parseSelectedTypes(filters.types), [filters.types])
  const selectedTypesSet = useMemo(() => new Set(selectedTypes), [selectedTypes])
  const hasSpreadsheetType = selectedTypesSet.has(spreadsheetDeclarationType)
  const pointsToAssociateOnly = filters.pointsToAssociate === pointsToAssociateFilterValue

  currentFiltersRef.current = filters
  setFiltersRef.current = setFilters

  const submitTextFilter = useCallback((name, rawValue) => {
    const value = getCanonicalTextFilterValue(rawValue)
    committedTextFiltersRef.current[name] = value
    const committedValues = getCanonicalTextFilterSnapshot(committedTextFiltersRef.current)
    const currentValues = getCanonicalTextFilterSnapshot(currentFiltersRef.current)

    if (textFilterSnapshotsAreEqual(committedValues, currentValues)) {
      return
    }

    pendingTextFilterNavigationsRef.current = registerPendingTextFilterNavigation(
      pendingTextFilterNavigationsRef.current,
      committedValues
    )

    setFiltersRef.current(previous => withTextFilterSnapshot({
      ...previous,
      page: undefined
    }, committedValues))
  }, [])

  const debouncedTextFilters = useMemo(
    () => ({
      declarant: debounce(value => submitTextFilter('declarant', value), 300),
      dossierNumber: debounce(value => submitTextFilter('dossierNumber', value), 300)
    }),
    [submitTextFilter]
  )

  useEffect(() => {
    const externalValues = getCanonicalTextFilterSnapshot({
      declarant: filters.declarant,
      dossierNumber: filters.dossierNumber
    })
    const reconciliation = reconcileTextFilterSnapshotDrafts(
      textFilterDraftsRef.current,
      externalValues,
      pendingTextFilterNavigationsRef.current
    )
    pendingTextFilterNavigationsRef.current = reconciliation.pendingNavigations
    textFilterDraftsRef.current = reconciliation.drafts
    setDeclarantValue(reconciliation.drafts.declarant)
    setDossierNumberValue(reconciliation.drafts.dossierNumber)

    if (!reconciliation.isOwnResponse) {
      for (const debouncedTextFilter of Object.values(debouncedTextFilters)) {
        debouncedTextFilter.cancel()
      }

      committedTextFiltersRef.current = externalValues
      return
    }

    const committedValues = committedTextFiltersRef.current
    const hasLatestNavigationPending = pendingTextFilterNavigationsRef.current.some(navigation => (
      textFilterSnapshotsAreEqual(navigation, committedValues)
    ))
    const draftsAreLatest = textFilterSnapshotsAreEqual(reconciliation.drafts, committedValues)

    if (
      !textFilterSnapshotsAreEqual(externalValues, committedValues)
      && !hasLatestNavigationPending
      && draftsAreLatest
    ) {
      submitTextFilter('declarant', committedValues.declarant)
    }
  }, [debouncedTextFilters, filters.declarant, filters.dossierNumber, submitTextFilter])

  useEffect(() => () => {
    for (const debouncedTextFilter of Object.values(debouncedTextFilters)) {
      debouncedTextFilter.cancel()
    }
  }, [debouncedTextFilters])

  const updateTextFilterDraft = (name, value, setValue) => {
    textFilterDraftsRef.current[name] = value
    setValue(value)
    debouncedTextFilters[name](value)
  }

  /*
   * Text filters use independent debouncers. This keeps a declarant search from
   * cancelling a dossier-number search, and lets us identify router responses
   * that belong to an older draft without replacing what the user is typing.
   */
  const setFiltersImmediately = (updater, values = textFilterDraftsRef.current) => {
    for (const [name, value] of Object.entries(values)) {
      debouncedTextFilters[name].cancel()
      const canonicalValue = getCanonicalTextFilterValue(value)
      committedTextFiltersRef.current[name] = canonicalValue
      textFilterDraftsRef.current[name] = value
    }

    const committedValues = getCanonicalTextFilterSnapshot(committedTextFiltersRef.current)

    if (!textFilterSnapshotsAreEqual(currentFiltersRef.current, committedValues)) {
      pendingTextFilterNavigationsRef.current = registerPendingTextFilterNavigation(
        pendingTextFilterNavigationsRef.current,
        committedValues
      )
    }

    setFiltersRef.current(previous => withTextFilterSnapshot(updater(previous), committedValues))
  }

  const updateDateFilter = (name, value) => {
    setFiltersImmediately(previous => ({
      ...previous,
      [name]: value || undefined,
      page: undefined
    }))
  }

  const resetFilters = () => {
    setFiltersImmediately(
      previous => withoutEmptyValues({pageSize: previous.pageSize}),
      {declarant: '', dossierNumber: ''}
    )
    setDeclarantValue('')
    setDossierNumberValue('')
  }

  const toggleType = type => {
    const isSelected = selectedTypesSet.has(type)

    const nextTypes = isSelected
      ? selectedTypes.filter(selectedType => selectedType !== type)
      : [...selectedTypes, type]

    const normalizedTypes = declarationTypeFilterValues.filter(value => nextTypes.includes(value))

    setFiltersImmediately(previous => {
      const nextFilters = {
        ...previous,
        page: undefined,
        types: serializeSelectedTypes(normalizedTypes)
      }

      if (!normalizedTypes.includes(spreadsheetDeclarationType)) {
        nextFilters.pointsToAssociate = undefined
      }

      return nextFilters
    })
  }

  const togglePointsToAssociate = () => {
    setFiltersImmediately(previous => ({
      ...previous,
      page: undefined,
      pointsToAssociate: pointsToAssociateOnly ? undefined : pointsToAssociateFilterValue
    }))
  }

  const hasActiveFilters = Boolean(
    filters.declarant
    || filters.dossierNumber
    || filters.startDate
    || filters.endDate
    || filters.pointsToAssociate
    || serializeSelectedTypes(selectedTypes)
  )

  return (
    <section className='fr-mb-3w border border-gray-200 bg-white px-4 py-3' aria-label='Filtres des déclarations'>
      <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
        <h2 className='fr-h6 fr-mb-0'>Filtres</h2>

        {hasActiveFilters && (
          <Button
            priority='secondary'
            size='small'
            iconId='fr-icon-refresh-line'
            onClick={resetFilters}
          >
            Réinitialiser
          </Button>
        )}
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
              updateTextFilterDraft('declarant', event.target.value, setDeclarantValue)
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
              updateTextFilterDraft('dossierNumber', event.target.value, setDossierNumberValue)
            }}
          />
        </div>

        <div className='min-w-0' role='group' aria-labelledby='declarations-period-filter-label'>
          <div className='fr-label fr-mb-1w min-h-6' id='declarations-period-filter-label'>Période concernée</div>
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
        </div>
      </div>

      <div className='mt-3 grid grid-cols-1 gap-3 border-t border-gray-100 pt-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start'>
        <div className='min-w-0' role='group' aria-labelledby='declaration-types-filter-label'>
          <div className='fr-label fr-mb-1w min-h-6' id='declaration-types-filter-label'>Types de déclaration</div>
          <div className='flex flex-wrap gap-2'>
            {declarationTypeFilterOptions.map(option => {
              const checked = selectedTypesSet.has(option.value)
              return (
                <label
                  key={option.value}
                  className={`inline-flex cursor-pointer items-center gap-1.5 border px-2 py-1 text-sm font-medium transition-colors ${checked ? option.checkedClassName : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'}`}
                  htmlFor={`declaration-type-filter-${option.value}`}
                >
                  <input
                    checked={checked}
                    className={`h-3.5 w-3.5 ${option.checkboxClassName}`}
                    id={`declaration-type-filter-${option.value}`}
                    type='checkbox'
                    onChange={() => toggleType(option.value)}
                  />
                  <span
                    className={`${option.iconClassName} text-[0.66rem] ${checked ? option.colorClassName : 'text-gray-500'} [&::after]:![--icon-size:0.72rem] [&::before]:![--icon-size:0.72rem]`}
                    aria-hidden='true'
                  />
                  {option.label}
                </label>
              )
            })}
          </div>
        </div>

        {hasSpreadsheetType && (
          <div className='min-w-0 lg:justify-self-end lg:pt-7'>
            <div className='fr-checkbox-group fr-mb-0'>
              <input
                checked={pointsToAssociateOnly}
                id='declarations-points-to-associate-filter'
                type='checkbox'
                onChange={togglePointsToAssociate}
              />
              <label className='fr-label' htmlFor='declarations-points-to-associate-filter'>
                Afficher uniquement les déclarations avec points à associer
              </label>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default DeclarationFilters
