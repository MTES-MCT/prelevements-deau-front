import React from 'react'

import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {runInNewContext} from 'node:vm'

import test from 'ava'
import {transformSync} from 'next/dist/build/swc/index.js'
import {renderToStaticMarkup} from 'react-dom/server'

import * as readingHelpers from '../../lib/campaign-response-readings.js'
import * as campaignHelpers from '../../lib/collection-campaigns.js'
import * as waterHelpers from '../../lib/water-uses.js'

const require = createRequire(import.meta.url)
const filename = new URL('campaign-response-entries.js', import.meta.url)
const {code} = transformSync(readFileSync(filename, 'utf8'), {filename: filename.pathname, jsc: {parser: {syntax: 'ecmascript', jsx: true}, transform: {react: {runtime: 'automatic'}}, target: 'es2022'}, module: {type: 'commonjs'}})
const imports = {
  '@/lib/campaign-response-readings.js': readingHelpers,
  '@/lib/collection-campaigns.js': campaignHelpers,
  '@/lib/water-uses.js': waterHelpers,
  '@/components/campaigns/campaign-meter-events.js': () => null,
  '@/components/campaigns/campaign-ui.js': {CampaignField: () => null}
}
const load = (react = React) => {
  const compiledModule = {exports: {}}
  runInNewContext('(function(require, module, exports) {' + code + '\n})', {})(specifier => specifier === 'react' ? react : (imports[specifier] ?? require(specifier)), compiledModule, compiledModule.exports)
  return compiledModule.exports
}

const {IndexRows: Rows} = load()
// Layout assertions inspect native children, independently of generated markup.
const inspectedComponents = load({
  ...React, useId: () => 'layout-field', useCallback: callback => callback, useState: initial => [initial, () => {}]
})
const expand = node => {
  if (Array.isArray(node)) {
    return node.map(item => expand(item))
  }

  if (!node || typeof node !== 'object') {
    return node
  }

  if (typeof node.type === 'function') {
    return expand(node.type(node.props))
  }

  return {...node, props: {...node.props, children: expand(node.props.children)}}
}

const children = node => React.Children.toArray(node?.props?.children)
const nodes = tree => Array.isArray(tree) ? tree.flatMap(node => nodes(node)) : (tree && typeof tree === 'object' ? [tree, ...nodes(tree.props?.children)] : [])
const content = node => typeof node === 'string' || typeof node === 'number' ? String(node) : (Array.isArray(node) ? node.map(item => content(item)).join('') : content(node?.props?.children || []))
const hasNode = (node, type) => nodes(node).some(child => child.type === type)
const classes = node => (node?.props?.className || '').split(' ')
const gridClasses = node => classes(node).filter(name => name === 'grid' || name.startsWith('grid-cols-') || name.startsWith('gap-'))
const context = {
  campaign: {indexDates: ['2026-01-01', '2026-06-01', '2027-01-01']}, editableTargetIds: ['point'],
  permissions: {canEdit: true},
  targets: [{id: 'point', pointPrelevement: {name: 'Forage'}, meters: [{compteurId: 'old', compteur: {serialNumber: 'Ancien'}}, {compteurId: 'new', compteur: {serialNumber: 'Nouveau'}}]}]
}
const event = {
  targetId: 'point', type: 'REPLACEMENT', at: '2026-06-01', previousCompteurId: 'old', nextCompteurId: 'new', previousIndex: '500', nextIndex: '0', reason: 'Compteur remplacé'
}
const render = (draft, props = {}) => renderToStaticMarkup(React.createElement(Rows, {
  context, draft, disabled: false, onChange() {
    throw new Error('Aucune mutation attendue')
  }, ...props
}))
const inspect = (draft, props = {}, kind = 'INDEX') => expand(React.createElement(inspectedComponents[kind === 'INDEX' ? 'IndexRows' : 'NeedsRows'], {
  context, draft, disabled: false, onChange() {
    throw new Error('Aucune mutation attendue')
  }, ...props
}))
const headerOf = tree => nodes(tree).find(node => node.type === 'div' && node.props['aria-hidden'] === 'true')

