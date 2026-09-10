import React from 'react'

import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {runInNewContext} from 'node:vm'

import test from 'ava'
import {transformSync} from 'next/dist/build/swc/index.js'
import {renderToStaticMarkup} from 'react-dom/server'

import * as navigation from '../../lib/admin-navigation.js'
import * as campaignCalendar from '../../lib/campaign-calendar.js'
import * as campaignTimeline from '../../lib/campaign-timeline.js'
import * as campaignHelpers from '../../lib/collection-campaigns.js'

const require = createRequire(import.meta.url)

function harness({role = 'ADMIN', authenticated = true, impersonating = false, result = {success: true, data: {items: [], permissions: {canCreate: true}}}} = {}) {
  const user = authenticated ? {role, impersonation: {active: impersonating}} : undefined
  const calls = []
  const denied = new Error('FORBIDDEN')
  const load = path => {
    const filename = new URL(`../../${path}.js`, import.meta.url)
    const {code} = transformSync(readFileSync(filename, 'utf8'), {filename: filename.pathname, jsc: {parser: {syntax: 'ecmascript', jsx: true}, transform: {react: {runtime: 'automatic'}}, target: 'es2022'}, module: {type: 'commonjs'}})
    const compiledModule = {exports: {}}
    const componentRequire = specifier => {
      if (specifier === 'next/navigation') {
        return {
          usePathname: () => '/administration/campagnes', forbidden() {
            throw denied
          }, redirect(path) {
            throw new Error(`REDIRECT:${path}`)
          }
        }
      }

      if (specifier === 'next/link') {
        return ({children, ...props}) => React.createElement('a', props, children)
      }

      if (specifier === '@/contexts/auth-methods-context.js') {
        return {useAuthMethods: () => ({available: false, methods: []})}
      }

      if (specifier === '@/contexts/auth-context.js') {
        return {useAuth: () => ({user})}
      }

      if (specifier === '@/lib/admin-navigation.js') {
        return navigation
      }

      if (specifier === '@/lib/collection-campaigns.js') {
        return campaignHelpers
      }

      if (specifier === '@/lib/campaign-calendar.js') {
        return campaignCalendar
      }

      if (specifier === '@/lib/campaign-timeline.js') {
        return campaignTimeline
      }

      if (specifier === '@/server/actions/user.js') {
        return {getCurrentUser: async () => ({success: authenticated, data: user})}
      }

      if (specifier === '@/server/actions/campaigns.js') {
        return {
          async listCampaignsAction() {
            calls.push('list')
            return result
          }
        }
      }

      if (specifier === '@/dsfr-bootstrap/index.js') {
        return {StartDsfrOnHydration: () => null}
      }

      if (specifier === '@/components/campaigns/campaign-pages.js') {
        return {CampaignListPage: () => React.createElement('div', null, 'Liste des campagnes partagées')}
      }

      if (specifier.startsWith('@/components/')) {
        return load(specifier.slice(2, -3))
      }

      return require(specifier)
    }

    runInNewContext('(function(require, module, exports) {' + code + '\n})', {})(componentRequire, compiledModule, compiledModule.exports)
    return compiledModule.exports
  }

  return {
    calls, denied,
    page: load('app/administration/campagnes/page').default,
    directPage: load('app/campagnes/page').default,
    navigation: load('components/admin/admin-sub-navigation').default
  }
}

test('la page admin réutilise les campagnes sous une seule navigation et un seul titre', async t => {
  const flow = harness()
  const html = renderToStaticMarkup(await flow.page())
  t.is(flow.calls.length, 1)
  t.true(html.includes('Navigation de l’administration'))
  t.true(html.includes('Campagnes de collecte'))
  t.true(html.includes('href="/administration/campagnes"'))
  t.true(html.includes('aria-current="page"'))
  t.true(html.includes('href="/campagnes/nouvelle"'))
  t.is((html.match(/<h1\b/g) || []).length, 1)
  t.false(html.includes('href="/tableau-de-bord"'))
})

test('un utilisateur non admin ne peut pas charger la page ou déclencher la lecture des campagnes', async t => {
  for (const options of [{role: 'INSTRUCTOR'}, {role: 'DECLARANT'}, {authenticated: false}]) {
    const flow = harness(options)
    // eslint-disable-next-line no-await-in-loop
    const error = await t.throwsAsync(() => flow.page())
    t.is(error, flow.denied)
    t.is(flow.calls.length, 0)
  }
})

test('le raccourci admin reste invisible hors admin et pendant une usurpation', t => {
  for (const options of [{role: 'INSTRUCTOR'}, {role: 'DECLARANT'}, {authenticated: false}, {impersonating: true}]) {
    const flow = harness(options)
    const html = renderToStaticMarkup(React.createElement(flow.navigation))
    t.false(html.includes('href="/administration/campagnes"'))
  }
})

test('une erreur de chargement dans l’administration ne propose pas de créer une campagne', async t => {
  const flow = harness({result: {success: false, error: 'Chargement indisponible'}})
  const html = renderToStaticMarkup(await flow.page())
  t.true(html.includes('Chargement indisponible'))
  t.false(html.includes('href="/campagnes/nouvelle"'))
})

test('le retour à la liste mène les administrateurs à leur configuration', async t => {
  const flow = harness()
  const error = await t.throwsAsync(() => flow.directPage())
  t.is(error.message, 'REDIRECT:/administration/campagnes')
  t.is(flow.calls.length, 0)
})

test('les URL partagées des autres rôles continuent vers la liste métier sans restriction admin', async t => {
  for (const role of ['DECLARANT', 'INSTRUCTOR']) {
    const flow = harness({role})
    // eslint-disable-next-line no-await-in-loop
    const html = renderToStaticMarkup(await flow.directPage())
    t.true(html.includes('Liste des campagnes partagées'))
  }
})
