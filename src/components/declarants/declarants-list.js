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

const DeclarantsList = ({declarants}) => {
  const [filteredDeclarants, setFilteredDeclarants] = useState(declarants)
  const [page, setPage] = useState(1)
  const index = useRef(null)

  useEffect(() => {
    index.current = new FlexSearch.Document({
      document: {
        id: 'id',
        index: ['lastName', 'firstName', 'socialReason'],
        store: true
      },
      tokenize: 'full',
      suggest: true,
      depth: 2
    })

    for (const declarant of declarants) {
      index.current.add(declarant.id, {
        id: declarant.id,
        lastName: normalizeString(declarant.lastName),
        firstName: normalizeString(declarant.firstName),
        socialReason: normalizeString(declarant?.declarant?.socialReason)
      })
    }

    setFilteredDeclarants(declarants)
    setPage(1)
  }, [declarants])

  const handleFilter = e => {
    const query = normalizeString(e.target.value)

    setPage(1)

    if (query.length === 0) {
      setFilteredDeclarants(declarants)
      return
    }

    const results = index.current.search(query, {
      suggest: true,
      enrich: true,
      bool: 'or',
      threshold: 5
    })

    if (results.length === 0) {
      setFilteredDeclarants([])
      return
    }

    const newDeclarants = []
    const seenIds = new Set()

    for (const r of results) {
      for (const doc of r.result) {
        const newDeclarant = declarants.find(p => p.id === doc.id)

        if (newDeclarant && !seenIds.has(newDeclarant.id)) {
          newDeclarants.push(newDeclarant)
          seenIds.add(newDeclarant.id)
        }
      }
    }

    setFilteredDeclarants(newDeclarants)
  }

  const totalPages = Math.ceil(filteredDeclarants.length / PAGE_SIZE)

  const paginatedDeclarants = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    const end = start + PAGE_SIZE
    return filteredDeclarants.slice(start, end)
  }, [filteredDeclarants, page])

  return (
    <Box className='flex flex-col gap-2 my-8 w-full'>
      <SearchBar
        allowEmptySearch
        label='Rechercher par nom, prénom ou raison sociale'
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

      {filteredDeclarants.length > 0 && totalPages > 1 && (
        <Box className='flex items-center justify-between mt-4'>
          <span>
            Page {page} / {totalPages} — {filteredDeclarants.length} résultat{filteredDeclarants.length > 1 ? 's' : ''}
          </span>

          <Box className='flex gap-2'>
            <Button
              variant='outlined'
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              Précédent
            </Button>

            <Button
              variant='outlined'
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Suivant
            </Button>
          </Box>
        </Box>
      )}

      <div>
        {paginatedDeclarants.length > 0 && paginatedDeclarants.map((declarant, index) => (
          <Declarant
            key={declarant.id}
            declarant={declarant}
            index={((page - 1) * PAGE_SIZE) + index}
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
