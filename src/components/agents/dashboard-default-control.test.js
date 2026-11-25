import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {runInNewContext} from 'node:vm'
import test from 'ava'
import {transformSync} from 'next/dist/build/swc/index.js'
import React from 'react'

const require = createRequire(import.meta.url)
const filename = new URL('dashboard-default-control.js', import.meta.url)
const {code} = transformSync(readFileSync(filename, 'utf8'), {
  filename: filename.pathname, module: {type: 'commonjs'},
  jsc: {parser: {syntax: 'ecmascript', jsx: true}, transform: {react: {runtime: 'automatic'}}, target: 'es2022'}
})
const right = {zoneId: 'zone-a', status: 'ACTIVE', permissions: ['zone.dashboard.read']}

function render(habilitation, canManage, impersonating = false) {
  const calls = []
  const compiled = {exports: {}}
  const load = name => {
    if (name === 'react') return {
      ...React, useState: () => [null, () => {}], useTransition: () => [false, action => action()],
      useSyncExternalStore: (_, getSnapshot) => getSnapshot()
    }
    if (name === '@codegouvfr/react-dsfr/Button') return {Button: 'button'}
    if (name === '@/contexts/auth-context.js') return {useAuth: () => ({user: {impersonation: {active: impersonating}}})}
    if (name === '@/server/actions/zones.js') return {setInstructorDashboardDefaultAction: async (...args) => {
      calls.push(args)
      return {success: true}
    }}
    return require(name)
  }
  runInNewContext('(function(require,module,exports){' + code + '\n})')(load, compiled, compiled.exports)
  const tree = compiled.exports.default({agentId: 'agent', habilitation, canManage})
  return {calls, children: React.Children.toArray(tree?.props.children)}
}

test('les deux actions changent uniquement le mandat affiché et le badge reste visible en consultation', t => {
  for (const isDashboardDefault of [false, true]) {
    const {calls, children} = render({...right, isDashboardDefault}, true)
    const button = children.find(child => child.type === 'button')
    t.is(button.props.children, isDashboardDefault ? 'Ne plus utiliser cette zone par défaut' : 'Définir comme zone par défaut')
    button.props.onClick()
    t.deepEqual(calls, [['zone-a', 'agent', !isDashboardDefault]])
  }
  t.deepEqual(render({...right, isDashboardDefault: true}, false).children.map(item => item.props.children), ['Zone par défaut'])
  t.is(render(right, false).children.length, 0)
  t.deepEqual(render({...right, isDashboardDefault: true}, true, true).children.map(item => item.props.children), ['Zone par défaut'])
  t.is(render(right, true, true).children.length, 0)
  t.is(render({...right, status: 'ENDED'}, true).children.length, 0)
  t.is(render({...right, permissions: []}, true).children.length, 0)
})
