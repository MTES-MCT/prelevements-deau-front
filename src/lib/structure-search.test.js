/* eslint-disable camelcase */

import test from 'ava'

import {
  getStructureEstablishment,
  getStructureName,
  structureToDeclarantPatch
} from './structure-search.js'

test('maps an association and its head office to declarant fields', t => {
  const structure = {
    nom_complet: 'Association du canal',
    nom_raison_sociale: 'ASSOCIATION DU CANAL',
    siege: {
      siret: '12345678900012',
      numero_voie: '12',
      type_voie: 'RUE',
      libelle_voie: 'DES SOURCES',
      complement_adresse: 'Bâtiment B',
      code_postal: '38000',
      libelle_commune: 'GRENOBLE'
    }
  }

  t.is(getStructureName(structure), 'ASSOCIATION DU CANAL')
  t.deepEqual(structureToDeclarantPatch(structure), {
    socialReason: 'ASSOCIATION DU CANAL',
    siret: '12345678900012',
    addressLine1: '12 RUE DES SOURCES',
    addressLine2: 'Bâtiment B',
    postalCode: '38000',
    city: 'GRENOBLE'
  })
})

test('uses the matching establishment for an exact SIRET search', t => {
  const structure = {
    nom_raison_sociale: 'STRUCTURE TEST',
    siege: {
      siret: '12345678900012',
      adresse: '1 RUE DU SIÈGE',
      code_postal: '75001',
      libelle_commune: 'PARIS'
    },
    matching_etablissements: [
      {
        siret: '12345678900038',
        numero_voie: '5',
        type_voie: 'AVENUE',
        libelle_voie: 'DE L EAU',
        code_postal: '69001',
        libelle_commune: 'LYON'
      }
    ]
  }

  const establishment = getStructureEstablishment(structure, '123 456 789 00038')
  const patch = structureToDeclarantPatch(structure, '123 456 789 00038')

  t.is(establishment.siret, '12345678900038')
  t.is(patch.siret, '12345678900038')
  t.is(patch.addressLine1, '5 AVENUE DE L EAU')
  t.is(patch.city, 'LYON')
  t.false('firstName' in patch)
  t.false('lastName' in patch)
})

test('falls back to the formatted address when street fields are unavailable', t => {
  const patch = structureToDeclarantPatch({
    nom_complet: 'Structure sans voie détaillée',
    siege: {
      siret: '98765432100019',
      adresse: 'LIEU-DIT LA SOURCE 26000 VALENCE',
      code_postal: '26000',
      libelle_commune: 'VALENCE'
    }
  })

  t.is(patch.socialReason, 'Structure sans voie détaillée')
  t.is(patch.addressLine1, 'LIEU-DIT LA SOURCE 26000 VALENCE')
})
