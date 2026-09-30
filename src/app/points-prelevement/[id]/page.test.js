import React from 'react'

import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {runInNewContext} from 'node:vm'

import test from 'ava'
import {transformSync} from 'next/dist/build/swc/index.js'

const require = createRequire(import.meta.url)

function harness({role = 'INSTRUCTOR', permissions = ['exploitation.list'], exploitations = Promise.resolve({data: []}), pointId = 'point'} = {}) {
  const calls = []
  const components = new Map()
  const componentRequire = specifier => {
    if (specifier.startsWith('@/components/')) {
      const component = () => null
      components.set(specifier, component)
      return {__esModule: true, default: component}
    }
    if (specifier === '@/server/actions/points-prelevement.js') return {
      getPointPrelevementAction: async () => ({success: true, data: {id: pointId, right: {permissions}}}),
      getExploitationsByPointIdAction: async id => { calls.push(id); return exploitations }
    }
    if (specifier === '@/server/actions/user.js') return {getCurrentSessionInfo: async () => ({data: {role}})}
    if (specifier === '@/server/actions/audit-events.js') return {getResourceAuditHistoryAction: async () => ({success: false})}
    if (specifier === '@/lib/urls.js') return {getNewExploitationURL: ({idPoint}) => `/exploitations/new?point=${idPoint}`, getPointPrelevementURL: point => `/points-prelevement/${point.id}`}
    if (specifier === '@/utils/point-prelevement.js') return {getPointPrelevementLabel: () => 'Point'}
    if (specifier === '@/app/metadata-utils.js') return {buildPageTitle: () => ({title: 'Point'})}
    if (specifier === '@/dsfr-bootstrap/index.js') return {StartDsfrOnHydration: () => null}
    if (specifier === 'next/navigation') return {notFound: () => { throw new Error('notFound') }, redirect: url => { throw new Error(`redirect:${url}`) }}
    return require(specifier)
  }
  const filename = new URL('page.js', import.meta.url)
  const {code} = transformSync(readFileSync(filename, 'utf8'), {filename: filename.pathname, jsc: {parser: {syntax: 'ecmascript', jsx: true}, transform: {react: {runtime: 'automatic'}}, target: 'es2022'}, module: {type: 'commonjs'}})
  const compiled = {exports: {}}
  runInNewContext('(function(require, module, exports) {' + code + '\n})', {})(componentRequire, compiled, compiled.exports)
  return {calls, components, page: () => compiled.exports.default({params: Promise.resolve({id: 'point'}), searchParams: Promise.resolve({})})}
}

function elements(element) {
  if (!React.isValidElement(element)) return []
  return [element, ...React.Children.toArray(element.props.children).flatMap(elements)]
}

test('la fiche rend son identité et sa localisation pendant le chargement des exploitations', async t => {
  const deferred = Promise.withResolvers()
  const flow = harness({exploitations: deferred.promise, permissions: ['exploitation.list', 'exploitation.create']})
  let shell
  const page = flow.page().then(element => { shell = element })
  await new Promise(resolve => setImmediate(resolve))
  t.truthy(shell)
  const rendered = elements(shell)
  t.true(rendered.some(element => element.type === flow.components.get('@/components/points-prelevement/point-identification.js')))
  t.true(rendered.some(element => element.type === flow.components.get('@/components/points-prelevement/point-localisation.js')))
  const boundary = rendered.find(element => element.type === React.Suspense)
  t.is(boundary.props.fallback.props.role, 'status')
  t.deepEqual(flow.calls, ['point'])
  const pendingList = boundary.props.children.type(boundary.props.children.props)
  deferred.resolve({data: [{id: 'exploitation'}]})
  const list = await pendingList
  t.deepEqual(list.props.exploitations, [{id: 'exploitation'}])
  t.true(list.props.canCreate)
  t.is(list.props.createHref, '/exploitations/new?point=point')
  await page
})

test('un rôle sans droit de liste ne charge et ne rend aucune exploitation', async t => {
  for (const role of ['INSTRUCTOR', 'DECLARANT']) {
    const flow = harness({role, permissions: [], exploitations: new Promise(() => {})})
    const rendered = elements(await flow.page())
    t.deepEqual(flow.calls, [])
    t.false(rendered.some(element => element.type === React.Suspense))
  }
})

test('un droit de lecture seul ne propose pas de création après le chargement différé', async t => {
  const flow = harness()
  const boundary = elements(await flow.page()).find(element => element.type === React.Suspense)
  const list = await boundary.props.children.type(boundary.props.children.props)
  t.false(list.props.canCreate)
  t.is(list.props.createHref, undefined)
})

test('une redirection canonique ne lance pas la lecture des exploitations du mauvais point', async t => {
  const flow = harness({pointId: 'canonical'})
  await t.throwsAsync(flow.page(), {message: 'redirect:/points-prelevement/canonical'})
  t.deepEqual(flow.calls, [])
})
