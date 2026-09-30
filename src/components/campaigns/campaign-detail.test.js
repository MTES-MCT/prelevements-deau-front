import React from 'react'

import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {runInNewContext} from 'node:vm'

import test from 'ava'
import {transformSync} from 'next/dist/build/swc/index.js'
import {renderToStaticMarkup} from 'react-dom/server'

import * as campaignHelpers from '../../lib/campaigns.js'

const require = createRequire(import.meta.url)

function harness({tab = 'results', response = {}} = {}) {
  const calls = []
  const filename = new URL('campaign-detail.js', import.meta.url)
  const componentRequire = specifier => {
    if (specifier === 'react') return {...React, useState: value => [value === 'responses' ? tab : value, () => {}], useRef: value => ({current: value})}
    if (specifier === 'next/navigation') return {useRouter: () => ({})}
    if (specifier === 'next/link') return {__esModule: true, default: props => React.createElement('a', props)}
    if (specifier === '@codegouvfr/react-dsfr/Alert') return {Alert: () => null}
    if (specifier === '@/components/campaigns/campaign-common.js') return Object.fromEntries(['CampaignPagination', 'CampaignProgress', 'CampaignShell', 'CampaignStatus', 'CampaignVolumes'].map(name => [name, ({children}) => React.createElement('div', null, children)]))
    if (specifier === '@/lib/campaigns.js') return campaignHelpers
    if (specifier === '@/server/actions/campaigns.js') return Object.fromEntries(['getCampaignResponsesAction', 'getCampaignResultsAction'].map(name => [name, async (id, options) => {
      calls.push({name, id, options})
      return {success: true, data: {items: [], total: 0}}
    }]))
    if (specifier === '@/server/actions/exports.js') return {}
    return require(specifier)
  }
  const {code} = transformSync(readFileSync(filename, 'utf8'), {filename: filename.pathname, jsc: {parser: {syntax: 'ecmascript', jsx: true}, transform: {react: {runtime: 'automatic'}}, target: 'es2022'}, module: {type: 'commonjs'}})
  const compiled = {exports: {}}
  runInNewContext('(function(require, module, exports) {' + code + '\n})', {})(componentRequire, compiled, compiled.exports)
  const tree = compiled.exports.default({initialData: {campaign: {id: 'campaign', name: 'Campagne', status: 'CLOSED'}, permissions: {canReadResults: true}}, initialResponses: {items: [{id: 'response', ...response}], total: 1}})
  return {calls, tree}
}

function elements(node) {
  if (!React.isValidElement(node)) return []
  return [node, ...React.Children.toArray(node.props.children).flatMap(elements)]
}

test('les résultats affichent les besoins compacts et conservent les zéros', t => {
  const {tree} = harness({response: {submittedNeeds: {season: {flow: 0, volume: 0}, offSeason: {flow: 12, volume: 240}}}})
  const html = renderToStaticMarkup(tree)
  t.true(html.includes('0 m³ demandés · 0 m³/h'))
  t.true(html.includes('240 m³ demandés · 12 m³/h'))
})

test('les résultats restent compatibles avec les réponses détaillées', t => {
  const {tree} = harness({response: {submittedData: {needs: {season: {flow: 5, volume: 100}}}}})
  const html = renderToStaticMarkup(tree)
  t.true(html.includes('100 m³ demandés · 5 m³/h'))
  t.true(html.includes('— m³ demandés · — m³/h'))
})

test('les deux onglets demandent explicitement la projection compacte', async t => {
  const {tree, calls} = harness({tab: 'responses'})
  const buttons = elements(tree).filter(node => node.type === 'button')
  await buttons.find(node => node.props.children === 'Suivi des réponses').props.onClick()
  await buttons.find(node => node.props.children === 'Résultats envoyés').props.onClick()
  t.deepEqual(calls.map(({name, id, options}) => ({name, id, ...options})), [
    {name: 'getCampaignResponsesAction', id: 'campaign', page: 1, pageSize: 25, view: 'summary'},
    {name: 'getCampaignResultsAction', id: 'campaign', page: 1, pageSize: 25, view: 'summary'}
  ])
})
