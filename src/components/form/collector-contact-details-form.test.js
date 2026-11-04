import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {runInNewContext} from 'node:vm'

import React from 'react'
import test from 'ava'
import {transformSync} from 'next/dist/build/swc/index.js'

const require = createRequire(import.meta.url)

function harness(details, result = {success: true}) {
  const calls = []
  const updates = new Map()
  let stateIndex = 0
  const componentRequire = specifier => {
    if (specifier === 'react') return {...React,
      useState: value => { const index = stateIndex++; return [value, next => updates.set(index, next)] },
      useRef: value => ({current: value}), useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot()}
    if (specifier.startsWith('@codegouvfr/react-dsfr/')) return {
      Alert: () => null, Button: () => null, Input: () => null
    }
    if (specifier === '@/server/actions/collector-points.js') return {updateCollectorContactDetailsAction: async (id, payload) => {
      calls.push({id, payload: JSON.parse(JSON.stringify(payload))})
      return result
    }}
    return require(specifier)
  }
  const filename = new URL('collector-contact-details-form.js', import.meta.url)
  const {code} = transformSync(readFileSync(filename, 'utf8'), {filename: filename.pathname,
    jsc: {parser: {syntax: 'ecmascript', jsx: true}, transform: {react: {runtime: 'automatic'}}, target: 'es2022'}, module: {type: 'commonjs'}})
  const compiled = {exports: {}}
  runInNewContext('(function(require, module, exports) {' + code + '\n})', {})(componentRequire, compiled, compiled.exports)
  const tree = compiled.exports.default({form: {preleveurId: 'preleveur', version: 'version', details, capabilities: {canEdit: true}}})
  return {calls, updates, tree, save: () => tree.props.onSubmit({preventDefault() {}})}
}

function elements(node) {
  return React.isValidElement(node) ? [node, ...React.Children.toArray(node.props.children).flatMap(elements)] : []
}

test('un seul email canonique est affiché et envoyé, sans réécriture des anciens contacts', async t => {
  const flow = harness({email: ' partage@example.test ', phoneNumber: '0612345678',
    contactEmails: [{email: 'secondaire@example.test', isPrimary: false}], role: 'ADMIN'})
  const inputs = elements(flow.tree).filter(node => node.props.nativeInputProps?.type === 'email')
  t.is(inputs.length, 1)
  t.is(inputs[0].props.label, 'Adresse email')
  t.is(inputs[0].props.nativeInputProps.value, ' partage@example.test ')
  await flow.save()
  t.is(flow.calls[0].payload.details.email, 'partage@example.test')
  t.is(flow.calls[0].payload.version, 'version')
  t.false(Object.hasOwn(flow.calls[0].payload.details, 'contactEmails'))
  t.false(Object.hasOwn(flow.calls[0].payload.details, 'role'))
})

test('effacer le champ envoie null sans demander la suppression des contacts historiques', async t => {
  const flow = harness({email: '', contactEmails: [{email: 'legacy@example.test', isPrimary: true}]})
  await flow.save()
  t.is(flow.calls[0].payload.details.email, null)
  t.false(Object.hasOwn(flow.calls[0].payload.details, 'contactEmails'))
})

test('un refus métier permet de corriger l’email, un conflit de version exige une relecture', async t => {
  const refused = harness({email: 'partage@example.test'}, {success: false, code: 409, error: 'Adresse refusée'})
  await refused.save()
  t.false(refused.updates.get(4))
  const stale = harness({email: 'partage@example.test'}, {success: false, code: 409, data: {code: 'COLLECTOR_RESOURCE_CHANGED'}})
  await stale.save()
  t.true(stale.updates.get(4))
})
