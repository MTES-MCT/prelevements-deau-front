import React from 'react'

import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {runInNewContext} from 'node:vm'

import test from 'ava'
import {transformSync} from 'next/dist/build/swc/index.js'
import {renderToStaticMarkup} from 'react-dom/server'

import * as campaignHelpers from '../../lib/collection-campaigns.js'

const require = createRequire(import.meta.url)
const loadComponent = (name, actions = {}) => {
  const filename = new URL(`${name}.js`, import.meta.url)
  const {code} = transformSync(readFileSync(filename, 'utf8'), {filename: filename.pathname, jsc: {parser: {syntax: 'ecmascript', jsx: true}, transform: {react: {runtime: 'automatic'}}, target: 'es2022'}, module: {type: 'commonjs'}})
  const compiledModule = {exports: {}}
  const componentRequire = specifier => {
    if (specifier === '@/lib/collection-campaigns.js') {
      return campaignHelpers
    }

    if (specifier === '@/server/actions/campaigns.js') {
      return actions
    }

    if (specifier === '@/components/campaigns/campaign-ui.js') {
      return loadComponent('campaign-ui', actions)
    }

    if (specifier === '@/components/campaigns/campaign-response-form.js') {
      return ({initialContext, kind}) => React.createElement('div', {'data-kind': kind, 'data-preleveur': initialContext.preleveurUserId})
    }

    if (specifier.startsWith('@/components/campaigns/')) {
      return () => null
    }

    if (specifier === '@/dsfr-bootstrap/index.js') {
      return {StartDsfrOnHydration: () => null}
    }

    if (specifier === 'next/link') {
      return ({children, ...props}) => React.createElement('a', props, children)
    }

    return require(specifier)
  }

  runInNewContext('(function(require, module, exports) {' + code + '\n})', {})(componentRequire, compiledModule, compiledModule.exports)
  return compiledModule.exports
}

test('une erreur de réponse renvoie vers Mes déclarations, une erreur de gestion vers les campagnes', async t => {
  const {CampaignDetailPage: detailPage} = loadComponent('campaign-pages', {
    getCampaignContextAction: async () => ({success: false, error: 'Réponse indisponible'}),
    getCampaignAction: async () => ({success: false, error: 'Campagne indisponible'})
  })
  const response = renderToStaticMarkup(await detailPage({id: 'campaign', kind: 'INDEX'}))
  t.true(response.includes('Relevés de compteurs'))
  t.true(response.includes('href="/mes-declarations#demandes">Mes déclarations</a>'))
  t.false(response.includes('href="/campagnes"'))
  const management = renderToStaticMarkup(await detailPage({id: 'campaign'}))
  t.true(management.includes('href="/campagnes">Retour</a>'))
  t.false(management.includes('href="/mes-declarations#demandes"'))
})

test('une création non autorisée ne propose qu’un retour vers les déclarations et demandes', async t => {
  let optionCalls = 0
  const {CampaignCreatePage: createPage} = loadComponent('campaign-pages', {
    listCampaignsAction: async () => ({success: true, data: {permissions: {canCreate: false}}}),
    async getCampaignOptionsAction() {
      optionCalls++
      return {success: true, data: {}}
    }
  })
  const html = renderToStaticMarkup(await createPage())
  t.is((html.match(/href="\/mes-declarations#demandes"/g) || []).length, 1)
  t.false(html.includes('href="/mes-index"'))
  t.false(html.includes('href="/mes-besoins"'))
  t.false(html.includes('href="/campagnes"'))
  t.is(optionCalls, 0)
})

test('la page de réponse conserve le préleveur transmis par un collecteur dans sa lecture de contexte', async t => {
  const calls = []
  const {CampaignDetailPage: detailPage} = loadComponent('campaign-pages', {
    async getCampaignContextAction(campaignId, preleveurUserId) {
      calls.push([campaignId, preleveurUserId])
      return {success: true, data: {permissions: {canRead: true}, preleveurUserId}}
    }
  })
  const html = renderToStaticMarkup(await detailPage({id: 'campaign', kind: 'NEEDS', preleveurUserId: 'represented-user'}))
  t.deepEqual(calls, [['campaign', 'represented-user']])
  t.true(html.includes('data-kind="NEEDS"'))
  t.true(html.includes('data-preleveur="represented-user"'))
})

test('les liens de réponse encodent le contexte et n’inventent aucun type de demande', t => {
  t.is(campaignHelpers.campaignResponseHref('campaign', 'INDEX', 'user & other'), '/mes-index/campaign?preleveurUserId=user+%26+other')
  t.is(campaignHelpers.campaignResponseHref('campaign', 'NEEDS'), '/mes-besoins/campaign')
  t.is(campaignHelpers.campaignResponseHref('id/with-path', 'NEEDS', 'user'), '/mes-besoins/id%2Fwith-path?preleveurUserId=user')
  t.is(campaignHelpers.campaignResponseHref('campaign', 'UNKNOWN'), null)
})
