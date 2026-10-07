import React from 'react'

import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {runInNewContext} from 'node:vm'

import test from 'ava'
import {transformSync} from 'next/dist/build/swc/index.js'
import {renderToStaticMarkup} from 'react-dom/server'

import * as campaignHelpers from '../../lib/campaigns.js'
import * as campaignPointHelpers from '../../lib/campaign-points.js'

const require = createRequire(import.meta.url)

function compileComponent(filename, componentRequire) {
  const {code} = transformSync(readFileSync(filename, 'utf8'), {filename: filename.pathname, jsc: {parser: {syntax: 'ecmascript', jsx: true}, transform: {react: {runtime: 'automatic'}}, target: 'es2022'}, module: {type: 'commonjs'}})
  const compiled = {exports: {}}
  runInNewContext('(function(require, module, exports) {' + code + '\n})', {})(componentRequire, compiled, compiled.exports)
  return compiled.exports
}

function harness({tab = 'results', response = {}, permissions = {canReadResults: true}} = {}) {
  const calls = []
  const filename = new URL('campaign-detail.js', import.meta.url)
  const componentRequire = specifier => {
    if (specifier === 'react') return {...React, useState: value => [value === 'responses' ? tab : value, () => {}], useRef: value => ({current: value}), useSyncExternalStore: (_, getSnapshot) => getSnapshot()}
    if (specifier === 'next/navigation') return {useRouter: () => ({})}
    if (specifier === 'next/link') return {__esModule: true, default: props => React.createElement('a', props)}
    if (specifier === '@codegouvfr/react-dsfr/Alert') return {Alert: () => null}
    if (specifier === '@/components/campaigns/campaign-requester-points.js') return {__esModule: true, default: () => null}
    if (specifier === '@/components/campaigns/campaign-point-identity.js') return compileComponent(new URL('campaign-point-identity.js', import.meta.url), componentRequire)
    if (specifier === '@/components/campaigns/campaign-common.js') return Object.fromEntries(['CampaignPagination', 'CampaignProgress', 'CampaignShell', 'CampaignStatus', 'CampaignVolumes', 'CampaignReplenishmentNotice', 'CampaignMeterChanges'].map(name => [name, ({children}) => React.createElement('div', null, children)]))
    if (specifier === '@/lib/campaigns.js') return campaignHelpers
    if (specifier === '@/lib/campaign-points.js') return campaignPointHelpers
    if (specifier === '@/server/actions/campaigns.js') return Object.fromEntries(['getCampaignResponsesAction', 'getCampaignResultsAction'].map(name => [name, async (id, options) => {
      calls.push({name, id, options})
      return {success: true, data: {items: [], total: 0}}
    }]))
    if (specifier === '@/server/actions/exports.js') return {}
    return require(specifier)
  }
  const tree = compileComponent(filename, componentRequire).default({initialData: {campaign: {id: 'campaign', name: 'Campagne', status: 'CLOSED'}, permissions}, initialResponses: {items: [{id: 'response', ...response}], total: 1}})
  return {calls, tree}
}

function elements(node) {
  if (!React.isValidElement(node)) return []
  return [node, ...React.Children.toArray(node.props.children).flatMap(elements)]
}

test('le suivi distingue le point, la commune, le code compteur et le préleveur', t => {
  const {tree} = harness({tab: 'responses', response: {point: {name: 'Forage du moulin', communeName: 'Eymet', locationDescription: 'Parcelle 12'}, countingCode: '001', preleveur: {socialReason: 'Ferme du moulin'}}})
  const html = renderToStaticMarkup(tree)
  for (const value of ['Points de la campagne', 'Forage du moulin', 'Eymet · Parcelle 12', 'Code compteur Agence de l’eau', 'Ferme du moulin']) t.true(html.includes(value), value)
  t.false(html.includes('/points-prelevement/'), 'Ne suppose pas un droit de consultation externe à la campagne')
})

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

