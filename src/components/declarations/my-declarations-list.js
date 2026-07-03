'use client'

import {useMemo, useState} from 'react'

import {Button} from '@codegouvfr/react-dsfr/Button'

import DeclarationSummaryItem, {
  DeclarationSummaryListHeader
} from '@/components/declarations/declaration-summary-item.js'
import {useAuth} from '@/contexts/auth-context.js'
import {getDeclarantTitleFromDeclarant} from '@/lib/declarants.js'
import {
  buildDeclarationViewFromSource,
  getDeclarationDisplayStatus,
  getDeclarationEntryKind
} from '@/lib/declaration.js'
import {
  getMyDeclarationURL,
  getMyTelemetrySourceURL
} from '@/lib/urls.js'

const pointsToAssociateStatuses = new Set(['TO_INSTRUCT', 'INSTRUCTION_IN_PROGRESS', 'PARTIALLY_VALIDATED'])

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
    value: 'TELEMETRY'
  },
  {
    checkboxClassName: 'accent-gray-600',
    checkedClassName: 'border-gray-600 bg-gray-100 text-gray-700',
    colorClassName: 'text-gray-600',
    iconClassName: 'fr-icon-file-line',
    label: 'Autres',
    value: 'NONE'
  }
]

const declarationTypeFilterValues = declarationTypeFilterOptions.map(option => option.value)

function compareEntries(entryA, entryB) {
  const dateA = new Date(entryA.createdAt ?? 0).getTime()
  const dateB = new Date(entryB.createdAt ?? 0).getTime()

  return dateB - dateA
}

function buildDeclarationEntry(declaration) {
  return {
    createdAt: declaration.createdAt ?? declaration.source?.createdAt,
    declaration,
    id: `declaration-${declaration.id}`,
    kind: getDeclarationEntryKind(declaration, declaration.source),
    source: declaration.source,
    url: getMyDeclarationURL(declaration)
  }
}

function buildTelemetryEntry(source) {
  const declaration = buildDeclarationViewFromSource(source)

  return {
    createdAt: source.createdAt,
    declaration,
    id: `telemetry-${source.id}`,
    kind: 'TELEMETRY',
    source,
    url: getMyTelemetrySourceURL(source)
  }
}

function getCountsByKind(entries) {
  const countsByKind = {}

  for (const entry of entries) {
    countsByKind[entry.kind] = (countsByKind[entry.kind] ?? 0) + 1
  }

  return countsByKind
}

