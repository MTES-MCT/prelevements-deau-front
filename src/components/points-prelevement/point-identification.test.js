import React from 'react'

import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {runInNewContext} from 'node:vm'

import test from 'ava'
import {transformSync} from 'next/dist/build/swc/index.js'
import {renderToStaticMarkup} from 'react-dom/server'

import * as characteristics from '../../lib/point-characteristics.js'
import * as flowTypes from '../../lib/point-flow-types.js'
import * as pointNames from '../../utils/point-prelevement.js'

const require = createRequire(import.meta.url)

function loadComponent(relativePath) {
  const filename = new URL(relativePath, import.meta.url)
  const {code} = transformSync(readFileSync(filename, 'utf8'), {
    filename: filename.pathname,
    jsc: {parser: {syntax: 'ecmascript', jsx: true}, transform: {react: {runtime: 'automatic'}}, target: 'es2022'},
    module: {type: 'commonjs'}
  })
  const compiledModule = {exports: {}}
  const componentRequire = specifier => {
    if (specifier === '@codegouvfr/react-dsfr/Button') {
      return {Button: ({children, linkProps}) => React.createElement('a', linkProps, children)}
    }
    if (specifier.startsWith('@mui/icons-material/')) return () => null
    if (specifier === '@mui/material') {
      return {
        Box: ({children, className}) => React.createElement('div', {className}, children),
        Chip: ({label}) => React.createElement('span', null, label),
        Typography: ({children}) => React.createElement('h2', null, children)
      }
    }
    if (specifier === '@/components/points-prelevement/point-usage-name-editor.js') return () => null
    if (specifier === '@/lib/format-date.js') return () => null
    if (specifier === '@/lib/point-characteristics.js') return characteristics
    if (specifier === '@/lib/point-flow-types.js') return flowTypes
    if (specifier === '@/lib/points-prelevement.js') return {getTypeMilieuColor: () => ({})}
    if (specifier === '@/utils/point-prelevement.js') return pointNames
    if (specifier === '@/lib/declarants.js') {
      return {DECLARANT_PERSON_TYPE_LABELS: {}, DECLARANT_ROLE_LABELS: {}, PRELEVEUR_TYPE_LABELS: {}}
    }
    return require(specifier)
  }
  runInNewContext('(function(require, module, exports) {' + code + '\n})', {})(componentRequire, compiledModule, compiledModule.exports)
  return compiledModule.exports.default
}

const PointIdentification = loadComponent('./point-identification.js')
const MutationList = loadComponent('../audit/mutation-list.js')
const renderPoint = point => renderToStaticMarkup(React.createElement(PointIdentification, {
  pointPrelevement: {id: 'synthetic-point', name: 'Retenue synthétique', nature: 'PLAN_EAU', ...point}
}))

test('la fiche présente le volume positif en français avec ses décimales et son unité', t => {
  const html = renderPoint({reservoirNominalVolume: 1234.56789, waterBodyIdentifier: '00123-A'})
  t.true(html.includes('Volume nominal de la retenue'))
  t.true(html.includes('1\u202f234,56789 m³'))
  t.true(html.includes('Identifiant du plan d’eau'))
  t.true(html.includes('00123-A'))
  t.true(html.indexOf('Volume nominal de la retenue') < html.indexOf('Plan d’eau connecté au cours d’eau'))
  t.true(renderPoint({reservoirNominalVolume: 0.00001}).includes('0,00001 m³'))
})

test('la fiche masque les nouvelles caractéristiques absentes ou incompatibles avec l’origine', t => {
  for (const reservoirNominalVolume of [undefined, null, 0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    const html = renderPoint({reservoirNominalVolume, waterBodyIdentifier: null})
    t.false(html.includes('Volume nominal de la retenue'))
    t.false(html.includes('Identifiant du plan d’eau'))
  }
  for (const nature of [null, 'NAPPE', 'COURS_EAU']) {
    const html = renderPoint({nature, reservoirNominalVolume: 125.5, waterBodyIdentifier: 'RET-001'})
    t.false(html.includes('Volume nominal de la retenue'))
    t.false(html.includes('Identifiant du plan d’eau'))
  }
})

test('l’identifiant est du texte échappé, sans lien ni interprétation HTML', t => {
  const html = renderPoint({waterBodyIdentifier: '<script>alert("x")</script>'})
  t.true(html.includes('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'))
  t.false(html.includes('<script>'))
  t.true(html.includes('min-w-0 max-w-full break-words'))
})

test('les deux caractéristiques ont des libellés lisibles dans les différences d’audit', t => {
  const html = renderToStaticMarkup(React.createElement(MutationList, {mutations: [{
    id: 'synthetic-mutation', entityType: 'POINT', operation: 'UPDATE',
    changedFields: ['reservoirNominalVolume', 'waterBodyIdentifier'],
    before: {reservoirNominalVolume: null, waterBodyIdentifier: null},
    after: {reservoirNominalVolume: 25.5, waterBodyIdentifier: 'RET-002'}
  }]}))
  t.true(html.includes('Volume nominal de la retenue (m³)'))
  t.true(html.includes('Identifiant du plan d’eau'))
  t.false(html.includes('reservoirNominalVolume'))
  t.false(html.includes('waterBodyIdentifier'))
})