test('un ancien statut à vérifier et un changement de compteur ne masquent pas les volumes calculés', t => {
  const {tree} = harness({response: {
    lastSubmittedAt: '2026-09-24', publicationStatus: 'PENDING_REVIEW', publicationStatusLabel: 'Volumes en attente de vérification',
    publicationIssues: [{code: 'METER_CHANGE_REPORTED', compteurId: 'meter'}],
    meterChanges: [{compteurId: 'meter', meterChanged: true, meterChangeReason: 'Remplacement'}],
    volumes: {offSeason: 10, season: 0, total: 10, partial: false}
  }})
  const html = renderToStaticMarkup(tree)
  t.true(html.includes('hors étiage 10 m³'))
  t.true(html.includes('étiage 0 m³'))
  t.false(/attente|vérification|publication|Valider|Vérifier le compteur/.test(html))
})

test('un volume impossible affiche un tiret sans masquer la période calculable', t => {
  const {tree} = harness({response: {volumes: {offSeason: null, season: 25, total: 25, partial: true}}})
  const html = renderToStaticMarkup(tree)
  t.true(html.includes('hors étiage —'))
  t.true(html.includes('étiage 25 m³'))
  t.true(html.includes('Résultat incomplet'))
  t.false(/attente|vérification/.test(html))
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

for (const [name, response, label] of [
  ['réponse vide', {}, 'Compléter'],
  ['brouillon partagé', {hasDraft: true}, 'Reprendre'],
  ['réponse envoyée', {lastSubmittedAt: '2026-09-24'}, 'Consulter / modifier'],
  ['correction en brouillon', {lastSubmittedAt: '2026-09-24', hasDraft: true}, 'Consulter / modifier']
]) {
  test(`le collecteur peut ouvrir la réponse selon ses droits : ${name}`, t => {
    const {tree} = harness({tab: 'responses', response: {...response, permissions: {canEdit: true, canSubmit: true, respondingOnBehalf: true}}})
    const link = elements(tree).find(node => node.props.href === '/campagnes/campaign/reponses/response')
    t.is(link?.props.children, label)
  })
}

test('la capacité globale du collecteur ne rend pas une réponse non modifiable éditable', t => {
  const {tree} = harness({tab: 'responses', permissions: {canReadResults: true, canRespondForParticipants: true}, response: {hasDraft: true, permissions: {canEdit: false, canSubmit: false, respondingOnBehalf: true}}})
  const link = elements(tree).find(node => node.props.href === '/campagnes/campaign/reponses/response')
  t.is(link?.props.children, 'Consulter')
})

test('sans nouvelle permission une réponse non envoyée reste inaccessible au collecteur', t => {
  const {tree} = harness({tab: 'responses', permissions: {canReadResults: true, canRespondForParticipants: true}})
  t.false(elements(tree).some(node => node.props.href === '/campagnes/campaign/reponses/response'))
})

for (const hasDraft of [false, true]) {
  test(`les résultats proposent une modification directe autorisée, brouillon ${hasDraft}`, t => {
    const {tree} = harness({response: {lastSubmittedAt: '2026-09-24', hasDraft, permissions: {canEdit: true, respondingOnBehalf: true}}})
    const links = elements(tree).filter(node => node.props.href)
    t.is(links.find(node => node.props.href === '/campagnes/campaign/reponses/response')?.props.children, 'Consulter')
    t.is(links.find(node => node.props.href === '/campagnes/campaign/reponses/response?modifier=1')?.props.children, hasDraft ? 'Reprendre la modification' : 'Modifier la réponse')
  })
}

for (const permissions of [undefined, {canEdit: false, respondingOnBehalf: true}]) {
  test(`les résultats sans droit de modification gardent seulement la consultation, permissions ${Boolean(permissions)}`, t => {
    const {tree} = harness({permissions: {canReadResults: true, canRespondForParticipants: true}, response: {lastSubmittedAt: '2026-09-24', permissions}})
    const links = elements(tree).filter(node => node.props.href)
    t.is(links.find(node => node.props.href === '/campagnes/campaign/reponses/response')?.props.children, 'Consulter')
    t.false(links.some(node => node.props.href.includes('?modifier=')))
  })
}
