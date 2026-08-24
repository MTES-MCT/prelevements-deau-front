import test from 'ava'

import {
  ADMIN_NAVIGATION_ITEMS,
  getActiveAdminNavigationItem,
  getVisibleAdminNavigationItems,
  isAdminNavigationPath
} from '@/lib/admin-navigation.js'

test('le journal d’audit termine la navigation d’administration', t => {
  t.is(ADMIN_NAVIGATION_ITEMS.at(-1).key, 'audit-log')
})

test('isAdminNavigationPath reconnaît uniquement les vues administratives', t => {
  t.true(isAdminNavigationPath('/administration'))
  t.true(isAdminNavigationPath('/administration/journal-audit'))
  t.true(isAdminNavigationPath('/administration/acces-mot-de-passe'))
  t.true(isAdminNavigationPath('/comptes-service/123/identifiants'))
  t.true(isAdminNavigationPath('/declarations/a-rejouer'))
  t.false(isAdminNavigationPath('/declarations/123'))
  t.false(isAdminNavigationPath('/zones'))
})

test('getActiveAdminNavigationItem retrouve la section active', t => {
  t.is(getActiveAdminNavigationItem('/notifications-declarations')?.key, 'notifications')
  t.is(getActiveAdminNavigationItem('/administration/journal-audit')?.key, 'audit-log')
  t.is(getActiveAdminNavigationItem('/types-declaration/nouveau')?.key, 'declaration-types')
  t.is(getActiveAdminNavigationItem('/declarations')?.key, undefined)
})

test('l’accès par mot de passe apparaît uniquement lorsque la méthode est disponible', t => {
  const withoutPassword = getVisibleAdminNavigationItems({
    available: true,
    authMethods: ['magic_link']
  })
  const withPassword = getVisibleAdminNavigationItems({
    available: true,
    authMethods: ['password', 'magic_link']
  })

  t.false(withoutPassword.some(item => item.key === 'password-accesses'))
  t.true(withPassword.some(item => item.key === 'password-accesses'))
})
