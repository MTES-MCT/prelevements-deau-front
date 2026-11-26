import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {runInNewContext} from 'node:vm'
import test from 'ava'
import {transformSync} from 'next/dist/build/swc/index.js'
import React from 'react'

const require = createRequire(import.meta.url)
const filename = new URL('agent-dashboard-zone.js', import.meta.url)
const {code} = transformSync(readFileSync(filename, 'utf8'), {
  filename: filename.pathname,
  jsc: {parser: {syntax: 'ecmascript', jsx: true}, transform: {react: {runtime: 'automatic'}}, target: 'es2022'},
  module: {type: 'commonjs'}
})

function zone(zoneId, name, overrides = {}) {
  return {zoneId, zone: {id: zoneId, name}, status: 'ACTIVE', permissions: ['zone.dashboard.read'], ...overrides}
}

const plain = zone('plain', 'Plaine', {isDashboardDefault: true})
const valley = zone('valley', 'Vallée')

function elements(node) {
  return React.isValidElement(node) ? [node, ...React.Children.toArray(node.props.children).flatMap(elements)] : []
}

function harness(habilitations, {canManage = true, impersonating = false, hydrated = true, results = []} = {}) {
  const calls = []
  const states = []
  let cursor
  let transition
  function useState(initial) {
    const index = cursor++
    if (!(index in states)) states[index] = initial
    return [states[index], value => { states[index] = value }]
  }

  const compiled = {exports: {}}
  const modules = {
    react: {...React, useState,
      useTransition: () => [false, action => { transition = action() }],
      useSyncExternalStore: (_, client, server) => hydrated ? client() : server()},
    '@codegouvfr/react-dsfr/Button': {Button: 'button'},
    '@codegouvfr/react-dsfr/Select': {Select: 'select'},
    '@/contexts/auth-context.js': {useAuth: () => ({user: {impersonation: {active: impersonating}}})},
    '@/server/actions/zones.js': {setInstructorDashboardDefaultAction: async (...args) => {
      calls.push(args)
      return results.shift() ?? {success: true}
    }}
  }
  runInNewContext('(function(require, module, exports) {' + code + '\n})')(
    name => modules[name] ?? require(name), compiled, compiled.exports
  )
  function render() {
    cursor = 0
    return elements(compiled.exports.default({agentId: 'agent', habilitations, canManage}))
  }
  function find(type) {
    return render().find(node => node.type === type)
  }
  return {
    calls, render, find,
    choose(value) { find('select').props.nativeSelectProps.onChange({target: {value}}) },
    async submit() {
      await find('form').props.onSubmit({preventDefault() {}})
      await transition
    }
  }
}

test('le sélecteur présente la préférence enregistrée et les seuls accès disponibles au tableau de bord', t => {
  const flow = harness([plain, valley, zone('future', 'À venir', {status: 'FUTURE'}),
    zone('ended', 'Terminé', {status: 'ENDED'}), zone('forbidden', 'Sans droit', {permissions: []}), zone(null, 'Sans identifiant')])
  t.is(flow.render().filter(node => node.type === 'select').length, 1)
  t.is(flow.find('select').props.nativeSelectProps.value, 'plain')
  t.deepEqual(flow.render().filter(node => node.type === 'option').map(node => node.props.value).sort(), ['', 'plain', 'valley'])
  t.deepEqual(flow.calls, [])
})

test('remplacer la préférence enregistre uniquement la zone choisie, après validation explicite', async t => {
  const flow = harness([plain, valley])
  flow.choose('valley')
  t.deepEqual(flow.calls, [])
  await flow.submit()
  t.deepEqual(flow.calls, [['valley', 'agent', true]])
})

test('le retour au choix automatique efface uniquement la préférence enregistrée, même si elle a expiré', async t => {
  for (const status of ['ACTIVE', 'ENDED']) {
    const flow = harness([{...plain, status}, valley])
    if (status === 'ENDED') {
      const expired = flow.render().find(node => node.type === 'option' && node.props.value === 'plain')
      t.true(expired.props.disabled)
      t.regex(React.Children.toArray(expired.props.children).join(''), /indisponible/)
    }
    flow.choose('')
    await flow.submit()
    t.deepEqual(flow.calls, [['plain', 'agent', false]])
  }
})

test('le compte désactivé et la prise de place permettent seulement de consulter la préférence', t => {
  for (const options of [{canManage: false}, {impersonating: true}]) {
    const flow = harness([plain, valley], options)
    t.falsy(flow.find('form'))
    t.falsy(flow.find('select'))
    t.deepEqual(flow.calls, [])
  }
})

test('une erreur conserve le choix et permet de réessayer l’enregistrement', async t => {
  const flow = harness([plain, valley], {results: [{success: false, error: 'Accès refusé'}]})
  flow.choose('valley')
  await flow.submit()
  t.is(flow.find('select').props.nativeSelectProps.value, 'valley')
  t.is(flow.find('select').props.state, 'error')
  t.is(flow.find('select').props.stateRelatedMessage, 'Accès refusé')
  await flow.submit()
  t.deepEqual(flow.calls, [['valley', 'agent', true], ['valley', 'agent', true]])
})

test('une soumission identique ou prématurée ne déclenche aucune écriture', async t => {
  const flow = harness([plain, valley])
  await flow.submit()
  t.deepEqual(flow.calls, [])
  const server = harness([plain, valley], {hydrated: false})
  t.true(server.find('select').props.disabled)
  server.choose('valley')
  await server.submit()
  t.deepEqual(server.calls, [])
})
