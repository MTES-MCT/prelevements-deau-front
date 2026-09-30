import React from 'react'

import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {runInNewContext} from 'node:vm'

import test from 'ava'
import {transformSync} from 'next/dist/build/swc/index.js'
import {renderToStaticMarkup} from 'react-dom/server'

import {singleCampaignResponseHref} from '../../../lib/campaigns.js'

const require = createRequire(import.meta.url)
const campaign = {success: true, data: {data: {campaign: {id: 'campaign'}, permissions: {canManage: true}}}}
const responses = {success: true, data: {data: {items: [{id: 'response'}], total: 1}}}

function harness({admin = false, user = {role: 'ADMIN'}, campaignResult = campaign, responseResult = responses} = {}) {
  const calls = []
  const filename = new URL(admin ? '../../administration/campagnes/[id]/page.js' : 'page.js', import.meta.url)
  const componentRequire = specifier => {
    if (specifier === '@/components/campaigns/campaign-detail.js') return {__esModule: true, default: props => React.createElement('div', null, props.initialError || `Réponses : ${props.initialResponses?.total}`)}
    if (specifier === '@/server/actions/campaigns.js') return {
      getCampaignAction: async () => { calls.push('campaign'); return campaignResult },
      getCampaignResponsesAction: async (_id, options) => { calls.push(options?.view === 'summary' ? 'summary-responses' : 'responses'); return responseResult }
    }
    if (specifier === '@/server/actions/user.js') return {getCurrentSessionInfo: async () => ({data: user})}
    if (specifier === '@/lib/campaigns.js') return {singleCampaignResponseHref}
    if (specifier === 'next/navigation') return Object.fromEntries(['forbidden', 'notFound', 'redirect'].map(name => [name, value => { throw new Error(`${name}:${value ?? ''}`) }]))
    if (specifier === '@codegouvfr/react-dsfr/Alert') return {Alert: ({title}) => React.createElement('div', {role: 'alert'}, title)}
    return require(specifier)
  }
  const {code} = transformSync(readFileSync(filename, 'utf8'), {filename: filename.pathname, jsc: {parser: {syntax: 'ecmascript', jsx: true}, transform: {react: {runtime: 'automatic'}}, target: 'es2022'}, module: {type: 'commonjs'}})
  const compiled = {exports: {}}
  runInNewContext('(function(require, module, exports) {' + code + '\n})', {})(componentRequire, compiled, compiled.exports)
  return {calls, page: () => compiled.exports.default({params: Promise.resolve({id: 'campaign'})})}
}

for (const admin of [false, true]) {
  test(`la page campagne ${admin ? 'administrateur' : 'déclarant'} lance les deux lectures sans attendre la première`, async t => {
    const deferred = Promise.withResolvers()
    const flow = harness({admin, campaignResult: deferred.promise})
    const pendingPage = flow.page()
    await new Promise(resolve => setImmediate(resolve))
    t.deepEqual(flow.calls, ['campaign', 'summary-responses'])
    deferred.resolve(campaign)
    t.true(renderToStaticMarkup(await pendingPage).includes('Réponses : 1'))
  })
}

test('la page administration refuse les non-administrateurs avant toute lecture de campagne', async t => {
  const flow = harness({admin: true, user: {role: 'DECLARANT'}})
  await t.throwsAsync(flow.page(), {message: 'forbidden:'})
  t.deepEqual(flow.calls, [])
})

test('la page conserve les erreurs campagne et ne montre pas une liste reçue parallèlement', async t => {
  const absent = harness({campaignResult: {code: 404, success: false}})
  await t.throwsAsync(absent.page(), {message: 'notFound:'})
  const forbidden = harness({campaignResult: {code: 403, success: false}})
  await t.throwsAsync(forbidden.page(), {message: 'forbidden:'})
  const failed = harness({campaignResult: {success: false, error: 'Erreur'}})
  const html = renderToStaticMarkup(await failed.page())
  t.true(html.includes('Campagne indisponible'))
  t.false(html.includes('Réponses'))
})

test('un échec de liste reste une erreur visible et ne devient pas un résultat vide', async t => {
  const flow = harness({responseResult: {success: false, error: 'Réponses indisponibles'}})
  t.true(renderToStaticMarkup(await flow.page()).includes('Réponses indisponibles'))
})

test('le préleveur conserve la redirection vers sa seule réponse', async t => {
  const flow = harness({campaignResult: {success: true, data: {data: {campaign: {id: 'campaign'}, permissions: {canRespond: true, canManage: false, canReadResults: false}}}}})
  await t.throwsAsync(flow.page(), {message: 'redirect:/campagnes/campaign/reponses/response'})
})