test('l’en-tête sépare la date de relevé et l’index dans deux cellules alignées', t => {
  const html = render({readings: [], meterEvents: []})
  const header = headerOf(inspect({readings: [], meterEvents: []}))
  const [point, datesAndIndexes, usage] = children(header)
  const [date, index] = children(datesAndIndexes)
  t.is(content(point), 'Point')
  t.is(content(usage), 'Usage')
  t.is(children(datesAndIndexes).length, 2)
  t.is(content(date), 'Date de relevé')
  t.is(content(index), 'Index (m³)')
  t.true(classes(index).includes('text-right'))
  t.deepEqual(gridClasses(datesAndIndexes), ['grid', 'grid-cols-[minmax(0,1fr)_minmax(5.5rem,7rem)]', 'gap-3'])
  t.false(html.includes('Date de relevé / Index (m³)'))
  t.false(html.includes('Relevés attendus'))
})

test('les relevés ordinaires partagent la grille des en-têtes, avec date à gauche et saisie à droite', t => {
  const tree = inspect({
    readings: [{
      targetId: 'point', compteurId: 'old', readingDate: '2026-01-01', value: '125'
    }], meterEvents: []
  })
  const headerGrid = children(headerOf(tree))[1]
  const grids = nodes(tree).filter(node => node.type === 'div' && classes(node).includes('grid') && children(node).length === 2 && hasNode(children(node)[0], 'time') && hasNode(children(node)[1], 'input'))
  t.is(grids.length, 6)
  for (const grid of grids) {
    t.deepEqual(gridClasses(grid), gridClasses(headerGrid))
    t.true(classes(grid).includes('items-start'))
    const [date, index] = children(grid)
    t.false(hasNode(date, 'input'))
    t.false(hasNode(index, 'time'))
    t.true(nodes(index).some(node => node.type === 'input' && classes(node).includes('text-right')))
  }

  t.is(nodes(grids[0]).find(node => node.type === 'time').props.dateTime, '2026-01-01')
  t.is(nodes(children(grids[0])[1]).find(node => node.type === 'input').props.value, '125')
})

test('les bordures et espacements latéraux de l’en-tête suivent ceux des lignes de points', t => {
  const tree = inspect({readings: [], meterEvents: []})
  const header = headerOf(tree)
  const point = children(tree).find(node => node.type === 'div' && classes(node).includes('grid-cols-1'))
  for (const name of ['border-l-4', 'border-r', 'px-2', 'gap-3']) {
    t.true(classes(header).includes(name), `En-tête : ${name}`)
    t.true(classes(point).includes(name), `Ligne : ${name}`)
  }

  t.deepEqual(classes(header).filter(name => name.startsWith('md:grid-cols-')), classes(point).filter(name => name.startsWith('md:grid-cols-')))
})

for (const type of ['REPLACEMENT', 'RESET']) {
  test(`les index d’un ${type} restent dans la colonne de droite sans déplacer la date`, t => {
    const meterEvent = type === 'RESET' ? {...event, type, nextCompteurId: 'old'} : event
    const scopedContext = type === 'RESET' ? {...context, targets: [{...context.targets[0], meters: [context.targets[0].meters[0]]}]} : context
    const tree = inspect({readings: [], meterEvents: [meterEvent]}, {context: scopedContext})
    const headerGrid = children(headerOf(tree))[1]
    const transitions = nodes(tree).filter(node => node.type === 'div' && classes(node).includes('grid') && children(node).length === 2 && hasNode(children(node)[0], 'time') && children(node)[1].type === 'dl')
    t.is(transitions.length, type === 'RESET' ? 1 : 2)
    for (const transition of transitions) {
      t.deepEqual(gridClasses(transition), gridClasses(headerGrid))
      const [date, index] = children(transition)
      t.is(nodes(date).find(node => node.type === 'time').props.dateTime, '2026-06-01')
      t.true(content(date).includes('Renseigné dans le changement'))
      t.false(hasNode(date, 'dd'))
      t.false(hasNode(index, 'time'))
      t.true(classes(index).includes('text-right'))
      t.false(hasNode(transition, 'input'))
    }

    t.deepEqual(transitions.flatMap(transition => nodes(children(transition)[1]).filter(node => node.type === 'dd').map(node => content(node))), ['500 m³', '0 m³'])
  })
}

