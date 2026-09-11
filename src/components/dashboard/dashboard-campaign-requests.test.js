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
const load = ({fetchRequests = async () => ({success: true, data: {items: []}})} = {}) => {
  const filename = new URL('dashboard-campaign-requests.js', import.meta.url)
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

const Summary = load().CampaignRequestsSummary
const user = {id: 'farmer', role: 'DECLARANT', declarantRole: 'PRELEVEUR'}
const item = {
  campaign: {
    id: 'campaign', name: 'Collecte du bassin', status: 'OPEN', timezone: 'Europe/Paris', owner: {label: 'Collecteur du bassin'}
  },
  preleveur: {userId: 'farmer', label: 'Ferme du moulin'}, pointCount: 2, deadlineAt: '2026-11-01T00:00:00Z',
  responses: {INDEX: {status: 'SUBMITTED', canEdit: true, canSubmit: true}, NEEDS: {status: 'DRAFT', canEdit: true, canSubmit: true}}
}
const render = (data, props = {}) => renderToStaticMarkup(React.createElement(Summary, {data, user, ...props}))

test('aucun bloc vide ni action pour une demande transmise ou non modifiable', t => {
  t.is(render({items: []}), '')
  t.is(render({items: [{...item, responses: {INDEX: {status: 'SUBMITTED', canEdit: true}, NEEDS: {canEdit: false}}}]}), '')
})

test('le résumé conserve seulement les actions autorisées et les bons liens de réponse', t => {
  const html = render({items: [item], total: 1})
  t.true(html.includes('Demandes à compléter'))
  t.true(html.includes('Collecte du bassin'))
  t.true(html.includes('Demandé par Collecteur du bassin'))
  t.true(html.includes('Prochaine échéance'))
  t.true(html.includes('href="/mes-declarations#demandes"'))
  t.true(html.includes('href="/mes-besoins/campaign?preleveurUserId=farmer"'))
  t.false(html.includes('href="/mes-index/'))
  t.false(html.includes('Consulter'))
  t.false(html.includes('Télécharger'))
})

test('le total porte sur toutes les demandes et le résumé reste limité à trois cartes', t => {
  const items = Array.from({length: 5}, (_, index) => ({...item, campaign: {...item.campaign, id: `campaign-${index}`, name: `Priorité ${index}`}}))
  const html = render({items, total: 12})
  t.is((html.match(/<article/g) ?? []).length, 3)
  t.true(html.includes('12 demandes à compléter'))
  t.true(html.indexOf('Priorité 0') < html.indexOf('Priorité 1'))
  t.false(html.includes('Priorité 3'))
})

test('le collecteur partiellement mandaté voit le préleveur et ne promet aucune transmission', t => {
  const html = render({items: [{...item, responses: {INDEX: {canEdit: true, canSubmit: false}, NEEDS: {canEdit: false}}}], total: 1}, {user: {id: 'collector', role: 'DECLARANT', declarantRole: 'COLLECTEUR'}})
  t.true(html.includes('Ferme du moulin'))
  t.true(html.includes('href="/mes-index/campaign?preleveurUserId=farmer"'))
  t.false(html.includes('href="/mes-besoins/'))
  t.true(html.includes('Complétez les points qui vous sont confiés'))
  t.false(html.includes('>Transmettre'))
})

test('un volet réouvert reste visible sans remettre en avant le volet fermé', t => {
  const html = render({items: [{...item, campaign: {...item.campaign, status: 'CLOSED'}, responses: {INDEX: {canEdit: false}, NEEDS: {status: 'DRAFT', canEdit: true, canSubmit: true}}}]})
  t.true(html.includes('Besoins en eau'))
  t.false(html.includes('Relevés de compteurs'))
})

test('les agents, administrateurs et anonymes ne déclenchent aucun appel', async t => {
  const section = load({fetchRequests: async () => t.fail('Appel inattendu')}).default
  for (const role of ['ADMIN', 'INSTRUCTOR', null]) {

    t.is(await section({user: {role}}), null)
    t.is(render({items: [item]}, {user: {role}}), '')
  }
})

test('la section demande au serveur le filtrage global des trois prochaines échéances', async t => {
  let parameters
  const section = load({
    async fetchRequests(query) {
      parameters = query
      return {success: true, data: {data: {items: [item], total: 8}}}
    }
  }).default
  const html = renderToStaticMarkup(await section({user}))
  t.deepEqual({...parameters}, {actionableOnly: true, limit: 3})
  t.true(html.includes('8 demandes à compléter'))
})

test('une panne des demandes ne bloque pas le rendu du tableau de bord', async t => {
  const failed = load({fetchRequests: async () => ({success: false, error: 'Indisponible'})}).default
  t.is(await failed({user}), null)
  const rejected = load({
    async fetchRequests() {
      throw new Error('Indisponible')
    }
  }).default
  t.is(await rejected({user}), null)
})

test('le chargement est indépendant des graphiques et le bloc est placé après le bonjour', t => {
  const page = readFileSync(new URL('../../app/tableau-de-bord/page.js', import.meta.url), 'utf8')
  const dashboard = readFileSync(new URL('dashboard-page.js', import.meta.url), 'utf8')
  t.true(page.includes('isDeclarant ? <Suspense fallback={null}><DashboardCampaignRequests user={user} /></Suspense> : null'))
  t.true(dashboard.indexOf('{isDeclarant && campaignRequests}') > dashboard.indexOf('\'Bonjour,\''))
  t.true(dashboard.indexOf('{isDeclarant && campaignRequests}') < dashboard.indexOf('title=\'Mon activité\''))
})
