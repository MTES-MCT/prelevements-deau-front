import test from 'ava'

import {
  buildProfilePayload,
  createProfileForm,
  getEditableProfileFieldNames,
  getPermissionGroups,
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
