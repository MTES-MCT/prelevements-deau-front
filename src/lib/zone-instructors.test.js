import test from 'ava'

import {
  formatAccessPeriod,
  getHabilitationRoleLabel,
  getHabilitationStatusLabel,
  getInstructorName,
  getZoneLabel,
  pluralize
} from './zone-instructors.js'

test('getInstructorName privilégie le nom complet puis l’email', t => {
  t.is(getInstructorName({
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.test'
  }), 'Ada Lovelace')

  t.is(getInstructorName({
    email: 'ada@example.test'
  }), 'ada@example.test')
})

test('formatAccessPeriod affiche les périodes ouvertes et bornées', t => {
  t.is(formatAccessPeriod(null, null), 'Accès permanent')
  t.is(formatAccessPeriod(null, '2026-07-31'), 'Jusqu’au 31/07/2026')
  t.is(formatAccessPeriod('2026-07-01', '2026-07-31'), 'Du 01/07/2026 au 31/07/2026')
})

test('les libellés d’habilitation restent explicites', t => {
  t.is(getHabilitationStatusLabel('ACTIVE'), 'Active')
  t.is(getHabilitationStatusLabel('FUTURE'), 'À venir')
  t.is(getHabilitationStatusLabel('ENDED'), 'Terminée')
  t.is(getHabilitationRoleLabel({isAdmin: true}), 'Admin de zone')
  t.is(getHabilitationRoleLabel({isAdmin: false}), 'Consultation')
})

test('getZoneLabel et pluralize formatent les résumés de sélection', t => {
  t.is(getZoneLabel({name: 'SAGE Adour', code: 'SAGE04001'}), 'SAGE Adour (SAGE04001)')
  t.is(getZoneLabel({}), 'Zone sans nom')
  t.is(pluralize(1, 'zone'), '1 zone')
  t.is(pluralize(3, 'zone'), '3 zones')
})
