import test from 'ava'

import {
  getActiveAdminNavigationItem,
  isAdminNavigationPath
} from '@/lib/admin-navigation.js'

test('isAdminNavigationPath reconnaît uniquement les vues administratives', t => {
  t.true(isAdminNavigationPath('/administration'))
  t.true(isAdminNavigationPath('/comptes-service/123/identifiants'))
  t.true(isAdminNavigationPath('/declarations/a-rejouer'))
  t.false(isAdminNavigationPath('/declarations/123'))
  t.false(isAdminNavigationPath('/zones'))
})

test('getActiveAdminNavigationItem retrouve la section active', t => {
  t.is(getActiveAdminNavigationItem('/notifications-declarations')?.key, 'notifications')
  t.is(getActiveAdminNavigationItem('/types-declaration/nouveau')?.key, 'declaration-types')
  t.is(getActiveAdminNavigationItem('/declarations')?.key, undefined)
})
