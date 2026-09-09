import React from 'react'

import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {runInNewContext} from 'node:vm'

import test from 'ava'
import {transformSync} from 'next/dist/build/swc/index.js'
import {renderToStaticMarkup} from 'react-dom/server'

import * as helpers from '../../lib/collection-campaigns.js'

const require = createRequire(import.meta.url)
const campaign = {
  id: 'campaign', status: 'OPEN', version: 7,
  owner: {userId: 'owner', label: 'Organisme responsable'},
  managers: [{userId: 'reader', role: 'READER', label: 'Organisme lecteur'}]
}
const managerOptions = [{userId: 'owner', label: 'Organisme responsable'}, {userId: 'reader', label: 'Organisme lecteur'}, {userId: 'new-reader', label: 'Autre organisme'}]

function compile(filename, componentRequire) {
  const {code} = transformSync(readFileSync(filename, 'utf8'), {filename: filename.pathname, jsc: {parser: {syntax: 'ecmascript', jsx: true}, transform: {react: {runtime: 'automatic'}}, target: 'es2022'}, module: {type: 'commonjs'}})
  const compiledModule = {exports: {}}
  runInNewContext('(function(require, module, exports) {' + code + '\n})', {URLSearchParams})(componentRequire, compiledModule, compiledModule.exports)
  return compiledModule.exports
}

function harness({editable = true, status = 'OPEN', response, confirmed = true} = {}) {
  const state = []
  let cursor = 0
  const calls = []
  const saved = []
  const dirtyChanges = []
  const componentRequire = specifier => {
    if (specifier === 'react') {
      return {
        ...React, useState(initial) {
          const index = cursor++
          if (!(index in state)) {
            state[index] = typeof initial === 'function' ? initial() : initial
          }

          return [state[index], value => {
            state[index] = typeof value === 'function' ? value(state[index]) : value
          }]
        }
      }
    }

    if (specifier === '@/lib/collection-campaigns.js') {
      return {...helpers, confirmCampaignAction: () => confirmed}
    }

    if (specifier === '@/server/actions/campaigns.js') {
      return {
        async saveCampaignManagersAction(id, body) {
          calls.push({id, body})
          return response || {success: true, data: {campaign: {...campaign, version: 8}}}
        }
      }
    }

    if (specifier === '@/components/campaigns/campaign-ui.js') {
      return compile(new URL('campaign-ui.js', import.meta.url), value => value === 'next/link' ? ({children, ...props}) => React.createElement('a', props, children) : require(value))
    }

    return require(specifier)
  }

  const renderSharing = compile(new URL('campaign-sharing.js', import.meta.url), componentRequire).default
  return {
    calls, saved, dirtyChanges,
    render() {
      cursor = 0
      return renderSharing({
        campaign: {...campaign, status}, managerOptions, canManageSharing: editable, onSaved: value => saved.push(value), onDirtyChange: value => dirtyChanges.push(value)
      })
    }
  }
}

const nodes = tree => Array.isArray(tree) ? tree.flatMap(node => nodes(node)) : (tree && typeof tree === 'object' ? [tree, ...nodes(tree.props?.children)] : [])
const find = (tree, predicate) => nodes(tree).find(node => predicate(node))
const selectOrganism = tree => find(tree, node => node.props?.label === 'Ajouter un organisme')
const submit = tree => find(tree, node => node.type === 'form').props.onSubmit({preventDefault() {}})
const addOrganism = flow => {
  selectOrganism(flow.render()).props.onChange('new-reader')
  find(flow.render(), node => node.type === 'button' && node.props.children === 'Ajouter en consultation').props.onClick()
}

test('le partage en lecture seule affiche les accès sans formulaire ni action', t => {
  const flow = harness({editable: false})
  const html = renderToStaticMarkup(flow.render())
  t.true(html.includes('Organisme lecteur'))
  t.true(html.includes('Consulter'))
  t.false(html.includes('<form'))
  t.false(html.includes('Enregistrer les accès'))
  t.false(html.includes('Retirer l’accès'))
  t.is(flow.calls.length, 0)
})

for (const status of ['DRAFT', 'OPEN', 'CLOSED']) {
  test(`campagne ${status} : partager sans modifier ses dates ou points`, async t => {
    const flow = harness({status})
    addOrganism(flow)
    t.is(flow.calls.length, 0)
    t.true(flow.dirtyChanges.at(-1))
    await submit(flow.render())
    t.deepEqual(structuredClone(flow.calls), [{id: 'campaign', body: {expectedVersion: 7, managers: [{userId: 'reader', role: 'READER'}, {userId: 'new-reader', role: 'READER'}]}}])
    t.is(flow.saved.length, 1)
    t.false(flow.dirtyChanges.at(-1))
  })
}

test('l’ajout ne propose ni le propriétaire ni les organismes déjà partagés', t => {
  const flow = harness()
  const options = selectOrganism(flow.render()).props.options.map(option => option.value)
  t.deepEqual([...options], ['', 'new-reader'])
  addOrganism(flow)
  t.falsy(selectOrganism(flow.render()))
})

test('les accès inchangés et une confirmation annulée ne déclenchent aucun appel', async t => {
  const unchanged = harness()
  await submit(unchanged.render())
  t.is(unchanged.calls.length, 0)
  const cancelled = harness({confirmed: false})
  addOrganism(cancelled)
  await submit(cancelled.render())
  t.is(cancelled.calls.length, 0)
})

test('un changement de rôle reste explicite et conserve les autres accès', async t => {
  const flow = harness()
  addOrganism(flow)
  find(flow.render(), node => node.props?.label === 'Organisme lecteur').props.onChange('MANAGER')
  await submit(flow.render())
  t.deepEqual(structuredClone(flow.calls[0].body.managers), [{userId: 'reader', role: 'MANAGER'}, {userId: 'new-reader', role: 'READER'}])
})

test('une erreur conserve les modifications et ne prétend pas avoir partagé', async t => {
  const flow = harness({response: {success: false, error: 'Accès refusé', code: 403}})
  addOrganism(flow)
  await submit(flow.render())
  const html = renderToStaticMarkup(flow.render())
  t.true(html.includes('Accès refusé'))
  t.true(html.includes('Autre organisme'))
  t.is(flow.saved.length, 0)
  t.true(flow.dirtyChanges.at(-1))
})

test('la révocation de son propre accès est transmise à la page pour quitter le détail', async t => {
  const flow = harness({response: {success: true, data: {accessRevoked: true, campaign: null}}})
  find(flow.render(), node => node.type === 'button' && node.props['aria-label'] === 'Retirer l’accès de Organisme lecteur').props.onClick()
  await submit(flow.render())
  t.true(flow.saved[0].accessRevoked)
})

test('l’action partage utilise uniquement PATCH managers et protège le segment URL', async t => {
  const calls = []
  const {saveCampaignManagersAction} = compile(new URL('../../server/actions/campaigns.js', import.meta.url), specifier => {
    if (specifier === '@/server/api-wrapper.js') {
      return {withErrorHandling: operation => operation(), fetchJSON: (url, options) => calls.push({url, options})}
    }

    return require(specifier)
  })
  const body = {expectedVersion: 7, managers: []}
  await saveCampaignManagersAction('campaign/other', body)
  t.is(calls[0].url, 'api/campaigns/campaign%2Fother/managers')
  t.is(calls[0].options.method, 'PATCH')
  t.is(calls[0].options.body, body)
})
