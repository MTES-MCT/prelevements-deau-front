'use client'

import {useMemo, useState} from 'react'

import SearchBar from '@codegouvfr/react-dsfr/SearchBar'
import {Alert} from '@mui/material'
import Link from 'next/link'

import ListItem from '@/components/ui/ListItem/index.js'
import {ZONE_ICONS} from '@/components/zones/zone-icons.js'
import {
  getDeclarantTitleFromUser,
  isDeclarantPhysique
} from '@/lib/declarants.js'

function normalizeSearch(value) {
  return String(value || '')
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .trim()
}

function getDeclarantIcon(declarant) {
  return isDeclarantPhysique(declarant)
    ? ZONE_ICONS.user
    : ZONE_ICONS.building
}

function getDeclarantSubtitle(declarant) {
  const points = declarant.points || []
  const count = points.length
  const names = points.slice(0, 3).map(point => point.name).join(', ')
  const suffix = points.length > 3 ? `, +${points.length - 3}` : ''

  if (count === 0) {
    return 'Aucun point dans cette zone'
  }

  return `${count} point${count > 1 ? 's' : ''} dans la zone — ${names}${suffix}`
}

function getDeclarantSearchText(declarant) {
  return normalizeSearch([
    declarant.firstName,
    declarant.lastName,
    declarant.socialReason,
    declarant.email,
    declarant.phoneNumber,
    declarant.city,
    ...(declarant.points || []).map(point => point.name)
  ].filter(Boolean).join(' '))
}

const ZoneDeclarantsList = ({declarants}) => {
  const [query, setQuery] = useState('')

  const filteredDeclarants = useMemo(() => {
    const normalizedQuery = normalizeSearch(query)

    if (!normalizedQuery) {
      return declarants
    }

    return declarants.filter(declarant => getDeclarantSearchText(declarant).includes(normalizedQuery))
  }, [declarants, query])

  if (declarants.length === 0) {
    return (
      <Alert severity='info'>
        Aucun déclarant n’est rattaché à cette zone.
      </Alert>
    )
  }

  return (
    <div className='flex flex-col gap-3'>
      <SearchBar
        allowEmptySearch
        label='Rechercher un déclarant'
        renderInput={({className, id, placeholder, type}) => (
          <input
            className={className}
            id={id}
            placeholder={placeholder}
            type={type}
            value={query}
            onChange={event => setQuery(event.target.value)}
          />
        )}
      />

      {filteredDeclarants.length === 0 && (
        <Alert severity='info'>
          Aucun déclarant ne correspond à cette recherche.
        </Alert>
      )}

      {filteredDeclarants.map((declarant, index) => (
        <Link key={declarant.id} href={`/declarants/${declarant.id}`}>
          <ListItem
            border
            background={index % 2 === 0 ? 'primary' : 'secondary'}
            title={(
              <>
                <span className={`${getDeclarantIcon(declarant)} mr-2`} />
                {getDeclarantTitleFromUser(declarant)}
              </>
            )}
            subtitle={getDeclarantSubtitle(declarant)}
            tags={[
              {
                label: isDeclarantPhysique(declarant) ? 'Personne physique' : 'Personne morale',
                severity: 'info'
              }
            ]}
            metas={[
              declarant.email && {
                iconId: ZONE_ICONS.at,
                content: declarant.email
              },
              declarant.phoneNumber && {
                iconId: ZONE_ICONS.phone,
                content: declarant.phoneNumber
              },
              declarant.city && {
                iconId: ZONE_ICONS.mapPin,
                content: declarant.city
              }
            ].filter(Boolean)}
          />
        </Link>
      ))}
    </div>
  )
}

export default ZoneDeclarantsList