test('un nouveau compteur en attente garde sa date et son explication dans la grille commune', t => {
  const {nextCompteurId, ...pendingEvent} = event
  pendingEvent.nextMeter = {serialNumber: 'Nouveau compteur'}
  const scopedContext = {...context, targets: [{...context.targets[0], meters: [context.targets[0].meters[0]]}]}
  const tree = inspect({readings: [], meterEvents: [pendingEvent]}, {context: scopedContext})
  const headerGrid = children(headerOf(tree))[1]
  const pending = nodes(tree).find(node => node.type === 'div' && classes(node).includes('grid') && children(node).some(child => child.type === 'p' && content(child).startsWith('Le relevé du nouveau compteur')))
  t.truthy(pending)
  t.deepEqual(gridClasses(pending), gridClasses(headerGrid))
  t.is(nodes(pending).find(node => node.type === 'time').props.dateTime, '2027-01-01')
  t.true(classes(children(pending).find(node => node.type === 'p')).includes('col-span-2'))
  t.false(hasNode(pending, 'input'))
})

test('les besoins séparent la période et le volume demandé dans deux colonnes alignées', t => {
  const scopedContext = {
    ...context, campaign: {
      ...context.campaign, periods: [{
        id: 'need', kind: 'NEEDS', label: 'Été 2026', startDate: '2026-06-01', endDate: '2026-09-01'
      }]
    }
  }
  const tree = inspect({needs: [{targetId: 'point', periodId: 'need', requestedVolume: '250'}]}, {context: scopedContext}, 'NEEDS')
  const [point, values, usage] = children(headerOf(tree))
  t.deepEqual([content(point), content(usage)], ['Point', 'Usage'])
  t.deepEqual(children(values).map(node => content(node)), ['Période', 'Besoin en eau (m³)'])
  t.true(classes(children(values)[1]).includes('text-right'))
  const row = nodes(tree).find(node => node.type === 'div' && classes(node).includes('items-start') && children(node).length === 2 && hasNode(children(node)[1], 'input'))
  t.deepEqual(gridClasses(row), gridClasses(values))
  t.true(content(children(row)[0]).includes('Été 2026'))
  t.false(hasNode(children(row)[0], 'input'))
  t.true(nodes(children(row)[1]).some(node => node.type === 'input' && classes(node).includes('text-right')))
  t.false(content(tree).includes('Date de relevé'))
  t.false(content(tree).includes('Index (m³)'))
  t.true(content(tree).includes('Du 1 juin 2026 au 31 août 2026'))
  t.is(nodes(tree).find(node => node.type === 'input').props.value, '250')
  t.true(content(nodes(tree).find(node => node.type === 'label')).includes('Besoin en eau (m³) · Été 2026 · Forage'))
  t.notRegex(content(tree), /\d{1,16}\/\d{1,16} volumes renseignés/)
  t.true(nodes(tree).some(node => classes(node).includes('border-l-green-600')))
})

for (const kind of ['INDEX', 'NEEDS']) {
  test(`les intitulés ${kind} restent visibles sur mobile sans dupliquer l’en-tête desktop`, t => {
    const scopedContext = {
      ...context, campaign: {
        ...context.campaign, periods: [{
          id: 'need', kind: 'NEEDS', label: 'Été', startDate: '2026-06-01', endDate: '2026-09-01'
        }]
      }
    }
    const tree = inspect({readings: [], meterEvents: [], needs: []}, {context: scopedContext}, kind)
    const mobileHeaders = nodes(tree).filter(node => node.type === 'div' && classes(node).includes('md:hidden'))
    t.is(mobileHeaders.length, 1)
    t.deepEqual(children(mobileHeaders[0]).map(node => content(node)), kind === 'INDEX' ? ['Date de relevé', 'Index (m³)'] : ['Période', 'Besoin en eau (m³)'])
    t.deepEqual(gridClasses(mobileHeaders[0]), gridClasses(children(headerOf(tree))[1]))
    t.true(classes(headerOf(tree)).includes('hidden'))
    t.true(classes(headerOf(tree)).includes('md:grid'))
  })
}

