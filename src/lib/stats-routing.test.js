import test from 'ava'

import nextConfig from '../../next.config.mjs'

import {isAuthGuardPublicPath, isMiddlewarePublicPath} from './public-paths.js'
import {
  LEGACY_STATS_PATH,
  STATS_FOOTER_ITEM,
  STATS_PATH
} from './public-routes.js'

test('the exact stats page is public in the middleware and session guard', t => {
  t.true(isMiddlewarePublicPath(STATS_PATH))
  t.true(isAuthGuardPublicPath(STATS_PATH))
})

test('similar and nested stats paths remain protected', t => {
  for (const pathname of ['/stats-detail', '/stats/foo', '/statistiques']) {
    t.false(isMiddlewarePublicPath(pathname))
    t.false(isAuthGuardPublicPath(pathname))
  }
})

test('existing public path rules remain unchanged', t => {
  t.true(isMiddlewarePublicPath('/'))
  t.true(isMiddlewarePublicPath('/login'))
  t.true(isMiddlewarePublicPath('/auth/callback'))
  t.false(isMiddlewarePublicPath('/login/help'))

  t.true(isAuthGuardPublicPath('/'))
  t.true(isAuthGuardPublicPath('/login'))
  t.true(isAuthGuardPublicPath('/login/help'))
  t.true(isAuthGuardPublicPath('/auth/callback'))
})

test('legacy statistics route redirects permanently to stats', async t => {
  const redirects = await nextConfig.redirects()

  t.deepEqual(redirects.find(({source}) => source === LEGACY_STATS_PATH), {
    source: LEGACY_STATS_PATH,
    destination: STATS_PATH,
    permanent: true
  })
})

test('footer navigation links to the public stats page', t => {
  t.deepEqual(STATS_FOOTER_ITEM, {
    text: 'Statistiques',
    linkProps: {href: STATS_PATH}
  })
})
