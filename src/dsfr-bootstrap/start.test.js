import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {runInNewContext} from 'node:vm'
import test from 'ava'
import {transformSync} from 'next/dist/build/swc/index.js'
import nextConfig from '../../next.config.mjs'

const require = createRequire(import.meta.url)
const upstreamPath = require.resolve('@codegouvfr/react-dsfr/start.js')
const localPath = new URL('./start.js', import.meta.url).pathname

function harness() {
  const window = {}
  const effects = []
  const calls = {runtimeLoads: 0, starts: 0, themes: 0}
  const runtime = Object.assign(() => ({menu: {disclose() {}}}), {
    start() { calls.starts++; runtime.active = true }
  })
  const cachedRuntime = () => {
    if (calls.runtimeLoads === 0) { calls.runtimeLoads++; window.dsfr = runtime }
    return {}
  }
  const dependencies = specifier => {
    if (specifier.includes('dsfr.module')) return cachedRuntime()
    if (specifier.includes('useIsDark/client')) return {startClientSideIsDarkLogic() { calls.themes++ }}
    if (specifier.endsWith('isBrowser')) return {isBrowser: true}
    if (specifier === 'tsafe/assert') return {assert(value) { if (!value) throw new Error('Assertion') }}
    if (specifier.endsWith('Deferred')) return {Deferred: class {
      constructor() { const pending = Promise.withResolvers(); this.pr = pending.promise; this.resolve = pending.resolve }
    }}
    return require(specifier)
  }
  const evaluate = filename => {
    const {code} = transformSync(readFileSync(filename, 'utf8'), {
      filename, jsc: {parser: {syntax: 'ecmascript'}, target: 'es2022'}, module: {type: 'commonjs'}
    })
    const compiled = {exports: {}}
    runInNewContext('(function(require, module, exports) {' + code + '\n})', {window, Symbol})(dependencies, compiled, compiled.exports)
    return compiled.exports
  }
  return {window, runtime, calls, evaluate, params: {
    defaultColorScheme: 'system', nextParams: {registerEffectAction: action => effects.push(action)}
  }, flush: () => { while (effects.length) effects.shift()() }}
}

test('la réévaluation du starter installé reproduit l’écrasement du runtime DSFR mis en cache', async t => {
  const flow = harness()
  await flow.evaluate(upstreamPath).start(flow.params)
  flow.flush()
  t.true(flow.runtime.active)
  await flow.evaluate(upstreamPath).start(flow.params)
  t.throws(flow.flush, {message: 'window.dsfr.start is not a function'})
  t.is(flow.calls.runtimeLoads, 1)
})

test('le starter conserve un runtime actif et résout la nouvelle promesse après réévaluation', async t => {
  const flow = harness()
  const initial = flow.evaluate(localPath)
  await initial.start(flow.params)
  await initial.prDsfrLoaded
  t.is(flow.calls.starts, 0)
  flow.flush()
  const refreshed = flow.evaluate(localPath)
  await refreshed.start(flow.params)
  await refreshed.prDsfrLoaded
  flow.flush()
  t.is(flow.window.dsfr, flow.runtime)
  t.true(flow.runtime.active)
  t.is(typeof flow.window.dsfr().menu.disclose, 'function')
  t.deepEqual(flow.calls, {runtimeLoads: 1, starts: 2, themes: 2})
})

test('deux starters évalués pendant le chargement partagent le runtime et gardent leurs effets', async t => {
  const flow = harness()
  const first = flow.evaluate(localPath)
  const second = flow.evaluate(localPath)
  await Promise.all([first.start(flow.params), second.start(flow.params)])
  await Promise.all([first.prDsfrLoaded, second.prDsfrLoaded])
  flow.flush()
  t.is(flow.window.dsfr, flow.runtime)
  t.deepEqual(flow.calls, {runtimeLoads: 1, starts: 2, themes: 2})
  await second.start(flow.params)
  flow.flush()
  t.is(flow.calls.starts, 2)
})

test('Webpack adapte les producteurs et consommateurs de readiness DSFR sans remplacer les autres starters', t => {
  const replacements = []
  const config = nextConfig.webpack({plugins: [], module: {rules: []}, resolve: {alias: {}}}, {
    webpack: {NormalModuleReplacementPlugin: class {
      constructor(pattern, replace) { replacements.push({pattern, replace}) }
    }}
  })
  t.is(config.plugins.length, 1)
  const {pattern, replace} = replacements[0]
  for (const context of ['next-app-router', 'Chart', '']) {
    const resource = {context: `/node_modules/@codegouvfr/react-dsfr/${context}`, request: '../start'}
    t.true(pattern.test(resource.request))
    replace(resource)
    t.is(resource.request, localPath)
  }
  const unrelated = {context: '/another-library', request: '../start'}
  replace(unrelated)
  t.is(unrelated.request, '../start')
})
