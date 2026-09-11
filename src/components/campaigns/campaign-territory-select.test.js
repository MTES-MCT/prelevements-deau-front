import React from 'react'

import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {runInNewContext} from 'node:vm'

import test from 'ava'
import {transformSync} from 'next/dist/build/swc/index.js'
import {renderToStaticMarkup} from 'react-dom/server'

const require = createRequire(import.meta.url)
const filename = new URL('campaign-territory-select.js', import.meta.url)
const {code} = transformSync(readFileSync(filename, 'utf8'), {filename: filename.pathname, jsc: {parser: {syntax: 'ecmascript', jsx: true}, transform: {react: {runtime: 'automatic'}}, target: 'es2022'}, module: {type: 'commonjs'}})
const territories = [
  {
    id: 'region', name: 'Auvergne-Rhône-Alpes', code: '84', type: 'REGION'
  },
  {
    id: 'department', name: 'Isère', code: '38', type: 'DEPARTEMENT'
  },
  {
    id: 'sage', name: 'Bièvre Liers Valloire', code: 'SAGE06025', type: 'SAGE'
  }
]

const territorySelect = ({value = '', options = territories, onChange = () => {}} = {}) => {
  const compiledModule = {exports: {}}
  let autocomplete
  const componentRequire = specifier => {
    if (specifier === '@mui/material/Autocomplete') {
      return props => {
        autocomplete = props
        return props.renderInput({
          slotProps: {
            input: {ref: {current: null}},
            htmlInput: {
              id: props.id, role: 'combobox', 'aria-expanded': false, 'aria-autocomplete': 'list', value: props.value ? props.getOptionLabel(props.value) : '', readOnly: true
            }
          }
        })
      }
    }

    return require(specifier)
  }

  runInNewContext('(function(require, module, exports) {' + code + '\n})', {})(componentRequire, compiledModule, compiledModule.exports)
  const html = renderToStaticMarkup(React.createElement(compiledModule.exports.default, {territories: options, value, onChange}))
  return {html, autocomplete, helpers: compiledModule.exports}
}

test('les options et le territoire sélectionné reprennent les palettes des zones avec un libellé explicite', t => {
  const presentations = [
    ['region', 'Région', '#000091', '#eeeeff', 'ri-map-pin-2-line'],
    ['department', 'Département', '#18753c', '#e6f4ea', 'ri-map-pin-line'],
    ['sage', 'SAGE', '#8d533e', '#fff4f0', 'ri-drop-line']
  ]
  for (const [value, label, color, background, icon] of presentations) {
    const {html, autocomplete} = territorySelect({value})
    const selected = territories.find(territory => territory.id === value)
    const option = renderToStaticMarkup(autocomplete.renderOption({key: value, role: 'option', 'aria-selected': true}, selected))
    for (const markup of [html, option]) {
      t.true(markup.includes(`border-[${color}] bg-[${background}] text-[${color}]`))
      t.true(markup.includes(icon))
      t.true(markup.includes(`>${label}</span>`))
      t.true(markup.includes('aria-hidden="true"'))
    }

    t.true(html.includes(`color:${color};background-color:${background}`))
    t.true(html.includes(`value="${autocomplete.getOptionLabel(selected)}"`))
    t.true(option.includes(autocomplete.getOptionLabel(selected)))
  }
})

test('la recherche conserve accents, code département et mots multiples sans changer les territoires fournis', t => {
  const snapshot = structuredClone(territories)
  const {autocomplete, helpers} = territorySelect()
  for (const [inputValue, expected] of [['isere 38', 'department'], ['bievre valloire', 'sage'], ['SAGE06025', 'sage'], ['rhone', 'region']]) {
    t.deepEqual(helpers.filterCampaignTerritories(territories, {inputValue}).map(option => option.id), [expected])
  }

  t.deepEqual(helpers.filterCampaignTerritories(territories, {inputValue: 'introuvable'}), [])
  t.deepEqual(autocomplete.options.map(option => option.id), ['sage', 'department', 'region'])
  t.deepEqual(autocomplete.options.map(option => autocomplete.groupBy(option)), ['Bassins (SAGE)', 'Départements', 'Régions'])
  t.deepEqual(territories, snapshot)
})

