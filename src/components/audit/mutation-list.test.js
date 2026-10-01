import React from 'react'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {runInNewContext} from 'node:vm'
import test from 'ava'
import {transformSync} from 'next/dist/build/swc/index.js'
import {renderToStaticMarkup} from 'react-dom/server'
import * as declarants from '../../lib/declarants.js'

const require = createRequire(import.meta.url)
const filename = new URL('mutation-list.js', import.meta.url)
const {code} = transformSync(readFileSync(filename, 'utf8'), {
  filename: filename.pathname,
  jsc: {parser: {syntax: 'ecmascript', jsx: true}, transform: {react: {runtime: 'automatic'}}, target: 'es2022'},
  module: {type: 'commonjs'}
})
const compiled = {exports: {}}
runInNewContext('(function(require, module, exports) {' + code + '\n})', {})(specifier => specifier === '@/lib/declarants.js' ? declarants : require(specifier), compiled, compiled.exports)
const MutationList = compiled.exports.default

test('l’audit affiche un libellé humain et les deux valeurs de l’exclusion rapide', t => {
  const html = renderToStaticMarkup(React.createElement(MutationList, {mutations: [{
    id: 'audit-synthetic', entityType: 'EXPLOITATION', entityId: 'exploitation-synthetic', operation: 'UPDATE',
    changedFields: ['excludeFromQuickDeclaration'],
    before: {excludeFromQuickDeclaration: false}, after: {excludeFromQuickDeclaration: true}
  }]}))
  t.true(html.includes('Exclure de la saisie rapide'))
  t.false(html.includes('excludeFromQuickDeclaration'))
  t.regex(html, />Non<\/td>/)
  t.regex(html, />Oui<\/td>/)
})
