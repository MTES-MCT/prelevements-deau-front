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
  const input = ({label, nativeInputProps, nativeTextAreaProps, textArea, required, state, stateRelatedMessage}) => {
    const props = textArea ? nativeTextAreaProps : nativeInputProps
    controls.set(label, props)
    return React.createElement('label', null, label,
      React.createElement(textArea ? 'textarea' : 'input', {...props, required}),
      state === 'error' ? React.createElement('span', null, stateRelatedMessage) : null)
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

test('le HTML initial garde la saisie désactivée jusqu’à l’hydratation React', t => {
  const {html} = renderPointForm(pointFixture())
  t.regex(html, /<fieldset[^>]*disabled=""[^>]*aria-busy="true"/)
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

test('les deux caractéristiques du plan d’eau précèdent les connexions, sans être affichées pour les autres origines', t => {
  const point = {...pointFixture(), nature: 'PLAN_EAU', reservoirNominalVolume: 1234.5, waterBodyIdentifier: '00123'}
  const {html, controls} = renderPointForm(point)
  const volume = controls.get('Volume nominal de la retenue (m³)')
  const identifier = controls.get('Identifiant du plan d’eau')
  t.is(volume.type, 'number')
  t.is(volume.step, 'any')
  t.is(volume.value, 1234.5)
  t.is(identifier.type, 'text')
  t.is(identifier.maxLength, 100)
  t.is(identifier.value, '00123')
  t.true(html.indexOf('Volume nominal de la retenue') < html.indexOf('Identifiant du plan d’eau'))
  t.true(html.indexOf('Identifiant du plan d’eau') < html.indexOf('Plan d’eau connecté au cours d’eau'))
  t.true(html.includes('grid-cols-1 gap-4 md:grid-cols-2'))
  for (const nature of [undefined, null, 'NAPPE', 'COURS_EAU', 'SOURCE']) {
    const {controls: otherControls} = renderPointForm({...point, nature})
    t.false(otherControls.has('Volume nominal de la retenue (m³)'))
    t.false(otherControls.has('Identifiant du plan d’eau'))
  }
})

test('le volume contrôlé accepte les décimales et envoie null, pas zéro, après effacement', t => {
  const existingPoint = {...pointFixture(), nature: 'PLAN_EAU', reservoirNominalVolume: 1234.5}
  let payload = {}
  const setPayload = update => { payload = update(payload) }
  const render = () => renderPointForm({...existingPoint, ...payload}, setPayload)
  render().controls.get('Volume nominal de la retenue (m³)').onChange({target: {value: '0.125'}})
  t.deepEqual(payload, {reservoirNominalVolume: 0.125})
  t.is(render().controls.get('Volume nominal de la retenue (m³)').value, 0.125)
  render().controls.get('Volume nominal de la retenue (m³)').onChange({target: {value: ''}})
  t.deepEqual(payload, {reservoirNominalVolume: null})
  t.is(render().controls.get('Volume nominal de la retenue (m³)').value, '')
  for (const value of ['0', '-2']) {
    render().controls.get('Volume nominal de la retenue (m³)').onChange({target: {value}})
    t.is(payload.reservoirNominalVolume, Number(value))
    t.true(render().html.includes('Saisissez un volume strictement supérieur à 0.'))
  }
})

test('l’identifiant préserve son texte et les zéros initiaux, avec trim au blur sans enrichir un payload intact', t => {
  const existingPoint = {...pointFixture(), nature: 'PLAN_EAU', waterBodyIdentifier: '00123'}
  let payload = {}
  const setPayload = update => { payload = update(payload) }
  const render = () => renderPointForm({...existingPoint, ...payload}, setPayload)
  const label = 'Identifiant du plan d’eau'
  render().controls.get(label).onBlur({target: {value: '00123'}})
  t.deepEqual(payload, {})
  render().controls.get(label).onChange({target: {value: '  00123 A  '}})
  t.deepEqual(payload, {waterBodyIdentifier: '  00123 A  '})
  render().controls.get(label).onBlur({target: {value: '  00123 A  '}})
  t.deepEqual(payload, {waterBodyIdentifier: '00123 A'})
  render().controls.get(label).onChange({target: {value: '   '}})
  render().controls.get(label).onBlur({target: {value: '   '}})
  t.deepEqual(payload, {waterBodyIdentifier: null})
  t.is(render().controls.get(label).value, '')
})

test('quitter PLAN_EAU efface les quatre caractéristiques sans restaurer ensuite les anciennes valeurs', t => {
  const existingPoint = {
    ...pointFixture(), nature: 'PLAN_EAU', reservoirNominalVolume: 25.5, waterBodyIdentifier: 'RET-001',
    isWaterBodyConnectedToStream: true, isWaterBodyConnectedToGroundwater: false
  }
  for (const nature of ['NAPPE', '']) {
    let payload = {}
    const setPayload = update => { payload = update(payload) }
    renderPointForm(existingPoint, setPayload).controls.get('Origine prélèvement / rejet').onChange({target: {value: nature}})
    t.deepEqual(payload, {
      nature: nature || null, reservoirNominalVolume: null, waterBodyIdentifier: null,
      isWaterBodyConnectedToStream: null, isWaterBodyConnectedToGroundwater: null
    })
    renderPointForm({...existingPoint, ...payload}, setPayload).controls.get('Origine prélèvement / rejet').onChange({target: {value: 'PLAN_EAU'}})
    const {controls} = renderPointForm({...existingPoint, ...payload}, setPayload)
    t.is(controls.get('Volume nominal de la retenue (m³)').value, '')
    t.is(controls.get('Identifiant du plan d’eau').value, '')
    t.is(payload.isWaterBodyConnectedToStream, null)
    t.is(payload.isWaterBodyConnectedToGroundwater, null)
  }
})

test('modifier un autre champ ne normalise pas les caractéristiques non touchées du plan d’eau', t => {
  let payload = {}
  const {controls} = renderPointForm({...pointFixture(), nature: 'PLAN_EAU', reservoirNominalVolume: 42.75, waterBodyIdentifier: 'RET-0001'}, update => {
    payload = update(payload)
  })
  controls.get('Nom du point *').onChange({target: {value: 'Nom corrigé'}})
  t.deepEqual(payload, {name: 'Nom corrigé'})
})
