'use client'

import {useEffect, useRef, useState} from 'react'

import {fr} from '@codegouvfr/react-dsfr'
import SearchIcon from '@mui/icons-material/Search'
import {
  Box,
  Chip,
  InputAdornment,
  TextField
} from '@mui/material'
import Link from 'next/link'

import FlexSearch from '../../../node_modules/flexsearch/dist/flexsearch.bundle.module.min.js'

import {getUsagesColors} from '@/components/map/legend-colors.js'
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
    const results = index.current.search(query, {
      suggest: true,
      limit: 10,
      enrich: true,
      bool: 'or',
      threshold: 5
    })

    if (query.length === 0) {
      setFilteredPreleveurs(preleveurs)
      return
    }

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
    <Box className='flex flex-col gap-2 mt-8 w-full'>
      <TextField
        label='Chercher un préleveur'
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position='start'>
                <SearchIcon />
              </InputAdornment>
            )
          }
        }}
        onChange={handleFilter}
      />
      {filteredPreleveurs.length > 0 && filteredPreleveurs.map((preleveur, index) => (
        <Box
          key={preleveur.id_preleveur}
          className='fr-p-2w flex justify-between items-center flex-wrap'
          sx={{
            backgroundColor: index % 2 === 0 ? fr.colors.decisions.background.default.grey.default : fr.colors.decisions.background.alt.blueFrance.default
          }}
        >
          <Link href={`preleveurs/${preleveur.id_preleveur}`}>
            <span>{preleveur.id_preleveur} - </span>
            <span>{preleveur.civilite} {preleveur.nom} {preleveur.prenom} {preleveur.sigle} {preleveur.raison_sociale}</span>
          </Link>
          <div className='fr-mt-1w'>
            <b>Usages : </b>
            {preleveur.usages && preleveur.usages.length > 0 && preleveur.usages.map(u => (
              <Chip
                key={`${u}`}
                label={u}
                sx={{
                  ml: 1,
                  backgroundColor: getUsagesColors(u)?.color,
                  color: getUsagesColors(u)?.textColor
                }}
              />
            ))}
          </div>
        </Box>
      ))}
      {filteredPreleveurs.length === 0 && (
        <Box className='p-3'>Aucun résultat</Box>
      )}
    </Box>
  )
}

export default PreleveursList
