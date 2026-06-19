'use client'

import {useMemo, useState} from 'react'

import DeclarationSummaryItem, {
  DeclarationSummaryListHeader
} from '@/components/declarations/declaration-summary-item.js'
import {
  buildDeclarationViewFromSource,
  declarationEntryKindLabels,
  getDeclarationEntryKind
} from '@/lib/declaration.js'
import {
  getMyDeclarationURL,
  getMyTelemetrySourceURL
} from '@/lib/urls.js'

const orderedFilterKinds = ['ALL', 'TELEMETRY', 'MANUAL', 'SPREADSHEET', 'NONE']

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

function getFilterOptions(entries) {
  const countsByKind = {}

  for (const entry of entries) {
    countsByKind[entry.kind] = (countsByKind[entry.kind] ?? 0) + 1
  }

  return orderedFilterKinds
    .filter(kind => kind === 'ALL' || countsByKind[kind] > 0)
    .map(kind => ({
      label: `${declarationEntryKindLabels[kind]} (${kind === 'ALL' ? entries.length : countsByKind[kind]})`,
      value: kind
    }))
}

const MyDeclarationsList = ({
  declarations = [],
  telemetrySources = []
}) => {
  const [filterKind, setFilterKind] = useState('ALL')
  const entries = useMemo(
    () => [
      ...declarations.map(declaration => buildDeclarationEntry(declaration)),
      ...telemetrySources.map(source => buildTelemetryEntry(source))
    ].sort(compareEntries),
    [declarations, telemetrySources]
  )
  const filterOptions = useMemo(() => getFilterOptions(entries), [entries])
  const visibleEntries = useMemo(
    () => filterKind === 'ALL'
      ? entries
      : entries.filter(entry => entry.kind === filterKind),
    [entries, filterKind]
  )

  if (entries.length === 0) {
    return null
  }

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex flex-col gap-3 border border-gray-200 bg-gray-50 p-3 sm:flex-row sm:items-end sm:justify-between'>
        <div className='fr-select-group fr-mb-0 w-full sm:max-w-xs'>
          <label className='fr-label' htmlFor='my-declarations-kind-filter'>
            Type de déclaration
          </label>
          <select
            id='my-declarations-kind-filter'
            className='fr-select'
            value={filterKind}
            onChange={event => setFilterKind(event.target.value)}
          >
            {filterOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <p className='fr-text--sm fr-mb-0 text-gray-600'>
          {visibleEntries.length === 1
            ? '1 élément affiché'
            : `${visibleEntries.length} éléments affichés`}
        </p>
      </div>

      {visibleEntries.length === 0 ? (
        <div className='border border-dashed border-gray-300 bg-white p-4 text-center text-sm text-gray-600'>
          Aucune déclaration ne correspond à ce filtre.
        </div>
      ) : (
        <div className='divide-y divide-gray-200 border border-gray-300 bg-white'>
          <DeclarationSummaryListHeader />
          {visibleEntries.map(entry => (
            <DeclarationSummaryItem
              key={entry.id}
              declaration={entry.declaration}
              source={entry.source}
              url={entry.url}
              showDeclarant={false}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default MyDeclarationsList
