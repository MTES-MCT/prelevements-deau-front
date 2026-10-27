import React from 'react'

import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {runInNewContext} from 'node:vm'

import test from 'ava'
import {transformSync} from 'next/dist/build/swc/index.js'

const require = createRequire(import.meta.url)
const filename = new URL('map-popup-card.js', import.meta.url)
const {code} = transformSync(readFileSync(filename, 'utf8'), {
  filename: filename.pathname,
  jsc: {parser: {syntax: 'ecmascript', jsx: true}, transform: {react: {runtime: 'automatic'}}, target: 'es2022'},
  module: {type: 'commonjs'}
})
const compiled = {exports: {}}
runInNewContext('(function(require, module, exports) {' + code + '\n})', {})(require, compiled, compiled.exports)
const MapPopupCard = compiled.exports.default

function action(props) {
  const tree = MapPopupCard({title: 'Point synthétique', actionLabel: 'Voir la fiche du point', ...props})
  const footer = React.Children.toArray(tree.props.children).find(child => child.type === 'footer')
  return footer?.props.children
}

test('le lien conserve la navigation applicative pour un clic simple', t => {
  const calls = []
  const link = action({actionHref: '/points-prelevement/point', onAction: () => calls.push('navigate')})
  t.is(link.type, 'a')
  t.is(link.props.href, '/points-prelevement/point')
  link.props.onClick({button: 0, preventDefault: () => calls.push('prevent')})
  t.deepEqual(calls, ['prevent', 'navigate'])
})

for (const event of [{ctrlKey: true}, {metaKey: true}, {shiftKey: true}, {altKey: true}, {button: 1}, {defaultPrevented: true}]) {
  test(`le lien laisse le navigateur gérer ${JSON.stringify(event)}`, t => {
    const link = action({actionHref: '/points-prelevement/point', onAction: () => t.fail('Navigation courante interdite')})
    link.props.onClick({button: 0, ...event, preventDefault: () => t.fail('Comportement natif intercepté')})
    t.pass()
  })
}

test('une action sans URL reste un bouton et une action sans rappel reste un lien natif', t => {
  const onAction = () => {}
  const button = action({onAction})
  t.is(button.type, 'button')
  t.is(button.props.onClick, onAction)
  const link = action({actionHref: '/points-prelevement/point'})
  t.is(link.type, 'a')
  link.props.onClick({button: 0, preventDefault: () => t.fail('Lien natif intercepté')})
  t.is(action({}), undefined)
})
