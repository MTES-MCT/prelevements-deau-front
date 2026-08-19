import test from 'ava'

import {
  getActiveDeclarantFilterChips,
  getActiveDeclarantFilterValueCount,
  getDeclarantFilterRemoval,
  getFacetedDeclarantFilterConfigs
} from './declarant-filter-chips.js'

const filterConfigs = [
  {
    name: 'activityRange',
    label: 'Dernière déclaration',
    options: [{value: 'LT_30_DAYS', label: 'Moins de 30 jours'}]
  },
  {
    name: 'zoneIds',
    label: 'Zone',
    multiple: true
  }
]

test('le compteur additionne chaque valeur de filtre avancé', t => {
  t.is(getActiveDeclarantFilterValueCount({
    activityRange: 'LT_30_DAYS',
    zoneIds: ['zone-a', 'zone-b'],
    query: 'ferme'
  }, filterConfigs), 3)
})

test('les facettes pilotent les filtres exposés, même si l’URL contient une valeur protégée', t => {
  const configs = [
    {
      name: 'role',
      label: 'Rôle',
      options: [{value: 'COLLECTEUR', label: 'Collecteurs'}]
    },
    {
      name: 'zoneIds',
      label: 'Zone',
      facetKeys: ['zones'],
      multiple: true
    }
  ]
  const facetedConfigs = getFacetedDeclarantFilterConfigs(configs, {zones: []})
  const filters = {role: 'COLLECTEUR', zoneIds: []}

  t.deepEqual(facetedConfigs.map(config => config.name), ['zoneIds'])
  t.is(getActiveDeclarantFilterValueCount(filters, facetedConfigs), 0)
  t.deepEqual(getActiveDeclarantFilterChips({
    filterConfigs: facetedConfigs,
    filters
  }), [])
})

test('les chips utilisent les libellés statiques, dynamiques puis la valeur de repli', t => {
  t.deepEqual(getActiveDeclarantFilterChips({
    filterConfigs,
    filters: {
      activityRange: 'LT_30_DAYS',
      zoneIds: ['zone-a', 'zone-inconnue']
    },
    optionsByFilter: {
      zoneIds: [{value: 'zone-a', label: 'SAGE Beauvert'}]
    }
  }), [
    {
      id: 'activityRange:LT_30_DAYS',
      label: 'Dernière déclaration : Moins de 30 jours',
      name: 'activityRange',
      value: 'LT_30_DAYS'
    },
    {
      id: 'zoneIds:zone-a',
      label: 'Zone : SAGE Beauvert',
      name: 'zoneIds',
      value: 'zone-a'
    },
    {
      id: 'zoneIds:zone-inconnue',
      label: 'Zone : zone-inconnue',
      name: 'zoneIds',
      value: 'zone-inconnue'
    }
  ])
})

test('la suppression retire une seule valeur multiple sans muter les filtres', t => {
  const filters = {zoneIds: ['zone-a', 'zone-b']}

  t.deepEqual(getDeclarantFilterRemoval(filters, {
    name: 'zoneIds',
    value: 'zone-a'
  }), {zoneIds: ['zone-b']})
  t.deepEqual(filters, {zoneIds: ['zone-a', 'zone-b']})
})

test('la suppression d’un filtre simple produit une valeur canonique vide', t => {
  t.deepEqual(getDeclarantFilterRemoval({activityRange: 'LT_30_DAYS'}, {
    name: 'activityRange',
    value: 'LT_30_DAYS'
  }), {activityRange: null})
})
