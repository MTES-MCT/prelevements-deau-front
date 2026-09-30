import React from 'react'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {runInNewContext} from 'node:vm'

import test from 'ava'
import {transformSync} from 'next/dist/build/swc/index.js'
import {renderToStaticMarkup} from 'react-dom/server'

const require = createRequire(import.meta.url)

function compile(file, stubs) {
  const filename = new URL(file, import.meta.url)
  const {code} = transformSync(readFileSync(filename, 'utf8'), {filename: filename.pathname, jsc: {parser: {syntax: 'ecmascript', jsx: true}, transform: {react: {runtime: 'automatic'}}, target: 'es2022'}, module: {type: 'commonjs'}})
  const compiled = {exports: {}}
  runInNewContext('(function(require, module, exports) {' + code + '\n})', {})(name => stubs[name] ?? require(name), compiled, compiled.exports)
  return compiled.exports.default
}

function harness({role = 'DECLARANT', declarantRole = 'PRELEVEUR', permissions = [], canCreate = true} = {}) {
  const summary = Promise.withResolvers()
  const calls = []
  const actions = compile('../../components/dashboard/dashboard-declaration-actions.js', {
    'next/link': {__esModule: true, default: ({children, href}) => React.createElement('a', {href}, children)},
    '@/components/campaigns/campaign-common.js': {CampaignInvitations: ({summary}) => summary?.items?.length ? React.createElement('p', null, 'Campagne reçue') : null},
    '@/server/actions/campaigns.js': {getCampaignSummaryAction: () => { calls.push('campaigns'); return summary.promise }},
    '@/server/actions/declarations.js': {getAllowedDeclarationTypesAction: async options => {
      calls.push(options.includePreleveurs ? 'full-types' : 'types')
      return {success: true, data: {data: [], meta: {canCreateDeclaration: canCreate}}}
    }}
  })
  const page = compile('page.js', {
    'next/navigation': {forbidden: () => { throw new Error('forbidden') }},
    '@/components/dashboard/dashboard-page.js': {__esModule: true, default: () => null},
    '@/components/dashboard/dashboard-declaration-actions.js': {__esModule: true, default: actions},
    '@/dsfr-bootstrap/index.js': {StartDsfrOnHydration: () => null},
    '@/server/actions/user.js': {getCurrentSessionInfo: async () => ({success: true, data: {role, declarantRole, permissions, user: {id: 'user'}}})},
    '@/server/actions/dashboard.js': {getDashboardTerritoryAction: async () => { calls.push('territory'); return {success: true, data: {scope: role}} }}
  })
  return {page: () => page({searchParams: Promise.resolve({})}), actions, summary, calls}
}

test('les chiffres du tableau de bord n’attendent pas les invitations, qui restent dans Suspense', async t => {
  const flow = harness()
  const result = await flow.page()
  const dashboard = result.props.children[1]
  t.is(dashboard.props.initialDashboard.scope, 'DECLARANT')
  t.deepEqual(flow.calls, ['territory'])
  const boundary = dashboard.props.declarationActions
  t.is(boundary.type, React.Suspense)
  const content = boundary.props.children
  const pending = content.type(content.props)
  t.deepEqual(flow.calls, ['territory', 'types', 'campaigns'])
  flow.summary.resolve({success: true, data: {data: {items: [{id: 'campaign'}]}}})
  const html = renderToStaticMarkup(await pending)
  t.true(html.includes('Campagne reçue'))
  t.true(html.includes('Autres déclarations'))
  t.true(html.includes('/mes-declarations/new'))
})

test('le collecteur ne déclenche pas de lecture des invitations préleveur', async t => {
  const flow = harness({declarantRole: 'COLLECTEUR'})
  const dashboard = (await flow.page()).props.children[1]
  const content = dashboard.props.declarationActions.props.children
  const html = renderToStaticMarkup(await content.type(content.props))
  t.deepEqual(flow.calls, ['territory', 'types'])
  t.true(html.includes('Déclarer mes prélèvements'))
  t.false(html.includes('Autres déclarations'))
})

test('le tableau de bord conserve les permissions et ne charge pas les actions déclarant pour un agent', async t => {
  const forbidden = harness({role: 'INSTRUCTOR'})
  await t.throwsAsync(forbidden.page(), {message: 'forbidden'})
  t.deepEqual(forbidden.calls, [])
  const allowed = harness({role: 'INSTRUCTOR', permissions: ['zone.dashboard.read']})
  const dashboard = (await allowed.page()).props.children[1]
  t.is(dashboard.props.declarationActions, null)
  t.deepEqual(allowed.calls, ['territory'])
})

test('les déclarations impossibles ne deviennent pas une action cliquable pendant le chargement', async t => {
  const flow = harness({canCreate: false})
  flow.summary.resolve({success: false, error: 'Indisponible'})
  t.is(renderToStaticMarkup(await flow.actions({isPreleveur: true})), '')
})
