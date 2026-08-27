import test from 'ava'

import {searchCollecteurPreleveurs} from './collecteur-preleveurs.js'

const PRELEVEURS = [
  {
    id: '1',
    email: 'marie@example.fr',
    firstName: 'Marie',
    lastName: 'Lebeau',
    declarant: {
      contactEmails: [
        {email: 'marie-secondaire@example.fr', isPrimary: false},
        {email: 'marie-contact@example.fr', isPrimary: true}
      ],
      declarantRole: 'PRELEVEUR',
      socialReason: 'Élevage des Pyrénées',
      city: 'Perpignan',
      siret: '123 456 789 00010'
    }
  },
  {
    id: '2',
    email: 'reunion-preleveur-2@import.local',
    declarant: {
      declarantRole: 'PRELEVEUR',
      socialReason: 'ASA du Canal'
    }
  },
  {
    id: '3',
    email: 'collecteur@example.fr',
    declarant: {
      contactEmails: [{email: 'collecteur-contact@example.fr', isPrimary: true}],
      declarantRole: 'COLLECTEUR',
      socialReason: 'Collecteur de test'
    }
  }
]

test('searchCollecteurPreleveurs pagine la liste et calcule les compteurs globaux', t => {
  t.deepEqual(searchCollecteurPreleveurs(PRELEVEURS, {page: 1, pageSize: 2}), {
    items: PRELEVEURS.slice(0, 2),
    total: 3,
    page: 1,
    pageSize: 2,
    totalPages: 2,
    counts: {
      total: 3,
      preleveurs: 2,
      collecteurs: 1,
      withoutEmail: 1
    }
  })
})

test('searchCollecteurPreleveurs filtre les champs texte sans tenir compte des accents', t => {
  const result = searchCollecteurPreleveurs(PRELEVEURS, {
    page: 1,
    pageSize: 10,
    query: 'elevage pyrenees'
  })

  t.deepEqual(result.items, [PRELEVEURS[0]])
  t.is(result.total, 1)
})

test('searchCollecteurPreleveurs recherche aussi un SIRET compact', t => {
  const result = searchCollecteurPreleveurs(PRELEVEURS, {
    page: 1,
    pageSize: 10,
    query: '12345678900010'
  })

  t.deepEqual(result.items, [PRELEVEURS[0]])
})

test('searchCollecteurPreleveurs recherche les contacts métier sans exposer les logins techniques', t => {
  const contact = searchCollecteurPreleveurs(PRELEVEURS, {
    page: 1,
    pageSize: 10,
    query: 'marie-secondaire@example.fr'
  })
  const technicalLogin = searchCollecteurPreleveurs(PRELEVEURS, {
    page: 1,
    pageSize: 10,
    query: 'import.local'
  })

  t.deepEqual(contact.items, [PRELEVEURS[0]])
  t.deepEqual(technicalLogin.items, [])
})

test('searchCollecteurPreleveurs combine les filtres de rôle et d’email', t => {
  const withoutEmail = searchCollecteurPreleveurs(PRELEVEURS, {
    emailStatus: 'WITHOUT_EMAIL',
    page: 1,
    pageSize: 10,
    role: 'PRELEVEUR'
  })
  const collecteurs = searchCollecteurPreleveurs(PRELEVEURS, {
    emailStatus: 'WITH_EMAIL',
    page: 1,
    pageSize: 10,
    role: 'COLLECTEUR'
  })

  t.deepEqual(withoutEmail.items, [PRELEVEURS[1]])
  t.deepEqual(collecteurs.items, [PRELEVEURS[2]])
})

test('searchCollecteurPreleveurs utilise un login non technique en repli', t => {
  const withEmail = searchCollecteurPreleveurs([{
    id: 'fallback',
    email: 'fallback@example.fr',
    declarant: {declarantRole: 'PRELEVEUR', contactEmails: []}
  }], {
    emailStatus: 'WITH_EMAIL',
    query: 'fallback@example.fr'
  })

  t.is(withEmail.total, 1)
  t.is(withEmail.counts.withoutEmail, 0)
})

test('searchCollecteurPreleveurs conserve une page hors plage pour permettre la redirection serveur', t => {
  const result = searchCollecteurPreleveurs(PRELEVEURS, {page: 4, pageSize: 2})

  t.is(result.page, 4)
  t.is(result.totalPages, 2)
  t.deepEqual(result.items, [])
})
