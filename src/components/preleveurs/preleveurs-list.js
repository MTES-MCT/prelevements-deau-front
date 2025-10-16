'use client'

import {useEffect, useRef, useState} from 'react'

import SearchBar from '@codegouvfr/react-dsfr/SearchBar'
import {Box} from '@mui/material'

import FlexSearch from '../../../node_modules/flexsearch/dist/flexsearch.bundle.module.min.js'

import Preleveur from '@/components/preleveurs/preleveur.js'
import {normalizeString} from '@/utils/string.js'

const PreleveursList = ({preleveurs}) => {
  const [filteredPreleveurs, setFilteredPreleveurs] = useState(preleveurs)
  const index = useRef(null)

  useEffect(() => {
    index.current = new FlexSearch.Document({
      document: {
        id: 'id_preleveur',
        index: ['nom', 'prenom', 'raison_sociale', 'sigle'],
        store: true
      },
      tokenize: 'full',
      suggest: true,
      depth: 2
    })

    for (const preleveur of preleveurs) {
      index.current.add(
        preleveur.id_preleveur,
        {
          idPreleveur: preleveur.id_preleveur.toString(),
          nom: normalizeString(preleveur.nom),
          prenom: normalizeString(preleveur.prenom),
          raison_sociale: normalizeString(preleveur.raison_sociale), // eslint-disable-line camelcase
          sigle: normalizeString(preleveur.sigle)
        }
      )
    }

    setFilteredPreleveurs(preleveurs)
  }, [preleveurs])

  const handleFilter = e => {
    const query = normalizeString(e.target.value)

    if (query.length === 0) {
      setFilteredPreleveurs(preleveurs)
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
      setFilteredPreleveurs([])
      return
    }

    const newPreleveurs = []
    const seenIds = new Set()

    for (const r of results) {
      for (const doc of r.result) {
        const newPreleveur = preleveurs.find(p => p.id_preleveur === doc.id)

        if (newPreleveur && !seenIds.has(newPreleveur.id_preleveur)) {
          newPreleveurs.push(newPreleveur)
          seenIds.add(newPreleveur.id_preleveur)
        }
      }
    }

    setFilteredPreleveurs(newPreleveurs)
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
        {filteredPreleveurs.length > 0 && filteredPreleveurs.map((preleveur, index) => (
          <Preleveur key={preleveur.id_preleveur} preleveur={preleveur} index={index} />
        ))}
        {filteredPreleveurs.length === 0 && (
          <Box className='p-3'>Aucun résultat</Box>
        )}
      </div>
    </Box>
  )
}

export default PreleveursList
