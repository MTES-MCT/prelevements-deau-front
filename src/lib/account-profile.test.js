import test from 'ava'

import {
  buildProfilePayload,
  createProfileForm,
  getEditableProfileFieldNames,
  getPermissionGroups,
  getProfileDetailGroups,
  getZoneTypeLabel,
  validateProfile
} from './account-profile.js'

test('un compte personne physique exige le nom et le prénom', t => {
  const user = {declarantType: 'NATURAL_PERSON'}

  t.deepEqual(validateProfile({firstName: '', lastName: '  '}, user, 'DECLARANT'), {
    firstName: 'Le prénom est obligatoire.',
    lastName: 'Le nom est obligatoire.'
  })
})

test('une personne morale exige la structure mais pas le nom du contact', t => {
  const user = {declarantType: 'LEGAL_PERSON'}

  t.deepEqual(validateProfile({firstName: '', lastName: '', socialReason: ''}, user, 'DECLARANT'), {
    socialReason: 'Le nom de la structure est obligatoire.'
  })
})

test('les formats du téléphone et du code postal sont contrôlés lorsqu’ils sont renseignés', t => {
  const user = {declarantType: 'NATURAL_PERSON'}
  const errors = validateProfile({
    firstName: 'Lina',
    lastName: 'Martin',
    phoneNumber: '01 02 03 04 05',
    postalCode: '7500'
  }, user, 'DECLARANT')

  t.truthy(errors.phoneNumber)
  t.truthy(errors.postalCode)
})

test('le payload ne contient que les champs modifiables du type de compte', t => {
  const user = {
    declarantType: 'LEGAL_PERSON',
    firstName: 'Ancien prénom',
    lastName: null,
    socialReason: 'Ancienne structure',
    phoneNumber: null
  }
  const form = {
    firstName: ' Lina ',
    lastName: '',
    socialReason: ' Association Eau ',
    phoneNumber: '',
    email: 'interdit@example.test',
    role: 'ADMIN'
  }
  const payload = buildProfilePayload(form, user, 'DECLARANT')

  t.is(payload.firstName, 'Lina')
  t.is(payload.socialReason, 'Association Eau')
  t.false(Object.hasOwn(payload, 'lastName'))
  t.false(Object.hasOwn(payload, 'phoneNumber'))
  t.false(Object.hasOwn(payload, 'email'))
  t.false(Object.hasOwn(payload, 'role'))
})

test('le formulaire et la liste blanche varient selon le compte', t => {
  const instructorFields = getEditableProfileFieldNames({}, 'INSTRUCTOR')
  const adminForm = createProfileForm({firstName: null, lastName: 'Durand', phoneNumber: '0102030405'}, 'ADMIN')

  t.deepEqual(instructorFields, ['firstName', 'lastName', 'phoneNumber', 'jobTitle'])
  t.deepEqual(adminForm, {firstName: '', lastName: 'Durand'})
})

test('la présentation d’une personne morale reprend tous les champs modifiables avec des libellés métier', t => {
  const user = {
    declarantType: 'LEGAL_PERSON',
    socialReason: 'Syndicat des eaux',
    civility: 'MRS',
    firstName: 'Lina',
    lastName: 'Martin',
    phoneNumber: '0102030405',
    jobTitle: 'Responsable du service eau',
    addressLine1: '1 rue de la Source',
    addressLine2: 'Bâtiment B',
    poBox: 'BP 12',
    postalCode: '75001',
    city: 'Paris'
  }

  t.deepEqual(getProfileDetailGroups(user, 'DECLARANT'), [
    {
      id: 'structure',
      title: 'Structure',
      items: [{
        field: 'socialReason',
        label: 'Nom de la structure',
        value: 'Syndicat des eaux'
      }]
    },
    {
      id: 'main-contact',
      title: 'Contact principal',
      items: [
        {field: 'civility', label: 'Civilité du contact', value: 'Mme'},
        {field: 'firstName', label: 'Prénom du contact', value: 'Lina'},
        {field: 'lastName', label: 'Nom du contact', value: 'Martin'}
      ]
    },
    {
      id: 'professional-details',
      title: 'Coordonnées professionnelles',
      items: [
        {field: 'phoneNumber', label: 'Téléphone', value: '0102030405'},
        {field: 'jobTitle', label: 'Poste ou service', value: 'Responsable du service eau'}
      ]
    },
    {
      id: 'postal-address',
      title: 'Adresse postale',
      items: [
        {field: 'addressLine1', label: 'Adresse', value: '1 rue de la Source'},
        {field: 'addressLine2', label: 'Complément d’adresse', value: 'Bâtiment B'},
        {field: 'poBox', label: 'Boîte postale', value: 'BP 12'},
        {field: 'postalCode', label: 'Code postal', value: '75001'},
        {field: 'city', label: 'Commune', value: 'Paris'}
      ]
    }
  ])
})

test('la présentation varie selon le rôle et ne montre que les champs modifiables', t => {
  const scenarios = [
    {user: {declarantType: 'NATURAL_PERSON'}, role: 'DECLARANT'},
    {user: {}, role: 'INSTRUCTOR'},
    {user: {}, role: 'ADMIN'}
  ]

  for (const {user, role} of scenarios) {
    const displayedFields = getProfileDetailGroups(user, role)
      .flatMap(group => group.items.map(item => item.field))
      .sort()
    const editableFields = getEditableProfileFieldNames(user, role).sort()

    t.deepEqual(displayedFields, editableFields)
  }

  t.deepEqual(
    getProfileDetailGroups({}, 'INSTRUCTOR').map(group => group.title),
    ['Identité', 'Coordonnées professionnelles']
  )
  t.deepEqual(
    getProfileDetailGroups({}, 'ADMIN').map(group => group.title),
    ['Identité']
  )
})

test('les valeurs absentes et les civilités sont présentées sans code technique', t => {
  const emptyValues = getProfileDetailGroups({
    declarantType: 'NATURAL_PERSON',
    civility: 'UNKNOWN',
    firstName: '  ',
    lastName: null
  }, 'DECLARANT')
    .flatMap(group => group.items.map(item => item.value))

  t.true(emptyValues.every(value => value === 'Non renseigné'))
  t.is(
    getProfileDetailGroups({declarantType: 'NATURAL_PERSON', civility: 'MR'}, 'DECLARANT')[0].items[0].value,
    'M.'
  )
  t.is(
    getProfileDetailGroups({declarantType: 'NATURAL_PERSON', civility: 'MRS'}, 'DECLARANT')[0].items[0].value,
    'Mme'
  )
})

test('les zones et permissions utilisent les libellés humains du catalogue', t => {
  const catalog = {
    groups: [{
      code: 'points',
      label: 'Points de prélèvement',
      permissions: [
        {code: 'pp.list', label: 'Voir la liste des points'},
        {code: 'pp.update', label: 'Modifier un point'}
      ]
    }]
  }

  t.is(getZoneTypeLabel('DEPARTEMENT'), 'Département')
  t.is(getZoneTypeLabel('UNKNOWN'), 'Zone d’intervention')
  t.deepEqual(getPermissionGroups(catalog, ['pp.update']), [{
    code: 'points',
    label: 'Points de prélèvement',
    permissions: [{code: 'pp.update', label: 'Modifier un point'}]
  }])
})