test('un territoire hors du périmètre fourni ne réapparaît ni comme option ni comme valeur sélectionnée', t => {
  const {html, autocomplete} = territorySelect({value: 'region', options: [territories[1]]})
  t.is(autocomplete.value, null)
  t.deepEqual(autocomplete.options, [territories[1]])
  t.false(html.includes('Auvergne-Rhône-Alpes'))
  t.false(html.includes('bg-[#eeeeff]'))
  const empty = territorySelect({value: 'department', options: []})
  t.is(empty.autocomplete.value, null)
  t.deepEqual(empty.autocomplete.options, [])
})

test('le type inconnu reste lisible avec la présentation neutre', t => {
  const territory = {
    id: 'other', name: 'Territoire particulier', type: 'UNKNOWN'
  }
  const {html, autocomplete} = territorySelect({value: territory.id, options: [territory]})
  const option = renderToStaticMarkup(autocomplete.renderOption({key: territory.id}, territory))
  for (const markup of [html, option]) {
    t.true(markup.includes('border-gray-300 bg-gray-100 text-gray-700'))
    t.true(markup.includes('>Territoire</span>'))
  }

  t.is(autocomplete.groupBy(territory), 'Territoires')
  t.true(html.includes('value="Territoire particulier"'))
})

test('le rendu conserve les références, événements et attributs clavier fournis par MUI', t => {
  const {autocomplete, html} = territorySelect({value: 'department'})
  const ref = {current: null}
  const onChange = () => {}
  const onBlur = () => {}
  const onClick = () => {}
  const onKeyDown = () => {}
  const inputRef = {current: null}
  const adornment = React.createElement('button', {type: 'button'}, 'Ouvrir')
  const tree = autocomplete.renderInput({
    slotProps: {
      input: {ref, endAdornment: adornment},
      htmlInput: {
        id: autocomplete.id, ref: inputRef, role: 'combobox', 'aria-controls': 'territories-list', 'aria-expanded': true, 'aria-activedescendant': 'territory-department', onChange, onBlur, onKeyDown
      }
    }
  })
  const input = React.Children.toArray(tree.props.children).find(element => element.type === 'input')
  t.is(tree.props.ref, ref)
  t.is(input.props.ref, inputRef)
  t.is(input.props.role, 'combobox')
  t.is(input.props.onChange, onChange)
  t.is(input.props.onBlur, onBlur)
  t.is(input.props.onKeyDown, onKeyDown)
  t.is(input.props['aria-controls'], 'territories-list')
  t.is(input.props['aria-activedescendant'], 'territory-department')
  t.true(input.props['aria-expanded'])
  t.true(input.props.required)
  t.is(input.props['aria-describedby'], `${autocomplete.id}-hint ${autocomplete.id}-type`)
  t.true(html.includes(`for="${autocomplete.id}"`))
  t.true(html.includes(`id="${autocomplete.id}-type"`))
  t.true(tree.props.children.includes(adornment))
  const option = autocomplete.renderOption({
    key: 'department', ref, id: 'territory-department', role: 'option', tabIndex: -1, onClick, 'aria-selected': true
  }, territories[1])
  t.is(option.type, 'li')
  t.is(option.ref, ref)
  t.is(option.props.onClick, onClick)
  t.is(option.props.tabIndex, -1)
  t.is(option.props.id, 'territory-department')
  t.is(option.props.role, 'option')
  t.true(option.props['aria-selected'])
})

test('sélectionner et effacer ne transmettent que l’identifiant, sans requête supplémentaire', t => {
  const changes = []
  const {autocomplete} = territorySelect({onChange: value => changes.push(value)})
  autocomplete.onChange({}, territories[1])
  autocomplete.onChange({}, null)
  t.deepEqual(changes, ['department', ''])
  t.true(autocomplete.isOptionEqualToValue(territories[1], {...territories[1]}))
  t.false(autocomplete.isOptionEqualToValue(territories[0], territories[1]))
})