test('la couleur de remplissage des besoins reste calculée sans afficher de compteur de réponses', t => {
  const scopedContext = {
    ...context, campaign: {
      ...context.campaign, periods: [
        {
          id: 'first', kind: 'NEEDS', label: 'Printemps', startDate: '2026-03-01', endDate: '2026-06-01'
        },
        {
          id: 'second', kind: 'NEEDS', label: 'Été', startDate: '2026-06-01', endDate: '2026-09-01'
        }
      ]
    }
  }
  const partial = {needs: [{targetId: 'point', periodId: 'first', requestedVolume: '0'}]}
  const complete = {needs: [...partial.needs, {targetId: 'point', periodId: 'second', requestedVolume: '250'}]}
  t.false(nodes(inspect(partial, {context: scopedContext}, 'NEEDS')).some(node => classes(node).includes('border-l-green-600')))
  const tree = inspect(complete, {context: scopedContext}, 'NEEDS')
  t.true(nodes(tree).some(node => classes(node).includes('border-l-green-600')))
  t.notRegex(content(tree), /\d{1,16}\/\d{1,16} volumes renseignés/)
  t.deepEqual(nodes(tree).filter(node => node.type === 'input').map(node => node.props.value), ['0', '250'])
})

test('le relevé de transition présente les index du changement, sans deuxième champ divergent', t => {
  const html = render({readings: [], meterEvents: [event]})
  t.is((html.match(/quick-declaration-control/g) || []).length, 2)
  t.is((html.match(/Renseigné dans le changement/g) || []).length, 2)
  t.true(html.includes('Avant le changement'))
  t.true(html.includes('Après le changement'))
  t.true(html.includes('500 m³'))
  t.true(html.includes('0 m³'))
  t.false(html.includes('2/4 réponses renseignées'))
})

test('la remise à zéro présente les deux index sur une ligne et justifie explicitement un index inconnu', t => {
  const html = render({
    readings: [], meterEvents: [{
      ...event, type: 'RESET', nextCompteurId: 'old', previousIndex: null, reason: 'Cadran cassé'
    }]
  }, {context: {...context, targets: [{...context.targets[0], meters: [context.targets[0].meters[0]]}]}})
  t.is((html.match(/quick-declaration-control/g) || []).length, 2)
  t.is((html.match(/Renseigné dans le changement/g) || []).length, 1)
  t.true(html.includes('Index inconnu'))
  t.true(html.includes('Cadran cassé'))
  t.false(html.includes('1/3 réponses renseignées'))
})

test('la vue en lecture seule conserve le changement et désactive tous les autres relevés', t => {
  const html = render({readings: [], meterEvents: [event]}, {context: {...context, editableTargetIds: []}})
  t.is((html.match(/Renseigné dans le changement/g) || []).length, 2)
  t.is((html.match(/<input[^>]+disabled=""/g) || []).length, 2)
  t.false(html.includes('Corriger ce relevé'))
})

test('supprimer le changement restaure les champs sans supprimer leurs anciennes valeurs', t => {
  const readings = [{
    targetId: 'point', compteurId: 'old', readingDate: '2027-01-01', value: '750'
  }]
  t.false(render({readings, meterEvents: [event]}).includes('value="750"'))
  const html = render({readings, meterEvents: []})
  t.true(html.includes('value="750"'))
  t.is((html.match(/quick-declaration-control/g) || []).length, 6)
  t.false(html.includes('Renseigné dans le changement'))
})
