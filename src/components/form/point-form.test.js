import React from 'react'

import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {runInNewContext} from 'node:vm'

import test from 'ava'
import {transformSync} from 'next/dist/build/swc/index.js'
import {renderToStaticMarkup} from 'react-dom/server'

import * as characteristics from '../../lib/point-characteristics.js'
import * as flowTypes from '../../lib/point-flow-types.js'

const require = createRequire(import.meta.url)

function renderPointForm(point, setPoint = () => {}) {
  const controls = new Map()
  const input = ({label, nativeInputProps, nativeTextAreaProps, textArea, required}) => {
    const props = textArea ? nativeTextAreaProps : nativeInputProps
    controls.set(label, props)
    return React.createElement('label', null, label, React.createElement(textArea ? 'textarea' : 'input', {...props, required}))
  }

  const select = ({label, hint, hintText, nativeSelectProps, options}) => {
    controls.set(label, nativeSelectProps)
    return React.createElement('label', null, label, hint || hintText,
      React.createElement('select', nativeSelectProps, options.map(option => React.createElement('option', {key: option.value, value: option.value}, option.label))))
  }

  const loadComponent = name => {
    const filename = new URL(`${name}.js`, import.meta.url)
    const {code} = transformSync(readFileSync(filename, 'utf8'), {filename: filename.pathname, jsc: {parser: {syntax: 'ecmascript', jsx: true}, transform: {react: {runtime: 'automatic'}}, target: 'es2022'}, module: {type: 'commonjs'}})
    const compiledModule = {exports: {}}
    const componentRequire = specifier => {
      if (specifier === '@codegouvfr/react-dsfr/Input') {
        return input
      }

      if (specifier === '@codegouvfr/react-dsfr/SelectNext') {
        return select
      }

      if (specifier === '@mui/material') {
        return {Typography: ({children}) => React.createElement('h2', null, children)}
      }

      if (specifier === 'next/dynamic') {
        return (_loader, options) => options.loading
      }

      if (specifier === '@/components/form/nullable-boolean-select.js') {
        return loadComponent('nullable-boolean-select')
      }

      if (specifier === '@/components/form/optional-point-fields-form.js') {
        return function OptionalPointFields() {
          return React.createElement('div', null, 'Champs optionnels')
        }
      }

      if (specifier === '@/components/ui/AccordionCentered/index.js' || specifier === '@/components/ui/deferred-render.js') {
        return function Container({children}) {
          return React.createElement('div', null, children)
        }
      }

      if (specifier === '@/lib/point-characteristics.js') {
        return characteristics
      }

      if (specifier === '@/lib/point-flow-types.js') {
        return flowTypes
      }

      return require(specifier)
    }

    runInNewContext('(function(require, module, exports) {' + code + '\n})', {})(componentRequire, compiledModule, compiledModule.exports)
    return compiledModule.exports
  }

  const html = renderToStaticMarkup(React.createElement(loadComponent('point-form').default, {point, setPoint, handleSetGeom() {}}))
  return {html, controls}
}

const pointFixture = () => ({
  id: 'point', name: 'Forage des prés', flowType: 'PRELEVEMENT', pointKind: 'PHYSIQUE', waterBodyType: 'SOUTERRAIN',
  nature: 'NAPPE', withdrawalType: 'SOUTERRAIN', coordinates: [1.25, 44.5], locationDescription: 'Parcelle du moulin',
  geometryPrecision: 'Coordonnées précises', comment: 'Accès par le chemin', internalComment: 'Vérifier la localisation'
})

test('le formulaire ne présente plus le mode de collecte mais conserve les champs du point', t => {
  const {html, controls} = renderPointForm(pointFixture())
  t.notRegex(html, /Mode de collecte des relevés|Règle existante|Saisie manuelle|Collecte externe/)
  for (const label of ['Nom du point *', 'Type de point *', 'Nature du point *', 'Type de milieu *', 'Origine prélèvement / rejet', 'Type de prélèvement / rejet', 'Détails sur la localisation', 'Précision géométrique', 'Remarque', 'Remarque interne (visible uniquement par les agents)']) {
    t.true(controls.has(label), `Champ conservé : ${label}`)
  }

  t.true(html.includes('Forage des prés'))
  t.true(html.includes('Localisation'))
  t.true(html.includes('Chargement de la carte…'))
  t.true(html.includes('Champs optionnels'))
})

test('le rendu ne modifie ni ne renseigne implicitement le mode de collecte existant', t => {
  for (const collectionMode of [undefined, null, 'MANUAL', 'EXTERNAL']) {
    const point = pointFixture()
    if (collectionMode !== undefined) {
      point.collectionMode = collectionMode
    }

    Object.freeze(point.coordinates)
    Object.freeze(point)
    const before = structuredClone(point)
    let updates = 0
    const {html} = renderPointForm(point, () => {
      updates++
    })
    t.deepEqual(point, before)
    t.is(updates, 0)
    t.is(Object.hasOwn(point, 'collectionMode'), collectionMode !== undefined)
    t.notRegex(html, /Mode de collecte des relevés|Règle existante|Saisie manuelle/)
  }
})

test('modifier un champ courant préserve le mode de collecte sans normalisation cachée', t => {
  for (const collectionMode of [null, 'MANUAL', 'EXTERNAL']) {
    let point = {...pointFixture(), collectionMode}
    const {controls} = renderPointForm(point, update => {
      point = update(point)
    })
    controls.get('Nom du point *').onChange({target: {value: 'Nom corrigé'}})
    controls.get('Type de milieu *').onChange({target: {value: 'SUPERFICIELLE'}})
    t.is(point.name, 'Nom corrigé')
    t.is(point.waterBodyType, 'SUPERFICIELLE')
    t.is(point.collectionMode, collectionMode)
    t.deepEqual(point.coordinates, [1.25, 44.5])
  }
})

test('les caractéristiques conditionnelles du plan d’eau restent éditables', t => {
  let point = {
    ...pointFixture(), nature: 'PLAN_EAU', collectionMode: 'EXTERNAL', isWaterBodyConnectedToStream: null, isWaterBodyConnectedToGroundwater: false
  }
  const {controls} = renderPointForm(point, update => {
    point = update(point)
  })
  t.true(controls.has('Plan d’eau connecté au cours d’eau'))
  t.true(controls.has('Plan d’eau connecté à la nappe'))
  controls.get('Plan d’eau connecté au cours d’eau').onChange({target: {value: 'true'}})
  t.true(point.isWaterBodyConnectedToStream)
  t.is(point.collectionMode, 'EXTERNAL')
})