function normalizeSearchValue(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replaceAll(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

function getShortSourceCode(source) {
  const sourceId = source?.id

  if (!sourceId) {
    return null
  }

  const digits = String(sourceId).replaceAll(/\D/g, '')
  return digits.length >= 6 ? digits.slice(0, 6) : null
}

function getEntryNumberSearchText(entry) {
  return [
    entry.declaration?.code,
    entry.source?.declaration?.code,
    entry.kind === 'TELEMETRY' ? getShortSourceCode(entry.source) : null
  ]
    .filter(Boolean)
    .join(' ')
}

function getDeclarantSearchText(entry) {
  const values = []
  const pushDeclarant = declarant => {
    if (!declarant) {
      return
    }

    values.push(
      getDeclarantTitleFromDeclarant(declarant),
      declarant.socialReason,
      declarant.firstName,
      declarant.lastName,
      declarant.user?.email,
      declarant.user?.firstName,
      declarant.user?.lastName
    )
  }

  pushDeclarant(entry.declaration?.declarant)
  pushDeclarant(entry.declaration?.createdByDeclarant)
  pushDeclarant(entry.source?.declarant)

  for (const chunk of entry.source?.chunks ?? []) {
    for (const link of chunk.pointPrelevement?.declarants ?? []) {
      pushDeclarant(link.declarant)
    }
  }

  return values.filter(Boolean).join(' ')
}

function getEntryDateBounds(entry) {
  const dates = (entry.source?.chunks ?? [])
    .flatMap(chunk => [chunk.minDate, chunk.maxDate])
    .filter(Boolean)
    .map(value => new Date(value))
    .filter(date => Number.isFinite(date.getTime()))

  if (dates.length === 0) {
    for (const value of [
      entry.declaration?.createdAt,
      entry.source?.createdAt,
      entry.createdAt
    ]) {
      const date = new Date(value)

      if (Number.isFinite(date.getTime())) {
        dates.push(date)
      }
    }
  }

  if (dates.length === 0) {
    return {end: null, start: null}
  }

  const timestamps = dates.map(date => date.getTime())

  return {
    end: new Date(Math.max(...timestamps)),
    start: new Date(Math.min(...timestamps))
  }
}

function parseDateFilter(value, endOfDay = false) {
  if (!value) {
    return null
  }

  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`)
  return Number.isFinite(date.getTime()) ? date : null
}

function entryMatchesPeriod(entry, startDate, endDate) {
  const filterStart = parseDateFilter(startDate)
  const filterEnd = parseDateFilter(endDate, true)

  if (!filterStart && !filterEnd) {
    return true
  }

  const bounds = getEntryDateBounds(entry)

  if (!bounds.start || !bounds.end) {
    return false
  }

  if (filterStart && bounds.end < filterStart) {
    return false
  }

  return !(filterEnd && bounds.start > filterEnd)
}

function isChunkToAssociate(chunk) {
  return chunk?.instructionStatus !== 'VALIDATED' || !chunk?.pointPrelevementId
}

function getPointsToAssociateCount(source) {
  const chunks = source?.chunks ?? []

  if (chunks.length > 0) {
    return chunks.filter(chunk => isChunkToAssociate(chunk)).length
  }

  return source?._count?.chunks ?? 0
}

function hasPointsToAssociate(entry) {
  const status = getDeclarationDisplayStatus(entry.declaration, entry.source)

  return entry.kind === 'SPREADSHEET'
    && pointsToAssociateStatuses.has(status)
    && getPointsToAssociateCount(entry.source) > 0
}

function matchesSearch(text, query) {
  const normalizedQuery = normalizeSearchValue(query)

  if (!normalizedQuery) {
    return true
  }

  return normalizeSearchValue(text).includes(normalizedQuery)
}

const MyDeclarationsList = ({
  declarations = [],
  showDeclarant: showDeclarantFromProps,
  telemetrySources = []
}) => {
  const {user} = useAuth()
  const [filters, setFilters] = useState({
    declarant: '',
    dossierNumber: '',
    endDate: '',
    startDate: ''
  })
  const [selectedKinds, setSelectedKinds] = useState(declarationTypeFilterValues)
  const [pointsToAssociateOnly, setPointsToAssociateOnly] = useState(false)
  const showDeclarant = typeof showDeclarantFromProps === 'boolean'
    ? showDeclarantFromProps
    : user?.declarantRole === 'COLLECTEUR'
  const entries = useMemo(
    () => [
      ...declarations.map(declaration => buildDeclarationEntry(declaration)),
      ...telemetrySources.map(source => buildTelemetryEntry(source))
    ].sort(compareEntries),
    [declarations, telemetrySources]
  )
  const countsByKind = useMemo(() => getCountsByKind(entries), [entries])
  const availableTypeOptions = useMemo(
    () => declarationTypeFilterOptions.filter(option => countsByKind[option.value] > 0),
    [countsByKind]
  )
  const availableKindValues = useMemo(
    () => availableTypeOptions.map(option => option.value),
    [availableTypeOptions]
  )
  const selectedKindSet = useMemo(() => new Set(selectedKinds), [selectedKinds])
  const hasActiveTypeFilter = availableKindValues.some(kind => !selectedKindSet.has(kind))
  const hasSpreadsheetType = availableKindValues.includes('SPREADSHEET') && selectedKindSet.has('SPREADSHEET')
  const visibleEntries = useMemo(
    () => entries.filter(entry => {
      if (!selectedKindSet.has(entry.kind)) {
        return false
      }

      if (pointsToAssociateOnly && !hasPointsToAssociate(entry)) {
        return false
      }

      if (!matchesSearch(getEntryNumberSearchText(entry), filters.dossierNumber)) {
        return false
      }

      if (showDeclarant && !matchesSearch(getDeclarantSearchText(entry), filters.declarant)) {
        return false
      }

      return entryMatchesPeriod(entry, filters.startDate, filters.endDate)
    }),
    [entries, filters, pointsToAssociateOnly, selectedKindSet, showDeclarant]
  )
  const hasActiveFilters = Boolean(
    filters.dossierNumber
    || filters.startDate
    || filters.endDate
    || (showDeclarant && filters.declarant)
    || pointsToAssociateOnly
    || hasActiveTypeFilter
  )

  const updateFilter = (name, value) => {
    setFilters(previous => ({
      ...previous,
      [name]: value
    }))
  }

  const toggleKind = kind => {
    const nextKinds = selectedKindSet.has(kind)
      ? selectedKinds.filter(selectedKind => selectedKind !== kind)
      : declarationTypeFilterValues.filter(value => [...selectedKinds, kind].includes(value))

    setSelectedKinds(nextKinds)

    if (!nextKinds.includes('SPREADSHEET')) {
      setPointsToAssociateOnly(false)
    }
  }

  const resetFilters = () => {
    setFilters({
      declarant: '',
      dossierNumber: '',
      endDate: '',
      startDate: ''
    })
    setSelectedKinds(declarationTypeFilterValues)
    setPointsToAssociateOnly(false)
  }

  if (entries.length === 0) {
    return null
  }

  return (
    <div className='flex flex-col gap-3'>
      <section className='border border-gray-200 bg-white px-4 py-3' aria-label='Filtres des déclarations'>
        <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
          <h3 className='fr-h6 fr-mb-0'>Filtres</h3>

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

        <div className={`grid grid-cols-1 gap-x-4 gap-y-3 ${showDeclarant ? 'lg:grid-cols-[minmax(12rem,1fr)_minmax(10rem,.75fr)_minmax(25rem,1.25fr)]' : 'lg:grid-cols-[minmax(10rem,.75fr)_minmax(25rem,1.25fr)]'} lg:items-end`}>
          {showDeclarant && (
            <div className='fr-input-group fr-mb-0 min-w-0'>
              <label className='fr-label min-h-6' htmlFor='my-declarations-declarant-filter'>Préleveur</label>
              <input
                className='fr-input'
                id='my-declarations-declarant-filter'
                type='search'
                value={filters.declarant}
                onChange={event => updateFilter('declarant', event.target.value)}
              />
            </div>
          )}

          <div className='fr-input-group fr-mb-0 min-w-0'>
            <label className='fr-label min-h-6' htmlFor='my-declarations-number-filter'>Numéro</label>
            <input
              className='fr-input'
              id='my-declarations-number-filter'
              inputMode='numeric'
              value={filters.dossierNumber}
              onChange={event => updateFilter('dossierNumber', event.target.value)}
            />
          </div>

          <div className='min-w-0' role='group' aria-labelledby='my-declarations-period-filter-label'>
            <div className='fr-label fr-mb-1w min-h-6' id='my-declarations-period-filter-label'>Période concernée</div>
            <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
              <div className='flex min-w-0 items-center gap-2'>
                <label className='fr-label fr-mb-0 w-8 shrink-0 text-right text-sm' htmlFor='my-declarations-start-date'>Du</label>
                <input
                  className='fr-input'
                  id='my-declarations-start-date'
                  type='date'
                  value={filters.startDate}
                  onChange={event => updateFilter('startDate', event.target.value)}
                />
              </div>
              <div className='flex min-w-0 items-center gap-2'>
                <label className='fr-label fr-mb-0 w-8 shrink-0 text-right text-sm' htmlFor='my-declarations-end-date'>Au</label>
                <input
                  className='fr-input'
                  id='my-declarations-end-date'
                  min={filters.startDate || undefined}
                  type='date'
                  value={filters.endDate}
                  onChange={event => updateFilter('endDate', event.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className='mt-3 grid grid-cols-1 gap-3 border-t border-gray-100 pt-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start'>
          <div className='min-w-0' role='group' aria-labelledby='my-declaration-types-filter-label'>
            <div className='fr-label fr-mb-1w min-h-6' id='my-declaration-types-filter-label'>Types de déclaration</div>
            <div className='flex flex-wrap gap-2'>
              {availableTypeOptions.map(option => {
                const checked = selectedKindSet.has(option.value)
                return (
                  <label
                    key={option.value}
                    className={`inline-flex cursor-pointer items-center gap-1.5 border px-2 py-1 text-sm font-medium transition-colors ${checked ? option.checkedClassName : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'}`}
                    htmlFor={`my-declaration-type-filter-${option.value}`}
                  >
                    <input
                      checked={checked}
                      className={`h-3.5 w-3.5 ${option.checkboxClassName}`}
                      id={`my-declaration-type-filter-${option.value}`}
                      type='checkbox'
                      onChange={() => toggleKind(option.value)}
                    />
                    <span
                      className={`${option.iconClassName} text-[0.66rem] ${checked ? option.colorClassName : 'text-gray-500'} [&::after]:![--icon-size:0.72rem] [&::before]:![--icon-size:0.72rem]`}
                      aria-hidden='true'
                    />
                    <span>{option.label}</span>
                    <span className='text-xs font-normal opacity-75'>({countsByKind[option.value]})</span>
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
                  id='my-declarations-points-to-associate-filter'
                  type='checkbox'
                  onChange={() => setPointsToAssociateOnly(value => !value)}
                />
                <label className='fr-label' htmlFor='my-declarations-points-to-associate-filter'>
                  Afficher uniquement les déclarations avec points à associer
                </label>
              </div>
            </div>
          )}
        </div>

        <p className='fr-text--sm fr-mb-0 mt-3 text-gray-600'>
          {visibleEntries.length === 1
            ? '1 élément affiché'
            : `${visibleEntries.length} éléments affichés`}
          {' '}
          sur
          {' '}
          {entries.length}
          {' '}
          {entries.length === 1 ? 'déclaration' : 'déclarations'}
        </p>
      </section>

      {visibleEntries.length === 0 ? (
        <div className='border border-dashed border-gray-300 bg-white p-4 text-center text-sm text-gray-600'>
          Aucune déclaration ne correspond à ces filtres.
        </div>
      ) : (
        <div className='divide-y divide-gray-200 border border-gray-300 bg-white'>
          <DeclarationSummaryListHeader showDeclarant={showDeclarant} />
          {visibleEntries.map(entry => (
            <DeclarationSummaryItem
              key={entry.id}
              declaration={entry.declaration}
              source={entry.source}
              url={entry.url}
              showDeclarant={showDeclarant}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default MyDeclarationsList
