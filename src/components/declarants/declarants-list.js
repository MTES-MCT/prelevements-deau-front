'use client'

import {useEffect, useRef, useState} from 'react'

import SearchBar from '@codegouvfr/react-dsfr/SearchBar'
import {Box} from '@mui/material'

import FlexSearch from '../../../node_modules/flexsearch/dist/flexsearch.bundle.module.min.js'

import Declarant from '@/components/declarants/declarant.js'
import {normalizeString} from '@/utils/string.js'

const DeclarantsList = ({declarants}) => {
  const [filteredDeclarants, setFilteredDeclarants] = useState(declarants)
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
      index.current.add(
        declarant.id,
        {
          id: declarant.id,
          lastName: normalizeString(declarant.lastName),
          firstName: normalizeString(declarant.firstName),
          socialReason: normalizeString(declarant?.declarant?.socialReason)
        }
      )
    }

    setFilteredDeclarants(declarants)
  }, [declarants])

  const handleFilter = e => {
    const query = normalizeString(e.target.value)

    if (query.length === 0) {
      setFilteredDeclarants(declarants)
      return
    }

    const results = index.current.search(query, {
      suggest: true,
      limit: 10,
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
      <div>
        {filteredDeclarants.length > 0 && filteredDeclarants.map((declarant, index) => (
          <Declarant key={declarant.id} declarant={declarant} index={index} />
        ))}
        {filteredDeclarants.length === 0 && (
          <Box className='p-3'>Aucun résultat</Box>
        )}
      </div>
    </Box>
  )
}

export default DeclarantsList
