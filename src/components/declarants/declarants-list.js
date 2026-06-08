'use client'

import {
  useEffect, useMemo, useRef, useState
} from 'react'

import SearchBar from '@codegouvfr/react-dsfr/SearchBar'
import {Box, Button} from '@mui/material'

import FlexSearch from '../../../node_modules/flexsearch/dist/flexsearch.bundle.module.min.js'

import Declarant from '@/components/declarants/declarant.js'
import {normalizeString} from '@/utils/string.js'

const PAGE_SIZE = 10

const ROLE_FILTERS = [
  {value: 'ALL', label: 'Tous'},
  {value: 'PRELEVEUR', label: 'Préleveurs'},
  {value: 'COLLECTEUR', label: 'Collecteurs'}
]

const EMAIL_FILTERS = [
  {value: 'ALL', label: 'Tous les emails'},
  {value: 'WITH_EMAIL', label: 'Avec email'},
  {value: 'WITHOUT_EMAIL', label: 'Sans email'}
]

function getDeclarantId(declarant) {
  return declarant.id || declarant.userId || declarant.user?.id
}

function getDeclarantRole(declarant) {
  return declarant.declarant?.declarantRole || declarant.declarantRole || 'PRELEVEUR'
}

function getDeclarantSearchDocument(declarant) {
  return {
    id: getDeclarantId(declarant),
    lastName: normalizeString(declarant.lastName),
    firstName: normalizeString(declarant.firstName),
    socialReason: normalizeString(declarant?.declarant?.socialReason || declarant.socialReason),
    email: normalizeString(declarant.email),
    role: normalizeString(getDeclarantRole(declarant)),
    city: normalizeString(declarant?.declarant?.city || declarant.city)
  }
}

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count > 1 ? plural : singular}`
}

const DeclarantsList = ({declarants, basePath = '/declarants'}) => {
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [emailFilter, setEmailFilter] = useState('ALL')
  const [matchingIds, setMatchingIds] = useState(null)
  const [page, setPage] = useState(1)
  const index = useRef(null)

  useEffect(() => {
    index.current = new FlexSearch.Document({
      document: {
        id: 'id',
        index: ['lastName', 'firstName', 'socialReason', 'email', 'role', 'city'],
        store: true
      },
      tokenize: 'full',
      suggest: true,
      depth: 2
    })

    for (const declarant of declarants) {
      const id = getDeclarantId(declarant)
      index.current.add(id, getDeclarantSearchDocument(declarant))
    }

    setMatchingIds(null)
    setPage(1)
  }, [declarants])

  const handleFilter = event => {
    const nextQuery = normalizeString(event.target.value)
    setQuery(nextQuery)
    setPage(1)

    if (nextQuery.length === 0) {
      setMatchingIds(null)
      return
    }

    const results = index.current.search(nextQuery, {
      suggest: true,
      enrich: true,
      bool: 'or',
      threshold: 5
    })

    const ids = new Set()

    for (const result of results) {
      for (const doc of result.result) {
        ids.add(doc.id)
      }
    }

    setMatchingIds(ids)
  }

  const filteredDeclarants = useMemo(() => declarants.filter(declarant => {
    const id = getDeclarantId(declarant)

    if (matchingIds && !matchingIds.has(id)) {
      return false
    }

    const role = getDeclarantRole(declarant)

    if (roleFilter !== 'ALL' && role !== roleFilter) {
      return false
    }

    if (emailFilter === 'WITH_EMAIL' && !declarant.email) {
      return false
    }

    if (emailFilter === 'WITHOUT_EMAIL' && declarant.email) {
      return false
    }

    return true
  }), [declarants, matchingIds, roleFilter, emailFilter])

  const totalPages = Math.max(1, Math.ceil(filteredDeclarants.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)

  const paginatedDeclarants = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    const end = start + PAGE_SIZE
    return filteredDeclarants.slice(start, end)
  }, [filteredDeclarants, currentPage])

  const preleveursCount = declarants.filter(declarant => getDeclarantRole(declarant) === 'PRELEVEUR').length
  const collecteursCount = declarants.filter(declarant => getDeclarantRole(declarant) === 'COLLECTEUR').length
  const withoutEmailCount = declarants.filter(declarant => !declarant.email).length

  return (
    <Box className='flex flex-col gap-4 my-8 w-full'>
      <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
        <div className='fr-p-3w border rounded'>
          <p className='fr-text--lead fr-mb-0'>{pluralize(declarants.length, 'déclarant')}</p>
          <p className='fr-text--sm fr-mb-0'>Total visible dans votre périmètre</p>
        </div>
        <div className='fr-p-3w border rounded'>
          <p className='fr-text--lead fr-mb-0'>{pluralize(preleveursCount, 'préleveur')}</p>
          <p className='fr-text--sm fr-mb-0'>{pluralize(collecteursCount, 'collecteur')}</p>
        </div>
        <div className='fr-p-3w border rounded'>
          <p className='fr-text--lead fr-mb-0'>{pluralize(withoutEmailCount, 'déclarant sans email', 'déclarants sans email')}</p>
        </div>
      </div>

      <SearchBar
        allowEmptySearch
        label='Rechercher par nom, prénom, raison sociale, email, ville ou type'
        renderInput={({className, id, placeholder, type}) => (
          <input
            className={className}
            id={id}
            placeholder={placeholder}
            type={type}
            onChange={handleFilter}
          />
        )}
      />

      <div className='flex flex-col md:flex-row gap-3'>
        <div className='fr-select-group fr-mb-0 min-w-56'>
          <label className='fr-label' htmlFor='declarants-role-filter'>Type</label>
          <select
            className='fr-select'
            id='declarants-role-filter'
            value={roleFilter}
            onChange={event => {
              setPage(1)
              setRoleFilter(event.target.value)
            }}
          >
            {ROLE_FILTERS.map(filter => <option key={filter.value} value={filter.value}>{filter.label}</option>)}
          </select>
        </div>

        <div className='fr-select-group fr-mb-0 min-w-56'>
          <label className='fr-label' htmlFor='declarants-email-filter'>Email</label>
          <select
            className='fr-select'
            id='declarants-email-filter'
            value={emailFilter}
            onChange={event => {
              setPage(1)
              setEmailFilter(event.target.value)
            }}
          >
            {EMAIL_FILTERS.map(filter => <option key={filter.value} value={filter.value}>{filter.label}</option>)}
          </select>
        </div>

        {(query || roleFilter !== 'ALL' || emailFilter !== 'ALL') && (
          <div className='flex items-end'>
            <Button
              variant='outlined'
              onClick={() => {
                setQuery('')
                setMatchingIds(null)
                setRoleFilter('ALL')
                setEmailFilter('ALL')
                setPage(1)
              }}
            >
              Réinitialiser
            </Button>
          </div>
        )}
      </div>

      <Box className='flex items-center justify-between mt-2'>
        <span>
          {pluralize(filteredDeclarants.length, 'résultat')}
          {filteredDeclarants.length === declarants.length ? '' : ` sur ${declarants.length}`}
        </span>

        {filteredDeclarants.length > 0 && totalPages > 1 && (
          <Box className='flex gap-2'>
            <Button
              variant='outlined'
              disabled={currentPage === 1}
              onClick={() => setPage(p => p - 1)}
            >
              Précédent
            </Button>

            <span className='flex items-center'>Page {currentPage} / {totalPages}</span>

            <Button
              variant='outlined'
              disabled={currentPage === totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Suivant
            </Button>
          </Box>
        )}
      </Box>

      <div>
        {paginatedDeclarants.length > 0 && paginatedDeclarants.map((declarant, index) => (
          <Declarant
            key={getDeclarantId(declarant)}
            declarant={declarant}
            index={((currentPage - 1) * PAGE_SIZE) + index}
            basePath={basePath}
          />
        ))}

        {filteredDeclarants.length === 0 && (
          <Box className='p-3'>Aucun résultat</Box>
        )}
      </div>
    </Box>
  )
}

export default DeclarantsList
