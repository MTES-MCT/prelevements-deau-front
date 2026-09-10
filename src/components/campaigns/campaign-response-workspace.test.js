import React from 'react'

import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {runInNewContext} from 'node:vm'

import test from 'ava'
import {transformSync} from 'next/dist/build/swc/index.js'
import {renderToStaticMarkup} from 'react-dom/server'

import * as mapHelpers from '../../lib/campaign-response-map.js'

const require = createRequire(import.meta.url)
const nodes = tree => Array.isArray(tree) ? tree.flatMap(node => nodes(node)) : (tree && typeof tree === 'object' ? [tree, ...nodes(tree.props?.children)] : [])
const point = (id = 'target-a') => ({id, pointPrelevement: {name: 'Forage', coordinates: {type: 'Point', coordinates: [4.8, 45.6]}}})
const interaction = ({targets = [point()], wide = false} = {}) => {
  const states = []
  const memos = []
  const listeners = new Map()
  const calls = []
  let stateIndex = 0
  let memoIndex = 0
  let effectCalled = false
  let rowExists = true
  let fieldExists = true
  let mediaMatches = wide
  const focus = {focus: value => calls.push({focus: value})}
  const row = {scrollIntoView: value => calls.push({scroll: value}), querySelector: () => fieldExists ? focus : null, ...focus}
  const media = {
    get matches() {
      return mediaMatches
    },
    addEventListener: (name, listener) => listeners.set(name, listener),
    removeEventListener: name => listeners.delete(name)
  }
  const react = {
    ...React,
    useId: () => 'workspace',
    useState(initial) {
      const index = stateIndex++
      if (!(index in states)) {
        states[index] = initial
      }

      return [states[index], value => {
        states[index] = typeof value === 'function' ? value(states[index]) : value
      }]
    },
    useMemo(fn, dependencies) {
      const index = memoIndex++
      if (!memos[index] || dependencies.some((dependency, position) => dependency !== memos[index].dependencies[position])) {
        memos[index] = {dependencies, value: fn()}
      }

      return memos[index].value
    },
    useEffect(fn) {
      if (!effectCalled) {
        effectCalled = true
        fn()
      }
    }
  }
  const filename = new URL('campaign-response-workspace.js', import.meta.url)
  const {code} = transformSync(readFileSync(filename, 'utf8'), {filename: filename.pathname, jsc: {parser: {syntax: 'ecmascript', jsx: true}, transform: {react: {runtime: 'automatic'}}, target: 'es2022'}, module: {type: 'commonjs'}})
  const compiledModule = {exports: {}}
  const imports = {
    react,
    '@/lib/campaign-response-map.js': mapHelpers,
    'next/dynamic': () => props => React.createElement('div', {'data-map': true, 'data-point-count': props.points.length})
  }
  runInNewContext('(function(require, module, exports) {' + code + '\n})', {
    window: {matchMedia: () => media},
    document: {
      querySelector(selector) {
        calls.push({selector})
        return rowExists ? row : null
      }
    },
    CSS: {escape: value => value}
  })(specifier => imports[specifier] || require(specifier), compiledModule, compiledModule.exports)
  const renderWorkspace = compiledModule.exports.default
  const props = {targets, children: ({pointProps}) => React.createElement('section', {'data-list': true}, props.targets.map(target => React.createElement('div', {key: target.id, ...pointProps(target.id)}, target.pointPrelevement.name)))}
  return {
    calls,
    props,
    render() {
      stateIndex = 0
      memoIndex = 0
      return renderWorkspace(props)
    },
    map() {
      this.render()
      return nodes(this.render()).find(node => node.props?.onFocusPoint)
    },
    toggle() {
      nodes(this.render()).find(node => node.type === 'button').props.onClick()
    },
    resize(value) {
      mediaMatches = value
      listeners.get('change')?.()
    },
    readonly() {
      fieldExists = false
    },
    removeRow() {
      rowExists = false
    }
  }
}

test('la carte mobile ne monte qu’à la demande, et ne retire jamais la liste', t => {
  const flow = interaction()
  t.falsy(flow.map())
  t.true(renderToStaticMarkup(flow.render()).includes('Forage'))
  flow.toggle()
  t.truthy(flow.map())
  flow.toggle()
  t.falsy(flow.map())
  t.true(renderToStaticMarkup(flow.render()).includes('Forage'))
})

test('la carte est visible sur ordinateur et suit le changement de largeur', t => {
  const flow = interaction({wide: true})
  t.truthy(flow.map())
  flow.resize(false)
  t.falsy(flow.map())
})

test('sans coordonnées la saisie reste entière, sans carte vide ni commande inutile', t => {
  const flow = interaction({targets: [{id: 'target', pointPrelevement: {name: 'Sans localisation'}}], wide: true})
  t.falsy(flow.map())
  t.is(nodes(flow.render()).filter(node => node.type === 'button').length, 0)
  t.true(renderToStaticMarkup(flow.render()).includes('Sans localisation'))
})

test('un clic de carte vise le champ de la bonne cible, jamais un point non autorisé', t => {
  const flow = interaction({wide: true})
  flow.map().props.onFocusPoint('foreign')
  t.deepEqual(flow.calls, [])
  flow.map().props.onFocusPoint('target-a')
  t.deepEqual(flow.calls[0], {selector: '#workspace-target-a'})
  t.true(flow.calls.some(call => call.focus?.preventScroll))
  t.is(flow.map().props.activePointId, 'target-a')
})

test('la carte reste consultable en lecture seule et tolère une ligne déjà démontée', t => {
  const flow = interaction({wide: true})
  flow.readonly()
  t.notThrows(() => flow.map().props.onFocusPoint('target-a'))
  t.true(flow.calls.some(call => call.focus?.preventScroll))
  flow.removeRow()
  t.notThrows(() => flow.map().props.onFocusPoint('target-a'))
})

test('une sauvegarde de compteurs ne recrée pas les points de la carte ni ne perd sa sélection', t => {
  const flow = interaction({wide: true})
  const initialPoints = flow.map().props.points
  flow.map().props.onFocusPoint('target-a')
  flow.props.targets = [{...point(), meters: [{compteurId: 'new-meter'}]}]
  t.is(flow.map().props.points, initialPoints)
  t.is(flow.map().props.activePointId, 'target-a')
})

test('survol et focus clavier des lignes mettent en évidence le même point sur la carte', t => {
  const flow = interaction({wide: true})
  const row = nodes(flow.render()).find(node => node.props?.id === 'workspace-target-a')
  row.props.onFocusCapture()
  row.props.onMouseEnter()
  t.is(flow.map().props.activePointId, 'target-a')
  t.is(flow.map().props.hoveredPointId, 'target-a')
  row.props.onMouseLeave()
  t.is(flow.map().props.hoveredPointId, null)
})
