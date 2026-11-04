import test from 'ava'

import {isAuthGuardPublicPath, isMiddlewarePublicPath} from './public-paths.js'
import {compactPreleveurProfiles, getPreleveurSelectionRedirect} from './preleveur-profiles.js'

test('la sélection reste protégée et redirige les écrans métier, y compris l’accueil', t => {
  const profiles = {enabled: true, selectionRequired: true}
  t.false(isMiddlewarePublicPath('/choisir-preleveur'))
  t.false(isAuthGuardPublicPath('/choisir-preleveur'))
  for (const path of ['/', '/tableau-de-bord', '/mon-compte', '/points-prelevement/ancien']) {
    t.is(getPreleveurSelectionRedirect(path, profiles), '/choisir-preleveur')
  }
})

test('ne bloque ni la rotation NextAuth ni la sélection ni les routes publiques et API', t => {
  for (const path of ['/choisir-preleveur', '/auth/nextauth/session', '/auth/nextauth/csrf', '/auth/callback', '/api/dashboard/territory', '/api/auth/verify/token', '/login', '/stats']) {
    t.is(getPreleveurSelectionRedirect(path, {enabled: true, selectionRequired: true}), null)
  }
  t.is(getPreleveurSelectionRedirect('/tableau-de-bord', null), null)
  t.is(getPreleveurSelectionRedirect('/tableau-de-bord', {enabled: true, selectionRequired: false}), null)
})

test('ne conserve que les indicateurs explicites, jamais la liste des préleveurs', t => {
  t.deepEqual(compactPreleveurProfiles({enabled: true, selectionRequired: true, preleveurs: [{id: 'secret'}]}), {enabled: true, selectionRequired: true})
  t.deepEqual(compactPreleveurProfiles({enabled: false, canManageAccount: false}), {enabled: false, selectionRequired: false, canManageAccount: false})
  t.deepEqual(compactPreleveurProfiles({enabled: true, selectionRequired: 'true'}), {enabled: true, selectionRequired: false})
  t.deepEqual(compactPreleveurProfiles({enabled: true, canManageAccount: false}), {enabled: true, selectionRequired: false, canManageAccount: false})
})
