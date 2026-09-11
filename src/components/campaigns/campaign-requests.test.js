import React from 'react'

import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {runInNewContext} from 'node:vm'

import test from 'ava'
import {transformSync} from 'next/dist/build/swc/index.js'
import {renderToStaticMarkup} from 'react-dom/server'

import * as requestHelpers from '../../lib/campaign-requests.js'
import * as campaignHelpers from '../../lib/collection-campaigns.js'

const require = createRequire(import.meta.url)
const load = (name, {role = 'DECLARANT', fetchRequests = async () => ({success: true, data: {items: []}})} = {}) => {
  const filename = new URL(`${name}.js`, import.meta.url)
  const {code} = transformSync(readFileSync(filename, 'utf8'), {filename: filename.pathname, jsc: {parser: {syntax: 'ecmascript', jsx: true}, transform: {react: {runtime: 'automatic'}}, target: 'es2022'}, module: {type: 'commonjs'}})
  const compiledModule = {exports: {}}
  const componentRequire = specifier => {
    if (specifier === '@/lib/campaign-requests.js') {
      return requestHelpers
    }

    if (specifier === '@/lib/collection-campaigns.js') {
      return campaignHelpers
    }

    if (specifier === '@/server/actions/campaigns.js') {
      return {listCampaignRequestsAction: fetchRequests}
    }

    if (specifier === '@/server/actions/user.js') {
      return {getCurrentSessionInfo: async () => ({success: Boolean(role), data: {role}})}
    }

    if (specifier === '@/components/campaigns/campaign-requests.js') {
      return load('campaign-requests')
    }

    if (specifier === 'next/link') {
      return function Link({children, ...props}) {
        return React.createElement('a', props, children)
      }
    }

    return require(specifier)
  }

  runInNewContext('(function(require, module, exports) {' + code + '\n})', {})(componentRequire, compiledModule, compiledModule.exports)
  return compiledModule.exports
}

const Requests = load('campaign-requests').default
const item = {
  campaign: {
    id: 'campaign', name: 'Relevés 2026 et besoins 2027', status: 'OPEN', timezone: 'Europe/Paris', owner: {label: 'Organisme du bassin'}, closesAt: '2026-11-01T00:00:00Z'
  },
  preleveur: {userId: 'farmer', label: 'Ferme du moulin'}, pointCount: 2,
  responses: {INDEX: {status: 'SUBMITTED', canEdit: true, latestSubmissionAt: '2026-09-01'}, NEEDS: {status: null, canEdit: true}}
}
const render = props => renderToStaticMarkup(React.createElement(Requests, {now: new Date('2026-09-08').getTime(), ...props}))

test('aucune demande : aucune rubrique inutile ni nouvel onglet', t => {
  t.is(render({initialData: {items: []}}), '')
})

test('les deux volets sont réunis sous une demande, avec émetteur, échéance et statuts réels', t => {
  const html = render({initialData: {items: [item]}})
  t.is((html.match(/<article/g) || []).length, 1)
  t.true(html.includes('Demandes reçues'))
  t.true(html.includes('Demandé par Organisme du bassin'))
  t.true(html.includes('Date limite'))
  t.true(html.includes('Relevés de compteurs'))
  t.true(html.includes('Besoins en eau'))
  t.true(html.includes('Transmis'))
  t.true(html.includes('À compléter'))
  t.true(html.includes('href="/mes-index/campaign?preleveurUserId=farmer"'))
  t.true(html.includes('href="/mes-besoins/campaign?preleveurUserId=farmer"'))
  t.false(html.includes('role="tab'))
  t.false(html.includes('Mes index de prélèvement'))
  t.false(html.includes('href="/campagnes'))
})

test('le collecteur sait pour quel préleveur il répond', t => {
  t.true(render({initialData: {items: [item]}, showPreleveur: true}).includes('Ferme du moulin'))
})

test('les demandes transmises ou non modifiables restent consultables sans fausse action', t => {
  const html = render({initialData: {items: [{...item, responses: {INDEX: {status: 'SUBMITTED'}, NEEDS: {status: 'SUBMITTED'}}}]}})
  t.true(html.includes('<details'))
  t.true(html.includes('Demandes transmises ou à consulter (1)'))
  t.false(html.includes('>Renseigner</a>'))
  t.false(html.includes('À compléter'))
})

test('les pages suivantes restent accessibles et une erreur propose un nouvel essai', t => {
  t.true(render({initialData: {items: [item], pagination: {hasMore: true, nextCursor: 'next'}}}).includes('Afficher plus de demandes'))
  const html = render({initialError: 'Erreur'})
  t.true(html.includes('role="alert"'))
  t.true(html.includes('Réessayer'))
  t.true(html.includes('Vos déclarations restent disponibles'))
})

test('la section serveur ne charge aucune demande pour les autres rôles', async t => {
  for (const role of ['ADMIN', 'INSTRUCTOR', null]) {
    const section = load('campaign-requests-section', {role, fetchRequests: async () => t.fail('Appel inattendu')}).default

    t.is(await section(), null)
  }
})

test('la section serveur affiche une erreur sans casser les déclarations', async t => {
  const section = load('campaign-requests-section', {fetchRequests: async () => ({success: false, error: 'Indisponible'})}).default
  const html = renderToStaticMarkup(await section())
  t.true(html.includes('Les demandes n’ont pas pu être chargées'))
})
