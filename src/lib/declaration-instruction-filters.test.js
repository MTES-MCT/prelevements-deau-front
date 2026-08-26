import test from 'ava'

import {
  DEFAULT_DECLARATION_TYPES,
  getDeclarationInstructionFilters,
  getDeclarationInstructionRequestOptions,
  getDeclarationInstructionURL
} from './declaration-instruction-filters.js'

test('normalise les filtres de la liste d’instruction depuis les paramètres Next', t => {
  t.deepEqual(getDeclarationInstructionFilters({
    declarant: 'Agence',
    page: ['2', '3'],
    unused: 'ignored'
  }), {
    declarant: 'Agence',
    page: '2',
    types: DEFAULT_DECLARATION_TYPES
  })
})

test('prépare une requête paginée avec les valeurs par défaut', t => {
  t.deepEqual(getDeclarationInstructionRequestOptions({types: 'MANUAL'}), {
    declarant: undefined,
    dossierNumber: undefined,
    endDate: undefined,
    page: '1',
    pageSize: '25',
    pointsToAssociate: undefined,
    startDate: undefined,
    types: 'MANUAL'
  })
})

test('normalise les paginations invalides avant l’appel API', t => {
  for (const value of ['abc', '0', '-1']) {
    const options = getDeclarationInstructionRequestOptions({
      page: value,
      pageSize: value
    })

    t.is(options.page, '1')
    t.is(options.pageSize, '25')
  }

  t.is(getDeclarationInstructionRequestOptions({page: '02'}).page, '2')
})

test('partage la même lecture des filtres entre URL cliente et paramètres serveur', t => {
  const filters = getDeclarationInstructionFilters(
    new URLSearchParams('page=3&declarant=Agence+de+l%27eau&unused=ignored')
  )

  t.deepEqual(filters, {
    declarant: 'Agence de l\'eau',
    page: '3',
    types: DEFAULT_DECLARATION_TYPES
  })
})

test('construit une URL canonique sans valeurs par défaut ni paramètres étrangers', t => {
  t.is(getDeclarationInstructionURL('/declarations', {
    declarant: 'Agence de l\'eau',
    page: '1',
    pageSize: '50',
    types: DEFAULT_DECLARATION_TYPES,
    unused: 'ignored'
  }), '/declarations?declarant=Agence+de+l%27eau&pageSize=50')
})
