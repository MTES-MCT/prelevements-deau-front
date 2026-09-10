import React from 'react'

import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {runInNewContext} from 'node:vm'

import test from 'ava'
import {transformSync} from 'next/dist/build/swc/index.js'
import {renderToStaticMarkup} from 'react-dom/server'

import * as campaignCalendar from '../../lib/campaign-calendar.js'
import * as campaignMeterValidation from '../../lib/campaign-meter-event-validation.js'
import * as campaignReadings from '../../lib/campaign-response-readings.js'
import * as campaignHelpers from '../../lib/collection-campaigns.js'

const require = createRequire(import.meta.url)
const nodes = tree => Array.isArray(tree) ? tree.flatMap(node => nodes(node)) : (tree && typeof tree === 'object' ? [tree, ...nodes(tree.props?.children)] : [])
const content = tree => {
  if (Array.isArray(tree)) {
    return tree.map(node => content(node)).join('')
  }

  if (tree && typeof tree === 'object') {
    return content(tree.props?.children)
  }

  return typeof tree === 'boolean' ? '' : String(tree ?? '')
}

const matches = (value, expected) => expected instanceof RegExp ? expected.test(value) : value === expected
const meter = (compteurId, serialNumber) => ({id: `binding-${compteurId}`, compteurId, compteur: {serialNumber}})
const context = ({canEdit = true, editableTargetIds = ['point-a', 'point-b']} = {}) => ({
  campaign: {
    id: 'campaign', name: 'Collecte annuelle', status: 'OPEN', indexDates: ['2025-11-01', '2026-06-01', '2026-11-01'],
    periods: [{
      id: 'period', kind: 'INDEX', startDate: '2025-11-01', endDate: '2026-11-01'
    }]
  },
  permissions: {canRead: true, canEdit, canSubmit: canEdit}, editableTargetIds,
  targets: [
    {id: 'point-a', pointPrelevement: {name: 'Forage A'}, meters: [meter('meter-a', 'Ancien A'), meter('meter-a2', 'Nouveau A')]},
    {id: 'point-b', pointPrelevement: {name: 'Forage B'}, meters: [meter('meter-b', 'Compteur B')]}
  ],
  responses: {INDEX: {id: 'response', status: 'DRAFT'}}
})
const savedEvent = (extra = {}) => ({
  targetId: 'point-a', type: 'REPLACEMENT', at: '2026-03-12', previousCompteurId: 'meter-a', nextCompteurId: 'meter-a2', previousIndex: '125.5', nextIndex: '0', reason: 'Ancien compteur défectueux', ...extra
})

// Real component and native fields; hook storage and effect execution are
// controlled to check callbacks without sending data to a server.
const interaction = ({initialContext = context(), initialDraft = {readings: [], meterEvents: []}, disabled = false, targetId = 'point-a', compteurId, confirmReassignment = true, saveResult} = {}) => {
  const state = []
  const loaded = new Map()
  const calls = []
  const saves = []
  const pendingSignals = []
  const confirmations = []
  let cursor = 0
  let identifier = 0
  const props = {
    context: initialContext, target: initialContext.targets.find(target => target.id === targetId), compteurId, draft: structuredClone(initialDraft), disabled,
    onPendingChange: pending => pendingSignals.push(pending),
    onChange(draft) {
      calls.push(structuredClone(draft))
      props.draft = draft
    },
    onSaveMeterEvent(draft) {
      saves.push(structuredClone(draft))
      return saveResult ? saveResult(draft, props) : props.onChange(draft)
    }
  }
  const react = {
    ...React,
    useState(initial) {
      const index = cursor++
      if (!(index in state)) {
        state[index] = typeof initial === 'function' ? initial() : initial
      }

      return [state[index], value => {
        state[index] = typeof value === 'function' ? value(state[index]) : value
      }]
    },
    useId: () => `field-${identifier++}`,
    useRef(initial) {
      const index = cursor++
      state[index] ||= {current: initial}
      return state[index]
    },
    useEffect(effect, dependencies) {
      const index = cursor++
      if (!state[index] || !dependencies?.every((dependency, position) => Object.is(dependency, state[index].dependencies[position]))) {
        state[index]?.cleanup?.()
        state[index] = {dependencies, cleanup: effect()}
      }
    }
  }
  const loadComponent = name => {
    if (loaded.has(name)) {
      return loaded.get(name)
    }

    const filename = new URL(`${name}.js`, import.meta.url)
    const {code} = transformSync(readFileSync(filename, 'utf8'), {filename: filename.pathname, jsc: {parser: {syntax: 'ecmascript', jsx: true}, transform: {react: {runtime: 'automatic'}}, target: 'es2022'}, module: {type: 'commonjs'}})
    const compiledModule = {exports: {}}
    const componentRequire = specifier => {
      if (specifier === 'react') {
        return react
      }

      if (specifier.endsWith('.module.css')) {
        return {__esModule: true, default: new Proxy({}, {get: (_, property) => property})}
      }

      if (specifier === '@/lib/collection-campaigns.js') {
        return {
          ...campaignHelpers, confirmCampaignAction(message) {
            confirmations.push(message)
            return confirmReassignment
          }
        }
      }

      if (specifier === '@/lib/campaign-calendar.js') {
        return campaignCalendar
      }

      if (specifier === '@/lib/campaign-response-readings.js') {
        return campaignReadings
      }

      if (specifier === '@/lib/campaign-meter-event-validation.js') {
        return campaignMeterValidation
      }

      if (specifier.startsWith('@/components/campaigns/')) {
        return loadComponent(specifier.split('/').at(-1).replace('.js', ''))
      }

      return require(specifier)
    }

    runInNewContext('(function(require, module, exports) {' + code + '\n})', {structuredClone})(componentRequire, compiledModule, compiledModule.exports)
    loaded.set(name, compiledModule.exports)
    return compiledModule.exports
  }

  const renderComponent = loadComponent('campaign-meter-events').default
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

    return React.createElement(node.type, {...node.props, key: node.key}, expand(node.props.children))
  }

  return {
    calls,
    saves,
    pendingSignals,
    confirmations,
    props,
    unmount() {
      for (const entry of state) {
        entry?.cleanup?.()
      }
    },
    tree() {
      cursor = 0
      identifier = 0
      return expand(renderComponent(props))
    },
    html() {
      return renderToStaticMarkup(this.tree())
    },
    button(label, {scope} = {}) {
      const tree = this.tree()
      const parent = scope === 'editor' ? nodes(tree).find(node => node.props?.className?.split(' ').includes('expanded')) : tree
      return nodes(parent).find(node => node.type === 'button' && matches(content(node), label))
    },
    click(label, options) {
      const button = this.button(label, options)
      if (!button) {
        throw new Error(`Bouton absent : ${label}`)
      }

      const result = button.props.onClick()
      this.tree()
      return result
    },
    card(at) {
      return nodes(this.tree()).find(node => node.type === 'li' && node.props['aria-label']?.endsWith(campaignHelpers.campaignDate(at)))
    },
    visualOrder() {
      return nodes(this.tree()).filter(node => node.type === 'li').map(node => node.props.className === 'editingCard' ? 'editor' : node.props['aria-label'])
    },
    cardButton(at, label) {
      return nodes(this.card(at)).find(node => node.type === 'button' && matches(content(node), label))
    },
    clickCard(at, label) {
      const button = this.cardButton(at, label)
      if (!button) {
        throw new Error(`Bouton absent sur le changement du ${at} : ${label}`)
      }

      const result = button.props.onClick()
      this.tree()
      return result
    },
    field(label, {stage} = {}) {
      const rendered = this.tree()
      const tree = stage ? nodes(rendered).find(node => node.props?.className?.split(' ').includes(stage)) : rendered
      const fields = nodes(tree).filter(node => node.type === 'label' && matches(content(node).replace(/ \*$/, ''), label)).map(labelNode => labelNode.props.htmlFor
        ? nodes(tree).find(node => node.props.id === labelNode.props.htmlFor)
        : nodes(labelNode).find(node => ['input', 'select', 'textarea'].includes(node.type)))
      if (fields.length === 0) {
        throw new Error(`Champ absent : ${label}`)
      }

      return fields.find(field => !field.props.disabled) || fields[0]
    },
    change(label, value) {
      this.field(label).props.onChange({target: {value}})
    },
    check(label, checked = true) {
      this.field(label).props.onChange({target: {checked}})
    }
  }
}

const begin = (flow, type = 'REPLACEMENT') => {
  flow.click(/^Déclarer un(?: autre)? changement de compteur$/)
  flow.click(type === 'RESET' ? /Compteur remis à zéro/ : /Compteur remplacé/)
  flow.change('Date du changement', '2026-03-12')
  flow.change(/Compteur avant|Ancien compteur|Compteur concerné/, 'meter-a')
  if (type === 'REPLACEMENT') {
    flow.change('Compteur déjà enregistré', 'meter-a2')
  }
}

const fill = (flow, {previousIndex = '125,5', nextIndex = '0', reason = 'Ancien compteur défectueux'} = {}) => {
  flow.change(/Dernier index/, previousIndex)
  flow.change(/Premier index/, nextIndex)
  flow.change(/Précisions|Raison|Motif/, reason)
}

const addLabel = 'Enregistrer le changement'
const removeFirst = flow => flow.click('Supprimer')

const deferred = () => {
  const result = {}
  result.promise = new Promise((resolve, reject) => {
    result.resolve = resolve
    result.reject = reject
  })
  return result
}

test('le bouton situé sous un point ouvre deux choix et un formulaire contextualisé, sans accordéons imbriqués', t => {
  const flow = interaction()
  t.truthy(flow.button('Déclarer un changement de compteur'))
  t.falsy(flow.button(/Compteur remplacé/))
  flow.click('Déclarer un changement de compteur')
  t.truthy(flow.button(/Compteur remplacé/))
  t.truthy(flow.button(/Compteur remis à zéro/))
  t.notRegex(flow.html(), /<details|<summary/)
  t.deepEqual(flow.calls, [])
  flow.click(/Compteur remplacé/)
  t.is(nodes(flow.tree()).filter(node => node.type === 'input' && node.props.type === 'date').length, 1)
  t.regex(flow.html(), /Avant/)
  t.regex(flow.html(), /Après/)
  t.notRegex(flow.html(), /Point concerné|Choisir un point|Ajouter au brouillon|Le changement sera ajouté|Vous pourrez le retirer|Renseigner le remplacement|Renseigner la remise à zéro|Qu’est-il arrivé|choisissez la situation/)
  t.deepEqual(nodes(flow.tree()).filter(node => /^h[1-6]$/.test(node.type)).map(node => content(node)), ['Changement de compteur', 'Avant', 'Après'])
  const phases = nodes(flow.tree()).find(node => node.props?.className === 'beforeAfter')
  t.deepEqual(React.Children.toArray(phases.props.children).map(child => child.props.className), ['stage before', 'arrow fr-icon-arrow-right-line', 'stage after'])
  t.deepEqual(flow.calls, [])
})

test('un remplacement ajoute les deux vrais compteurs et conserve les autres données du brouillon', t => {
  const initialDraft = {
    comment: 'Note conservée', readings: [{targetId: 'point-a', value: '200'}], meterEvents: [savedEvent({
      targetId: 'point-b', type: 'RESET', previousCompteurId: 'meter-b', nextCompteurId: 'meter-b', at: '2026-02-01'
    })]
  }
  const flow = interaction({initialDraft})
  begin(flow)
  fill(flow)
  flow.click(addLabel)
  t.is(flow.calls.length, 1)
  t.deepEqual(flow.calls[0], {...initialDraft, meterEvents: [...initialDraft.meterEvents, savedEvent()]})
  t.regex(flow.html(), /Ancien A/)
  t.regex(flow.html(), /Nouveau A/)
  t.regex(flow.html(), /12 mars 2026/)
})

for (const type of ['REPLACEMENT', 'RESET']) {
  test(`un déclarant sans droit de gestion peut ajouter un ${type} sur son point`, t => {
    const initialContext = context({editableTargetIds: ['point-a']})
    Object.assign(initialContext.permissions, {canManage: false, canRemind: false, canExport: false})
    const flow = interaction({initialContext})
    begin(flow, type)
    fill(flow)
    flow.click(addLabel)
    t.deepEqual(flow.calls[0].meterEvents, [savedEvent({type, nextCompteurId: type === 'RESET' ? 'meter-a' : 'meter-a2'})])
    t.false(flow.pendingSignals.at(-1))
    t.notRegex(flow.html(), /conservez votre brouillon|sans remplacement ni remise à zéro/)
    t.is(interaction({initialContext, targetId: 'point-b'}).html(), '')
  })
}

test('la remise à zéro conserve le même compteur sans préremplir un index zéro', t => {
  const flow = interaction()
  begin(flow, 'RESET')
  t.is(flow.field(/Premier index/).props.value, '')
  flow.click(addLabel)
  t.deepEqual(flow.calls, [])
  fill(flow, {previousIndex: '42', nextIndex: '7', reason: 'Remise à zéro après intervention'})
  flow.click(addLabel)
  t.is(flow.calls.length, 1)
  t.deepEqual(flow.calls[0].meterEvents, [savedEvent({
    type: 'RESET', previousIndex: '42', nextIndex: '7', nextCompteurId: 'meter-a', reason: 'Remise à zéro après intervention'
  })])
})

test('annuler un formulaire ne change rien au brouillon', t => {
  const flow = interaction()
  begin(flow)
  fill(flow)
  flow.click(/Annuler/)
  t.deepEqual(flow.calls, [])
  t.deepEqual(flow.props.draft, {readings: [], meterEvents: []})
  t.falsy(flow.button(addLabel))
})

test('modifier préremplit le deuxième événement sans toucher aux autres données ni afficher sa carte en double', t => {
  const first = savedEvent({
    type: 'RESET', nextCompteurId: 'meter-a', at: '2026-02-12', reason: 'Première intervention'
  })
  const second = savedEvent({type: 'RESET', nextCompteurId: 'meter-a', reason: 'Deuxième intervention'})
  const other = savedEvent({targetId: 'point-b', reason: 'Autre point'})
  const initialDraft = {
    comment: 'Commentaire conservé', readings: [{
      targetId: 'point-b', compteurId: 'meter-b', readingDate: '2026-06-01', value: '25'
    }], meterEvents: [first, second, other]
  }
  const flow = interaction({initialDraft})
  const card = nodes(flow.tree()).find(node => node.type === 'li' && content(node).includes('Deuxième intervention'))
  const modifier = nodes(card).find(node => node.type === 'button' && content(node) === 'Modifier')
  modifier.props.onClick()
  t.is(flow.field('Date du changement').props.value, second.at)
  t.is(flow.field(/Dernier index/).props.value, second.previousIndex)
  t.is(flow.field(/Premier index/).props.value, second.nextIndex)
  t.is(flow.field('Motif du changement').props.value, second.reason)
  t.is(flow.field('Compteur concerné').props.value, second.previousCompteurId)
  t.is(nodes(flow.tree()).filter(node => node.type === 'li').length, 2)
  t.is(nodes(flow.tree()).filter(node => node.type === 'li' && node.props.className === 'saved').length, 1)
  t.regex(flow.html(), /Modifier/)
  t.truthy(flow.button('Supprimer'))
  t.deepEqual(flow.calls, [])
  flow.change(/Dernier index/, '130,1234')
  flow.change('Motif du changement', 'Index rectifié')
  flow.click(addLabel)
  t.is(flow.saves.length, 1)
  t.deepEqual(flow.saves[0], {
    ...initialDraft, meterEvents: [first, {
      ...second, previousIndex: '130.1234', reason: 'Index rectifié', previousEvent: {at: second.at, previousCompteurId: second.previousCompteurId}
    }, other]
  })
  t.is(flow.props.draft.meterEvents.length, 3)
  t.falsy(flow.button('Supprimer', {scope: 'editor'}))
  t.truthy(flow.cardButton(second.at, 'Supprimer'))
})

test('annuler une modification locale restitue la carte sans écrire ni perdre les valeurs', t => {
  const initialDraft = {readings: [], meterEvents: [savedEvent({previousIndex: null, nextIndex: '0'})]}
  const flow = interaction({initialDraft})
  flow.click('Modifier')
  t.true(flow.field('Index avant inconnu').props.checked)
  t.is(flow.field(/Premier index/).props.value, '0')
  flow.change('Motif du changement', 'Modification abandonnée')
  flow.click('Annuler')
  t.deepEqual(flow.saves, [])
  t.deepEqual(flow.calls, [])
  t.deepEqual(flow.props.draft, initialDraft)
  t.truthy(flow.button('Modifier'))
  t.falsy(flow.button('Supprimer', {scope: 'editor'}))
  t.truthy(flow.cardButton(initialDraft.meterEvents[0].at, 'Supprimer'))
})

for (const position of [0, 1]) {
  test(`le formulaire remplace la carte à sa position ${position + 1}, puis la restitue sans déplacer les autres`, t => {
    const events = ['2026-02-12', '2026-03-12', '2026-05-12'].map((at, index) => savedEvent({
      type: 'RESET', nextCompteurId: 'meter-a', at, reason: `Intervention ${index + 1}`
    }))
    const other = savedEvent({targetId: 'point-b', reason: 'Autre point'})
    const initialDraft = {readings: [], meterEvents: [events[0], other, ...events.slice(1)]}
    const flow = interaction({initialDraft})
    const originalOrder = flow.visualOrder()
    const editingOrder = originalOrder.map((label, index) => index === position ? 'editor' : label)
    flow.clickCard(events[position].at, 'Modifier')
    t.deepEqual(flow.visualOrder(), editingOrder)
    t.is(nodes(flow.tree()).filter(node => node.props.className === 'expanded').length, 1)
    t.falsy(flow.card(events[position].at))
    flow.change('Motif du changement', 'Description corrigée')
    t.deepEqual(flow.visualOrder(), editingOrder)
    flow.click(addLabel)
    t.deepEqual(flow.visualOrder(), originalOrder)
    t.deepEqual(flow.props.draft.meterEvents.map(event => [event.targetId, event.at]), initialDraft.meterEvents.map(event => [event.targetId, event.at]))
    t.is(flow.props.draft.meterEvents.find(event => event.targetId === 'point-a' && event.at === events[position].at).reason, 'Description corrigée')
    t.deepEqual(flow.props.draft.meterEvents.find(event => event.targetId === 'point-b'), other)
  })

  test(`la sauvegarde lente puis refusée garde l’éditeur à sa position ${position + 1}, même si sa date change`, async t => {
    const completion = deferred()
    const events = ['2026-02-12', '2026-03-12', '2026-05-12'].map(at => savedEvent({type: 'RESET', nextCompteurId: 'meter-a', at}))
    const initialDraft = {readings: [], meterEvents: events}
    const flow = interaction({
      initialDraft,
      saveResult(draft, props) {
        props.onChange(draft)
        return completion.promise
      }
    })
    const originalOrder = flow.visualOrder()
    const editingOrder = originalOrder.map((label, index) => index === position ? 'editor' : label)
    flow.clickCard(events[position].at, 'Modifier')
    flow.change('Date du changement', position === 0 ? '2026-02-13' : '2026-03-13')
    flow.change(/Dernier index/, '130,1234')
    const saving = flow.click(addLabel)
    t.is(flow.saves.length, 1)
    t.deepEqual(flow.visualOrder(), editingOrder)
    t.true(flow.button('Enregistrement…').props.disabled)
    completion.reject(new Error('Enregistrement momentanément indisponible'))
    await saving
    t.deepEqual(flow.visualOrder(), editingOrder)
    t.is(flow.field(/Dernier index/).props.value, '130.1234')
    const editor = nodes(flow.tree()).find(node => node.props.className === 'editingCard')
    t.regex(content(editor), /Enregistrement momentanément indisponible/)
    t.false(nodes(flow.tree()).filter(node => node.type === 'li' && node.props.className !== 'editingCard').some(node => content(node).includes('Enregistrement momentanément indisponible')))
    flow.click('Annuler')
    t.deepEqual(flow.visualOrder(), originalOrder)
    t.deepEqual(flow.props.draft, initialDraft)
  })
}

for (const deletionFails of [false, true]) {
  test(`supprimer une carte précédente conserve l’éditeur à sa place relative et ses valeurs (${deletionFails ? 'échec' : 'succès'})`, async t => {
    const completion = deferred()
    const events = ['2026-02-12', '2026-03-12', '2026-05-12'].map(at => savedEvent({type: 'RESET', nextCompteurId: 'meter-a', at}))
    let attempts = 0
    const flow = interaction({
      initialDraft: {readings: [], meterEvents: events},
      saveResult(draft, props) {
        props.onChange(draft)
        return ++attempts === 1 ? completion.promise : Promise.resolve()
      }
    })
    const originalOrder = flow.visualOrder()
    flow.clickCard(events[1].at, 'Modifier')
    flow.change('Motif du changement', 'Modification locale à conserver')
    flow.change(/Dernier index/, '175,1234')
    const deleting = flow.clickCard(events[0].at, 'Supprimer')
    t.deepEqual(flow.visualOrder(), [originalOrder[0], 'editor', originalOrder[2]])
    if (deletionFails) {
      completion.reject(new Error('Suppression momentanément indisponible'))
    } else {
      completion.resolve()
    }

    await deleting
    t.deepEqual(flow.visualOrder(), [...(deletionFails ? [originalOrder[0]] : []), 'editor', originalOrder[2]])
    t.is(flow.field('Motif du changement').props.value, 'Modification locale à conserver')
    t.is(flow.field(/Dernier index/).props.value, '175.1234')
    await flow.click(addLabel)
    t.deepEqual(flow.visualOrder(), deletionFails ? originalOrder : originalOrder.slice(1))
    t.deepEqual(flow.props.draft.meterEvents.map(event => event.at), (deletionFails ? events : events.slice(1)).map(event => event.at))
    t.is(flow.props.draft.meterEvents.find(event => event.at === events[1].at).reason, 'Modification locale à conserver')
  })
}

test('modifier un nouveau compteur préremplit son identité et transmet son ancienne identité pour préserver les liens', t => {
  const nextMeter = {serialNumber: 'SN-INITIAL', identifier: 'Compteur du forage'}
  const {nextCompteurId, ...original} = savedEvent()
  original.nextMeter = nextMeter
  const initialContext = context()
  initialContext.targets[0].meters.push({...meter('pending-meter', 'SN-INITIAL'), pending: true, pendingEvent: {previousCompteurId: original.previousCompteurId, at: original.at}})
  const readings = [{
    targetId: 'point-a', compteurId: 'pending-meter', readingDate: '2026-06-01', value: '33.1234'
  }]
  const flow = interaction({initialContext, initialDraft: {readings, meterEvents: [original]}})
  flow.click('Modifier')
  t.true(flow.button('Nouveau compteur').props['aria-pressed'])
  t.is(flow.field('Numéro de série').props.value, nextMeter.serialNumber)
  t.is(flow.field('Nom ou repère du compteur').props.value, nextMeter.identifier)
  t.false(flow.button('Supprimer').props.disabled)
  flow.change('Numéro de série', 'SN-CORRIGE')
  flow.click(addLabel)
  t.deepEqual(flow.saves[0], {
    readings, meterEvents: [{...original, nextMeter: {...nextMeter, serialNumber: 'SN-CORRIGE'}, previousEvent: {at: original.at, previousCompteurId: original.previousCompteurId, nextMeter}}]
  })
  t.is(flow.props.draft.meterEvents.length, 1)
})

test('enregistrer attend la sauvegarde réelle et bloque les doubles clics avant de fermer le formulaire', async t => {
  const completion = deferred()
  const flow = interaction({
    saveResult(draft, props) {
      props.onChange(draft)
      return completion.promise
    }
  })
  begin(flow)
  fill(flow)
  const save = flow.button(addLabel).props.onClick
  const saving = save()
  t.is(flow.saves.length, 1)
  t.true(flow.button('Enregistrement…').props.disabled)
  t.true(flow.button('Annuler').props.disabled)
  t.is(flow.field(/Dernier index/).props.value, '125.5')
  t.deepEqual(flow.visualOrder(), [])
  t.is(nodes(flow.tree()).filter(node => node.props.className === 'expanded').length, 1)
  t.regex(content(nodes(flow.tree()).find(node => node.type === 'h3')), /^Changement de compteur$/)
  t.is(flow.pendingSignals.at(-1), true)
  save()
  t.is(flow.saves.length, 1)
  completion.resolve()
  await saving
  t.falsy(flow.button('Enregistrement…'))
  t.falsy(flow.button(addLabel))
  t.truthy(flow.button('Modifier'))
  t.is(flow.visualOrder().length, 1)
  t.is(flow.pendingSignals.at(-1), false)
  t.is(flow.saves.length, 1)
})

test('une sauvegarde refusée conserve la saisie et permet un nouvel essai sans événement en double', async t => {
  let attempts = 0
  const flow = interaction({
    saveResult(draft, props) {
      props.onChange(draft)
      return ++attempts === 1 ? Promise.reject(new Error('Réseau indisponible')) : Promise.resolve()
    }
  })
  begin(flow)
  fill(flow)
  await flow.click(addLabel)
  t.regex(flow.html(), /Réseau indisponible/)
  t.deepEqual(flow.visualOrder(), [])
  t.is(nodes(flow.tree()).filter(node => node.props.className === 'expanded').length, 1)
  t.is(flow.field(/Dernier index/).props.value, '125.5')
  t.is(flow.field('Motif du changement').props.value, 'Ancien compteur défectueux')
  t.is(flow.pendingSignals.at(-1), true)
  await flow.click(addLabel)
  t.is(flow.saves.length, 2)
  t.deepEqual(flow.saves[0], flow.saves[1])
  t.is(flow.props.draft.meterEvents.length, 1)
  t.falsy(flow.button(addLabel))
  t.notRegex(flow.html(), /Réseau indisponible/)
})

test('annuler après un échec restaure seulement l’événement modifié et préserve les autres saisies récentes', async t => {
  const original = savedEvent()
  const other = savedEvent({targetId: 'point-b', at: '2026-02-12', reason: 'Autre point'})
  const initialDraft = {comment: 'Initial', readings: [], meterEvents: [original, other]}
  const flow = interaction({
    initialDraft,
    saveResult(draft, props) {
      props.onChange(draft)
      return Promise.reject(new Error('Réseau indisponible'))
    }
  })
  flow.click('Modifier')
  flow.change('Date du changement', '2026-04-12')
  flow.change('Motif du changement', 'Modification non enregistrée')
  await flow.click(addLabel)
  t.regex(flow.html(), /Réseau indisponible/)
  const additional = savedEvent({targetId: 'point-b', at: '2026-05-12', reason: 'Nouveau changement ailleurs'})
  const readings = [{
    targetId: 'point-b', compteurId: 'meter-b', readingDate: '2026-06-01', value: '26'
  }]
  flow.props.draft = {
    ...flow.props.draft, readings, comment: 'Commentaire récent', meterEvents: [...flow.props.draft.meterEvents, additional]
  }
  flow.click('Annuler')
  t.deepEqual(flow.props.draft, {comment: 'Commentaire récent', readings, meterEvents: [original, other, additional]})
  t.is(flow.saves.length, 1)
  t.is(flow.calls.length, 2)
  t.falsy(flow.button('Supprimer', {scope: 'editor'}))
  t.falsy(flow.button(addLabel))
  t.truthy(flow.button('Modifier'))
})

test('une erreur synchrone de sauvegarde libère aussi le formulaire pour réessayer ou annuler', t => {
  const flow = interaction({
    saveResult() {
      throw new Error('Enregistrement indisponible')
    }
  })
  begin(flow)
  fill(flow)
  flow.click(addLabel)
  t.regex(flow.html(), /Enregistrement indisponible/)
  t.false(flow.button(addLabel).props.disabled)
  t.false(flow.button('Annuler').props.disabled)
  t.is(flow.field(/Dernier index/).props.value, '125.5')
  flow.click('Annuler')
  t.falsy(flow.button(addLabel))
  t.deepEqual(flow.props.draft.meterEvents, [])
})

for (const previousCompteurId of [null, 'meter-a']) {
  test(`annuler une suppression échouée restaure les relevés sans écraser leur valeur récente (${previousCompteurId ?? 'sans inventaire'})`, t => {
    const initialContext = context()
    initialContext.targets[0] = {
      ...initialContext.targets[0], meterlessInitial: previousCompteurId === null, meterlessEndDate: null,
      meters: [...(previousCompteurId ? [meter(previousCompteurId, 'Ancien compteur')] : []), {...meter('pending-meter', 'SN-INITIAL'), pending: true, pendingEvent: {previousCompteurId, at: '2026-03-12'}}]
    }
    const {nextCompteurId, ...original} = savedEvent({previousCompteurId})
    original.nextMeter = {serialNumber: 'SN-INITIAL'}
    const initialReading = {
      targetId: 'point-a', compteurId: previousCompteurId, readingDate: '2025-11-01', value: '100'
    }
    const following = {
      targetId: 'point-a', compteurId: 'pending-meter', readingDate: '2026-06-01', value: '210', sourceChunkValueId: 'source'
    }
    const initialDraft = {readings: [initialReading, following], meterEvents: [original]}
    const flow = interaction({
      initialContext,
      initialDraft,
      saveResult(draft, props) {
        props.onChange(draft)
        throw new Error('Enregistrement indisponible')
      }
    })
    flow.click('Modifier')
    flow.click('Supprimer', {scope: 'editor'})
    t.regex(flow.html(), /Enregistrement indisponible/)
    t.deepEqual(flow.saves[0], {readings: [initialReading, {...following, compteurId: previousCompteurId}], meterEvents: []})
    flow.props.draft = {...flow.props.draft, comment: 'Commentaire récent', readings: [initialReading, {...following, compteurId: previousCompteurId, value: '211'}]}
    flow.click('Annuler')
    t.deepEqual(flow.props.draft, {comment: 'Commentaire récent', readings: [initialReading, {...following, value: '211'}], meterEvents: [original]})
    t.is(flow.saves.length, 1)
    t.is(flow.calls.length, 2)
    t.falsy(flow.button('Supprimer', {scope: 'editor'}))
    t.truthy(flow.button('Modifier'))
  })
}

test('le libellé distingue le premier changement des suivants et revient après la dernière suppression', async t => {
  const flow = interaction()
  t.notRegex(flow.button('Déclarer un changement de compteur').props.className, /fr-icon-add-line/)
  for (const at of ['2026-03-12', '2026-04-12']) {
    begin(flow, 'RESET')
    flow.change('Date du changement', at)
    fill(flow)
    flow.click(addLabel)
    t.regex(flow.button('Déclarer un autre changement de compteur').props.className, /fr-icon-add-line/)
    t.falsy(flow.button('Déclarer un changement de compteur'))
  }

  t.deepEqual(flow.props.draft.meterEvents.map(event => event.at), ['2026-03-12', '2026-04-12'])
  await removeFirst(flow)
  t.truthy(flow.button('Déclarer un autre changement de compteur'))
  await removeFirst(flow)
  t.deepEqual(flow.props.draft.meterEvents, [])
  t.notRegex(flow.button('Déclarer un changement de compteur').props.className, /fr-icon-add-line/)
  t.falsy(flow.button('Déclarer un autre changement de compteur'))
})

test('le formulaire du changement suivant est un panneau séparé des cartes déjà enregistrées', t => {
  const initialDraft = {readings: [], meterEvents: [savedEvent()]}
  const flow = interaction({initialDraft})
  flow.click('Déclarer un autre changement de compteur')
  const tree = flow.tree()
  const children = React.Children.toArray(tree.props.children)
  const savedList = children.find(node => node.props.className === 'savedList')
  const panel = children.find(node => node.props.className === 'expanded')
  t.is(tree.type, 'section')
  t.is(tree.props.className, 'section')
  t.truthy(savedList)
  t.truthy(panel.props.id.endsWith('-panel'))
  t.is(nodes(savedList).filter(node => node.type === 'li').length, 1)
  t.is(nodes(savedList).find(node => node.type === 'li').props['aria-label'], 'Compteur remplacé du 12 mars 2026')
  t.false(nodes(panel).some(node => node.type === 'li' || node.props.className === 'saved'))
  t.is(content(nodes(panel).find(node => node.type === 'h3')), 'Autre changement de compteur')
  t.deepEqual(flow.props.draft, initialDraft)
  t.deepEqual(flow.calls, [])
  flow.click(/Annuler/)
  t.truthy(flow.button('Déclarer un autre changement de compteur'))
  t.false(nodes(flow.tree()).some(node => node.props.className === 'expanded'))
  t.deepEqual(flow.props.draft, initialDraft)
})

test('un formulaire incomplet explique les champs à compléter sans écrire', t => {
  const flow = interaction()
  begin(flow)
  flow.click(addLabel)
  t.deepEqual(flow.calls, [])
  t.regex(flow.html(), /aria-invalid="true"/)
  fill(flow, {reason: '   '})
  flow.click(addLabel)
  t.deepEqual(flow.calls, [])
  t.regex(flow.html(), /aria-invalid="true"/)
})

for (const invalidIndex of ['-1', '1e3', '1.23456', '10000000000000000', 'NaN']) {
  test(`un index invalide (${invalidIndex}) ne peut pas être ajouté au brouillon`, t => {
    const flow = interaction()
    begin(flow)
    fill(flow, {previousIndex: invalidIndex})
    flow.click(addLabel)
    t.deepEqual(flow.calls, [])
    t.regex(flow.html(), /aria-invalid="true"/)
  })
}

test('une date civile inexistante est refusée sans écrire', t => {
  const flow = interaction()
  begin(flow)
  fill(flow)
  flow.change('Date du changement', '2026-02-30')
  flow.click(addLabel)
  t.deepEqual(flow.calls, [])
  t.regex(flow.html(), /aria-invalid="true"/)
})

for (const invalidDate of ['2025-10-31', '2026-11-02', '2026-02-30']) {
  test(`la date ${invalidDate} est signalée dès sa saisie sans cliquer sur enregistrer`, t => {
    const flow = interaction()
    begin(flow, 'RESET')
    fill(flow)
    flow.change('Date du changement', invalidDate)
    const field = flow.field('Date du changement')
    t.true(field.props['aria-invalid'])
    t.truthy(field.props['aria-describedby'])
    const error = nodes(flow.tree()).find(node => node.props.id === field.props['aria-describedby'])
    t.truthy(error)
    t.true(content(error).length > 15)
    t.deepEqual(flow.saves, [])
    t.deepEqual(flow.calls, [])
    flow.change('Date du changement', '2026-03-12')
    t.falsy(flow.field('Date du changement').props['aria-invalid'])
    t.deepEqual(flow.saves, [])
  })
}

test('une date devenue invalide reste signalée sur sa carte fermée et peut être corrigée', t => {
  const first = savedEvent({type: 'RESET', nextCompteurId: 'meter-a', at: '2026-02-12'})
  const invalid = savedEvent({type: 'RESET', nextCompteurId: 'meter-a', at: '2026-03-12'})
  const flow = interaction({initialDraft: {readings: [], meterEvents: [first, invalid]}})
  t.false(nodes(flow.card(invalid.at)).some(node => node.props.role === 'alert'))
  flow.props.context.campaign.indexDates = ['2025-11-01', '2026-03-01']
  const card = flow.card(invalid.at)
  t.true(nodes(card).some(node => node.props.role === 'alert'))
  t.regex(content(card), /2025|2026/)
  t.false(nodes(flow.card(first.at)).some(node => node.props.role === 'alert'))
  t.false(Boolean(flow.cardButton(invalid.at, 'Modifier').props.disabled))
  t.false(Boolean(flow.cardButton(invalid.at, 'Supprimer').props.disabled))
  t.falsy(flow.button(addLabel))
  t.deepEqual(flow.saves, [])
  flow.clickCard(invalid.at, 'Modifier')
  t.is(flow.field('Date du changement').props.value, invalid.at)
  t.true(flow.field('Date du changement').props['aria-invalid'])
  flow.change('Date du changement', '2026-02-20')
  t.falsy(flow.field('Date du changement').props['aria-invalid'])
})

test('les erreurs serveur sont rattachées au bon changement fermé, pas aux autres dates ou points', t => {
  const first = savedEvent({type: 'RESET', nextCompteurId: 'meter-a', at: '2026-02-12'})
  const second = savedEvent({type: 'RESET', nextCompteurId: 'meter-a', at: '2026-03-12'})
  const flow = interaction({initialDraft: {readings: [], meterEvents: [first, second]}})
  flow.props.issues = [
    {
      targetId: 'point-a', compteurId: 'meter-a', at: second.at, code: 'INVALID_METER_EVENT_DATE', message: 'La date du deuxième changement est incompatible.'
    },
    {
      targetId: 'point-b', compteurId: 'meter-b', at: first.at, code: 'INVALID_METER_EVENT_DATE', message: 'Erreur d’un autre point.'
    },
    {
      targetId: 'point-a', compteurId: 'meter-elsewhere', at: first.at, code: 'INVALID_METER_EVENT_DATE', message: 'Erreur d’un autre compteur.'
    }
  ]
  t.regex(content(flow.card(second.at)), /La date du deuxième changement est incompatible/)
  t.true(nodes(flow.card(second.at)).some(node => node.props.role === 'alert'))
  t.not(flow.card(second.at).props.className, flow.card(first.at).props.className)
  t.false(nodes(flow.card(first.at)).some(node => node.props.role === 'alert'))
  t.notRegex(flow.html(), /Erreur d’un autre point|Erreur d’un autre compteur/)
  t.false(Boolean(flow.cardButton(second.at, 'Modifier').props.disabled))
  t.deepEqual(flow.saves, [])
  flow.props.issues = []
  t.false(nodes(flow.card(second.at)).some(node => node.props.role === 'alert'))
})

test('chaque carte permet de supprimer uniquement le changement choisi sans ouvrir de formulaire', async t => {
  const first = savedEvent({
    type: 'RESET', nextCompteurId: 'meter-a', at: '2026-02-12', reason: 'Premier changement'
  })
  const second = savedEvent({
    type: 'RESET', nextCompteurId: 'meter-a', at: '2026-03-12', reason: 'Deuxième changement'
  })
  const other = savedEvent({targetId: 'point-b'})
  const readings = [{
    targetId: 'point-b', compteurId: 'meter-b', readingDate: '2026-06-01', value: '25'
  }]
  const initialDraft = {comment: 'Conserver', readings, meterEvents: [first, second, other]}
  const flow = interaction({initialDraft})
  for (const event of [first, second]) {
    const button = flow.cardButton(event.at, 'Supprimer')
    t.false(Boolean(button.props.disabled))
    t.is(button.props['aria-label'], `Supprimer le changement du ${campaignHelpers.campaignDate(event.at)}`)
  }

  await flow.clickCard(second.at, 'Supprimer')
  t.deepEqual(flow.saves, [{...initialDraft, meterEvents: [first, other]}])
  t.truthy(flow.card(first.at))
  t.falsy(flow.card(second.at))
  t.falsy(flow.button(addLabel))
  t.falsy(flow.button('Annuler'))
  t.false(flow.pendingSignals.includes(true))
  t.deepEqual(flow.confirmations, [])
})

test('supprimer un autre résumé conserve le formulaire ouvert et sa saisie même après annulation', async t => {
  const completion = deferred()
  const first = savedEvent({type: 'RESET', nextCompteurId: 'meter-a', at: '2026-02-12'})
  const second = savedEvent({type: 'RESET', nextCompteurId: 'meter-a', at: '2026-03-12'})
  const initialDraft = {readings: [], meterEvents: [first, second]}
  const flow = interaction({
    initialDraft,
    saveResult(draft, props) {
      props.onChange(draft)
      return completion.promise
    }
  })
  flow.clickCard(first.at, 'Modifier')
  flow.change('Motif du changement', 'Saisie locale à conserver')
  flow.change(/Dernier index/, '175,1234')
  const deleting = flow.clickCard(second.at, 'Supprimer')
  t.is(flow.saves.length, 1)
  t.deepEqual(flow.saves[0], {...initialDraft, meterEvents: [first]})
  t.is(flow.field('Motif du changement').props.value, 'Saisie locale à conserver')
  t.is(flow.field(/Dernier index/).props.value, '175.1234')
  completion.resolve()
  await deleting
  t.is(flow.field('Motif du changement').props.value, 'Saisie locale à conserver')
  t.is(flow.field(/Dernier index/).props.value, '175.1234')
  t.is(flow.pendingSignals.at(-1), true)
  flow.click('Annuler')
  t.deepEqual(flow.props.draft, {...initialDraft, meterEvents: [first]})
  t.is(flow.saves.length, 1)
  t.falsy(flow.card(second.at))
})

test('un échec de suppression reste sur le résumé ciblé sans fermer un autre formulaire ni perdre de données', async t => {
  let attempts = 0
  const first = savedEvent({type: 'RESET', nextCompteurId: 'meter-a', at: '2026-02-12'})
  const second = savedEvent({type: 'RESET', nextCompteurId: 'meter-a', at: '2026-03-12'})
  const initialDraft = {readings: [], meterEvents: [first, second]}
  const flow = interaction({
    initialDraft,
    saveResult(draft, props) {
      props.onChange(draft)
      return ++attempts === 1 ? Promise.reject(new Error('Le service de suppression est indisponible.')) : Promise.resolve()
    }
  })
  flow.clickCard(first.at, 'Modifier')
  flow.change('Motif du changement', 'Saisie ouverte conservée')
  await flow.clickCard(second.at, 'Supprimer')
  t.is(flow.field('Motif du changement').props.value, 'Saisie ouverte conservée')
  t.deepEqual(flow.props.draft, initialDraft)
  t.regex(content(flow.card(second.at)), /Le service de suppression est indisponible/)
  t.true(nodes(flow.card(second.at)).some(node => node.props.role === 'alert'))
  t.is(flow.saves.length, 1)
  t.is(flow.pendingSignals.at(-1), true)
  t.deepEqual(flow.confirmations, [])
  await flow.clickCard(second.at, 'Supprimer')
  t.is(flow.field('Motif du changement').props.value, 'Saisie ouverte conservée')
  t.falsy(flow.card(second.at))
  t.notRegex(flow.html(), /Le service de suppression est indisponible/)
  t.is(flow.saves.length, 2)
  t.deepEqual(flow.props.draft, {...initialDraft, meterEvents: [first]})
})

test('modifier puis enregistrer un résumé efface son ancienne erreur de suppression', async t => {
  let attempts = 0
  const first = savedEvent({type: 'RESET', nextCompteurId: 'meter-a', at: '2026-02-12'})
  const second = savedEvent({type: 'RESET', nextCompteurId: 'meter-a', at: '2026-03-12'})
  const initialDraft = {readings: [], meterEvents: [first, second]}
  const flow = interaction({
    initialDraft,
    saveResult(draft, props) {
      props.onChange(draft)
      return ++attempts === 1 ? Promise.reject(new Error('La suppression a échoué.')) : Promise.resolve()
    }
  })
  await flow.clickCard(second.at, 'Supprimer')
  t.regex(content(flow.card(second.at)), /La suppression a échoué/)
  t.notRegex(content(flow.card(first.at)), /La suppression a échoué/)
  t.falsy(flow.button(addLabel))
  flow.clickCard(second.at, 'Modifier')
  flow.change('Motif du changement', 'Description corrigée')
  await flow.click(addLabel)
  t.is(flow.props.draft.meterEvents.length, 2)
  t.regex(content(flow.card(second.at)), /Description corrigée/)
  t.notRegex(flow.html(), /La suppression a échoué/)
  t.is(flow.saves.length, 2)
})

test('un remplacement ne peut pas réutiliser le même compteur ni celui d’un autre point', t => {
  const flow = interaction()
  begin(flow)
  fill(flow)
  const options = nodes(flow.field('Compteur déjà enregistré')).filter(node => node.type === 'option')
  t.false(options.some(node => node.props.value === 'meter-b'))
  for (const invalidMeter of ['meter-a', 'meter-b', 'unknown']) {
    flow.change('Compteur déjà enregistré', invalidMeter)
    flow.click(addLabel)
    t.deepEqual(flow.calls, [])
    t.regex(flow.html(), /aria-invalid="true"/)
  }
})

test('un mandat partiel ne peut pas ouvrir un éditeur sur un autre point', t => {
  const flow = interaction({initialContext: context({editableTargetIds: ['point-a']}), targetId: 'point-b'})
  t.is(flow.html(), '')
  t.deepEqual(flow.calls, [])
})

test('en lecture seule les changements restent lisibles sans aucune commande de mutation', t => {
  const flow = interaction({initialContext: context({canEdit: false, editableTargetIds: []}), initialDraft: {readings: [], meterEvents: [savedEvent()]}, disabled: true})
  t.regex(flow.html(), /Ancien A/)
  t.regex(flow.html(), /Nouveau A/)
  t.regex(flow.html(), /Ancien compteur défectueux/)
  t.falsy(flow.button(/Compteur remplacé/))
  t.falsy(flow.button(/Compteur remis à zéro/))
  t.falsy(flow.button(/Modifier|Supprimer/))
  t.deepEqual(flow.calls, [])
})

test('retirer un changement autorisé conserve les relevés et les changements des autres points', async t => {
  const other = savedEvent({
    targetId: 'point-b', type: 'RESET', previousCompteurId: 'meter-b', nextCompteurId: 'meter-b'
  })
  const initialDraft = {comment: 'Note conservée', readings: [{targetId: 'point-b', value: '25'}], meterEvents: [savedEvent(), other]}
  const flow = interaction({initialContext: context({editableTargetIds: ['point-a']}), initialDraft})
  t.is(nodes(flow.tree()).filter(node => node.type === 'button' && content(node) === 'Modifier').length, 1)
  t.truthy(flow.cardButton('2026-03-12', 'Supprimer'))
  await removeFirst(flow)
  t.deepEqual(flow.calls, [{...initialDraft, meterEvents: [other]}])
  t.falsy(flow.button(/Modifier|Supprimer/))
})

for (const type of ['REPLACEMENT', 'RESET']) {
  test(`sans inventaire le déclarant renseigne un ${type} sans créer d’ancien compteur fictif`, t => {
    const initialContext = context()
    initialContext.targets = [{id: 'point-a', pointPrelevement: {name: 'Forage sans inventaire'}, meters: []}]
    const flow = interaction({initialContext})
    flow.click('Déclarer un changement de compteur')
    flow.click(type === 'RESET' ? /Compteur remis à zéro/ : /Compteur remplacé/)
    t.regex(flow.html(), /Compteur non identifié/)
    t.notRegex(flow.html(), /Ce changement n’est pas encore ajouté|Les champs marqués|[Aa]ucune fiche créée/)
    const previousMeter = flow.field(type === 'RESET' ? 'Compteur concerné' : 'Ancien compteur')
    t.is(previousMeter.type, 'input')
    t.true(previousMeter.props.disabled)
    t.is(previousMeter.props.value, 'Compteur non identifié')
    flow.change('Date du changement', '2026-03-12')
    if (type === 'REPLACEMENT') {
      flow.change('Numéro de série', ' SN-2026 ')
    }

    fill(flow)
    t.deepEqual(flow.calls, [])
    flow.click(addLabel)
    const {nextCompteurId, ...expected} = savedEvent({type, previousCompteurId: null})
    t.deepEqual(flow.calls[0].meterEvents, [{...expected, ...(type === 'RESET' ? {nextCompteurId: null} : {nextMeter: {serialNumber: 'SN-2026'}})}])
    t.regex(flow.html(), /Avant · Compteur non identifié/)
    t.notRegex(flow.html(), /Ce changement n’est pas encore ajouté|Les champs marqués|[Aa]ucune fiche créée/)
    t.notRegex(flow.html(), /fiche du nouveau compteur|Le changement sera ajouté|Vous pourrez le retirer/)
    t.false(flow.pendingSignals.at(-1))
    t.notRegex(flow.html(), /Compteur non référencé|(?:Le|Ce) nouveau compteur sera créé|conservez votre brouillon|sans remplacement ni remise à zéro/)
  })
}

test('sans inventaire les droits et le mandat continuent de bloquer l’ajout', t => {
  const initialContext = context({editableTargetIds: []})
  initialContext.targets[0].meters = []
  t.is(interaction({initialContext}).html(), '')
  initialContext.editableTargetIds = ['point-a']
  t.is(interaction({initialContext, disabled: true}).html(), '')
})

test('déclarer puis retirer une remise à zéro conserve les relevés sans imposer de confirmation', async t => {
  const initialContext = context()
  initialContext.targets[0].meters = []
  const initialReading = {
    targetId: 'point-a', compteurId: null, readingDate: '2025-11-01', value: '100'
  }
  const otherReading = {...initialReading, targetId: 'point-b'}
  const flow = interaction({initialContext, initialDraft: {readings: [initialReading, otherReading], meterEvents: []}})
  flow.click('Déclarer un changement de compteur')
  flow.click(/Compteur remis à zéro/)
  flow.change('Date du changement', '2026-03-12')
  fill(flow)
  flow.click(addLabel)
  t.deepEqual(flow.props.draft.readings[0], initialReading)
  t.deepEqual(flow.props.draft.readings[1], otherReading)
  await removeFirst(flow)
  t.deepEqual(flow.props.draft.readings[0], initialReading)
  t.is(flow.props.draft.readings[0].value, '100')
  t.deepEqual(flow.props.draft.meterEvents, [])
})

for (const confirmReassignment of [false, true]) {
  test(`valider le remplacement rattache les relevés suivants sans dialogue natif (${confirmReassignment})`, t => {
    const initialContext = context()
    initialContext.targets[0].meters = []
    const readings = ['2025-11-01', '2026-03-12', '2026-06-01', '2026-11-01'].map((readingDate, index) => ({
      targetId: 'point-a', compteurId: null, readingDate, value: String(100 + index), meterConfirmed: true
    }))
    const flow = interaction({initialContext, initialDraft: {readings, meterEvents: []}, confirmReassignment})
    flow.click('Déclarer un changement de compteur')
    flow.click(/Compteur remplacé/)
    flow.change('Date du changement', '2026-03-12')
    flow.change('Numéro de série', 'SN-2026')
    fill(flow)
    flow.click(addLabel)
    t.deepEqual(flow.confirmations, [])
    t.is(flow.calls.length, 1)
    t.true(flow.calls[0].meterEvents[0].reassignFollowingReadings)
    t.deepEqual(flow.calls[0].readings, readings)
    t.false(flow.pendingSignals.at(-1))
  })
}

test('un remplacement sans inventaire refuse de réattribuer sur un relevé déjà présent', t => {
  const initialContext = context()
  initialContext.targets[0].meterlessInitial = true
  const nullReading = {
    targetId: 'point-a', compteurId: null, readingDate: '2026-06-01', value: '100'
  }
  const flow = interaction({initialContext, initialDraft: {readings: [nullReading, {...nullReading, compteurId: 'meter-a2', value: '200'}], meterEvents: []}})
  flow.click('Déclarer un changement de compteur')
  flow.click(/Compteur remplacé/)
  flow.change('Date du changement', '2026-03-12')
  flow.click('Compteur déjà enregistré')
  flow.change('Compteur déjà enregistré', 'meter-a2')
  fill(flow)
  flow.click(addLabel)
  t.deepEqual(flow.calls, [])
  t.deepEqual(flow.confirmations, [])
  t.regex(flow.html(), /Un relevé existe déjà pour ce nouveau compteur/)
})

for (const conflict of [false, true]) {
  test(`retirer le nouveau compteur restitue ses valeurs au point sans écraser un doublon (${conflict})`, t => {
    const initialContext = context()
    initialContext.targets[0] = {
      ...initialContext.targets[0], meterlessInitial: true, meterlessEndDate: null, meters: [{
        ...meter('pending-meter', 'SN-2026'), pending: true, pendingEvent: {previousCompteurId: null, at: '2026-03-12'}
      }]
    }
    const {nextCompteurId, ...event} = savedEvent({previousCompteurId: null})
    event.nextMeter = {serialNumber: 'SN-2026'}
    const initial = {
      targetId: 'point-a', compteurId: null, readingDate: '2025-11-01', value: '100', meterConfirmed: true
    }
    const following = {
      ...initial, compteurId: 'pending-meter', readingDate: '2026-06-01', value: '123', sourceChunkValueId: 'source'
    }
    const other = {...following, targetId: 'point-b'}
    const initialDraft = {readings: [initial, following, other, ...(conflict ? [{...following, compteurId: null, value: '999'}] : [])], meterEvents: [event]}
    const flow = interaction({initialContext, initialDraft})
    flow.click('Modifier')
    t.is(flow.button('Supprimer').props.disabled, conflict)
    flow.click('Supprimer')
    if (conflict) {
      t.deepEqual(flow.calls, [])
      t.regex(flow.html(), /Deux relevés existent au 1 juin 2026/)
    } else {
      t.deepEqual(flow.calls[0], {readings: [initial, {...following, compteurId: null}, other], meterEvents: []})
    }
  })
}

test('le compteur initial non référencé reste sélectionnable après réception du compteur virtuel', t => {
  const initialContext = context()
  initialContext.targets[0] = {
    ...initialContext.targets[0], meterlessInitial: true, meterlessEndDate: null,
    meters: [{...meter('pending-meter', 'SN-2026'), pending: true, pendingEvent: {previousCompteurId: null, at: '2026-03-12'}}]
  }
  const flow = interaction({initialContext})
  flow.click('Déclarer un changement de compteur')
  flow.click(/Compteur remis à zéro/)
  t.is(flow.field('Compteur concerné').props.value, '__unreferenced_meter__')
  flow.change('Date du changement', '2026-02-01')
  fill(flow)
  flow.click(addLabel)
  t.is(flow.calls[0].meterEvents[0].previousCompteurId, null)
  t.is(flow.calls[0].meterEvents[0].nextCompteurId, null)
  t.false(JSON.stringify(flow.calls[0]).includes('__unreferenced_meter__'))
})

test('un point inventorié ne peut pas sélectionner artificiellement un compteur non référencé', t => {
  const flow = interaction()
  begin(flow, 'RESET')
  flow.change('Compteur concerné', '__unreferenced_meter__')
  fill(flow)
  flow.click(addLabel)
  t.deepEqual(flow.calls, [])
  t.regex(flow.html(), /Choisissez le compteur concerné/)
})

test('un index inconnu reste null, jamais zéro, et nécessite un motif explicite', t => {
  const flow = interaction()
  begin(flow)
  fill(flow, {reason: ''})
  flow.check('Index avant inconnu')
  flow.check('Index après inconnu')
  t.is(flow.field(/Dernier index/).props.value, '')
  t.is(flow.field(/Premier index/).props.value, '')
  t.true(flow.field(/Dernier index/).props.disabled)
  t.true(flow.field(/Premier index/).props.disabled)
  flow.click(addLabel)
  t.deepEqual(flow.calls, [])
  flow.change('Motif du changement', 'Les deux cadrans étaient illisibles')
  flow.click(addLabel)
  t.deepEqual(flow.calls[0].meterEvents, [savedEvent({previousIndex: null, nextIndex: null, reason: 'Les deux cadrans étaient illisibles'})])
  t.regex(flow.html(), /Inconnu|Indisponible|inconnu|indisponible/)
})

test('décocher un index inconnu ne restaure ni ancienne valeur ni zéro', t => {
  const flow = interaction()
  begin(flow)
  fill(flow)
  flow.check('Index avant inconnu')
  flow.check('Index avant inconnu', false)
  t.is(flow.field(/Dernier index/).props.value, '')
  t.false(flow.field(/Dernier index/).props.disabled)
  flow.click(addLabel)
  t.deepEqual(flow.calls, [])
})

test('le même événement ne peut pas être ajouté deux fois', t => {
  const initialDraft = {readings: [], meterEvents: [savedEvent()]}
  const flow = interaction({initialDraft})
  begin(flow)
  fill(flow)
  flow.click(addLabel)
  t.deepEqual(flow.calls, [])
  t.deepEqual(flow.props.draft, initialDraft)
  t.regex(flow.html(), /déjà/)
})

test('le motif respecte la limite serveur de 2000 caractères', t => {
  const flow = interaction()
  begin(flow)
  fill(flow, {reason: 'a'.repeat(2001)})
  flow.click(addLabel)
  t.deepEqual(flow.calls, [])
  t.regex(flow.html(), /aria-invalid="true"/)
  flow.change('Motif du changement', 'a'.repeat(2000))
  flow.click(addLabel)
  t.is(flow.calls.length, 1)
  t.is(flow.calls[0].meterEvents[0].reason.length, 2000)
})

test('changer de type efface les index avant de demander une nouvelle confirmation', t => {
  const flow = interaction()
  begin(flow)
  fill(flow)
  flow.click(/Compteur remis à zéro/)
  t.is(flow.field(/Dernier index/).props.value, '')
  t.is(flow.field(/Premier index/).props.value, '')
  flow.click(addLabel)
  t.deepEqual(flow.calls, [])
})

test('le récapitulatif affiche les index décimaux autorisés sans arrondi flottant', t => {
  const value = '9999999999999999.9999'
  const flow = interaction({initialDraft: {readings: [], meterEvents: [savedEvent({previousIndex: value})]}})
  t.true(content(flow.tree()).includes('9\u202F999\u202F999\u202F999\u202F999,9999 m³'))
  t.is(flow.props.draft.meterEvents[0].previousIndex, value)
})

test('les droits spécifiques à la réponse priment sur la liste générale des points éditables', t => {
  const initialContext = context()
  initialContext.responses.INDEX.permissions = {editableTargetIds: ['point-a']}
  const allowed = interaction({initialContext})
  t.truthy(allowed.button('Déclarer un changement de compteur'))
  const forbidden = interaction({initialContext, targetId: 'point-b'})
  t.is(forbidden.html(), '')
})

test('le formulaire ne peut pas être ouvert sans aucun point éditable', t => {
  const flow = interaction({initialContext: context({editableTargetIds: []})})
  t.is(flow.html(), '')
  t.deepEqual(flow.calls, [])
})

test('une date historique hors période est refusée avant l’ajout au brouillon', t => {
  const flow = interaction()
  begin(flow)
  fill(flow)
  flow.change('Date du changement', '2024-02-29')
  flow.click(addLabel)
  t.is(flow.calls.length, 0)
  t.regex(flow.html(), /entre le 1 novembre 2025 et le 1 novembre 2026/)
  t.is(flow.field('Date du changement').props.min, '2025-11-01')
  t.is(flow.field('Date du changement').props.max, '2026-11-01')
})

test('un événement historique reste visible même si aucun inventaire de compteur n’est disponible', t => {
  const initialContext = context({canEdit: false, editableTargetIds: []})
  initialContext.targets[0].meters = []
  const flow = interaction({initialContext, initialDraft: {readings: [], meterEvents: [savedEvent({previousIndex: null})]}, disabled: true})
  t.regex(flow.html(), /Forage A/)
  t.regex(flow.html(), /Index inconnu/)
  t.regex(flow.html(), /12 mars 2026/)
  t.falsy(flow.button(/Modifier|Supprimer/))
})

test('le formulaire signale sa saisie locale au parent dès son ouverture et jusqu’à son annulation', t => {
  const flow = interaction()
  flow.tree()
  t.is(flow.pendingSignals.at(-1), false)
  begin(flow)
  t.is(flow.pendingSignals.at(-1), true)
  fill(flow)
  t.deepEqual(flow.calls, [])
  t.is(flow.pendingSignals.at(-1), true)
  flow.click('Annuler')
  t.is(flow.pendingSignals.at(-1), false)
  t.deepEqual(flow.calls, [])
})

test('ajouter un changement complet libère la garde seulement après la remise au parent du brouillon', t => {
  const flow = interaction()
  begin(flow)
  fill(flow)
  t.is(flow.pendingSignals.at(-1), true)
  flow.click(addLabel)
  t.is(flow.calls.length, 1)
  t.deepEqual(flow.calls[0].meterEvents, [savedEvent()])
  t.is(flow.pendingSignals.at(-1), false)
})

test('un formulaire invalide garde sa protection et le démontage nettoie le signal parent', t => {
  const flow = interaction()
  begin(flow)
  flow.click(addLabel)
  t.deepEqual(flow.calls, [])
  t.is(flow.pendingSignals.at(-1), true)
  flow.unmount()
  t.is(flow.pendingSignals.at(-1), false)
})

test('le compteur à l’origine de l’action est présélectionné, sans pouvoir changer de point', t => {
  const flow = interaction({compteurId: 'meter-a2'})
  flow.click('Déclarer un changement de compteur')
  flow.click(/Compteur remis à zéro/)
  t.is(flow.field('Compteur concerné').props.value, 'meter-a2')
  t.notRegex(flow.html(), /Choisir un point|Point concerné/)
  t.regex(flow.html(), /Forage A/)
})

test('un unique compteur est présélectionné et son remplacement propose directement la saisie du nouveau', t => {
  const flow = interaction({targetId: 'point-b'})
  flow.click('Déclarer un changement de compteur')
  flow.click(/Compteur remplacé/)
  t.is(flow.field('Ancien compteur').props.value, 'meter-b')
  t.true(flow.button('Nouveau compteur').props['aria-pressed'])
  t.true(flow.button('Compteur déjà enregistré').props.disabled)
  t.truthy(flow.field('Numéro de série'))
  t.is(flow.field(/Premier index/).props.value, '')
  t.deepEqual(flow.calls, [])
})

test('les deux choix de compteur sont explicites et le select ne contient que les compteurs déjà enregistrés du point', t => {
  const flow = interaction()
  begin(flow)
  const choices = ['Compteur déjà enregistré', 'Nouveau compteur']
  const group = nodes(flow.tree()).find(node => node.props.role === 'group' && node.props['aria-label'] === 'Compteur après le remplacement')
  t.deepEqual(nodes(group).filter(node => node.type === 'button').map(node => content(node)), choices)
  t.true(flow.button(choices[0]).props['aria-pressed'])
  t.false(flow.button(choices[1]).props['aria-pressed'])
  t.deepEqual(nodes(flow.field(choices[0])).filter(node => node.type === 'option').map(node => node.props.value), ['', 'meter-a2'])
  t.notRegex(flow.html(), /__new_meter__|__unreferenced_meter__/)
  flow.change(/Premier index/, '12,1234')
  flow.click(choices[1])
  t.false(flow.button(choices[0]).props['aria-pressed'])
  t.true(flow.button(choices[1]).props['aria-pressed'])
  t.throws(() => flow.field(choices[0]), {message: `Champ absent : ${choices[0]}`})
  t.is(flow.field(/Premier index/).props.value, '')
  flow.change('Numéro de série', 'SN-SAISIE')
  flow.change('Nom ou repère du compteur', 'Repère saisi')
  flow.click(choices[0])
  t.true(flow.button(choices[0]).props['aria-pressed'])
  t.false(flow.button(choices[1]).props['aria-pressed'])
  t.is(flow.field(choices[0]).props.value, '')
  t.throws(() => flow.field('Numéro de série'), {message: 'Champ absent : Numéro de série'})
  flow.change(choices[0], 'meter-a2')
  fill(flow)
  flow.click(addLabel)
  t.deepEqual(flow.saves[0].meterEvents, [savedEvent()])
  t.falsy(flow.saves[0].meterEvents[0].nextMeter)
})

test('les choix explicites respectent les droits même avec un callback conservé avant leur retrait', t => {
  const flow = interaction()
  begin(flow)
  const chooseNew = flow.button('Nouveau compteur').props.onClick
  flow.props.disabled = true
  t.true(flow.button('Nouveau compteur').props.disabled)
  t.true(flow.button('Compteur déjà enregistré').props.disabled)
  chooseNew()
  t.true(flow.button('Compteur déjà enregistré').props['aria-pressed'])
  t.false(flow.button('Nouveau compteur').props['aria-pressed'])
  t.deepEqual(flow.calls, [])
  t.deepEqual(flow.saves, [])
})

test('les informations de l’ancien compteur sont rappelées en lecture seule face aux champs du nouveau compteur', t => {
  const initialContext = context()
  initialContext.targets[0].meters[0].compteur.identifier = 'Compteur du forage A'
  const beforeContext = structuredClone(initialContext)
  const flow = interaction({initialContext})
  begin(flow)
  flow.click('Nouveau compteur')
  for (const [label, expected] of [['Numéro de série', 'Ancien A'], ['Nom ou repère du compteur', 'Compteur du forage A']]) {
    const previous = flow.field(label, {stage: 'before'})
    const next = flow.field(label, {stage: 'after'})
    t.true(previous.props.disabled)
    t.is(previous.props.value, expected)
    t.false(next.props.disabled)
    t.is(next.props.value, '')
    t.is(flow.field(label).props.id, next.props.id)
  }

  t.deepEqual(initialContext, beforeContext)
  t.deepEqual(flow.calls, [])
})

test('le rappel de l’ancien compteur suit la sélection du compteur du point concerné', t => {
  const initialContext = context()
  initialContext.targets[0].meters[0].compteur.identifier = 'Repère A'
  initialContext.targets[0].meters[1].compteur.identifier = 'Repère A2'
  initialContext.targets[1].meters[0].compteur.identifier = 'Repère B'
  const flow = interaction({initialContext})
  begin(flow)
  flow.click('Nouveau compteur')
  t.is(flow.field('Numéro de série', {stage: 'before'}).props.value, 'Ancien A')
  flow.change('Ancien compteur', 'meter-a2')
  flow.click('Nouveau compteur')
  t.is(flow.field('Numéro de série', {stage: 'before'}).props.value, 'Nouveau A')
  t.is(flow.field('Nom ou repère du compteur', {stage: 'before'}).props.value, 'Repère A2')
  t.notRegex(flow.html(), /Compteur B|Repère B/)
  t.deepEqual(flow.calls, [])
})

test('un numéro de série inconnu reste vide dans le rappel sans être remplacé par le nom du compteur', t => {
  const initialContext = context()
  initialContext.targets[0].meters[0].compteur = {serialNumber: null, identifier: 'Repère sans numéro'}
  const flow = interaction({initialContext})
  begin(flow)
  flow.click('Nouveau compteur')
  const serialNumber = flow.field('Numéro de série', {stage: 'before'})
  t.true(serialNumber.props.disabled)
  t.is(serialNumber.props.value, '')
  t.is(serialNumber.props.placeholder, 'Non renseigné')
  t.is(flow.field('Nom ou repère du compteur', {stage: 'before'}).props.value, 'Repère sans numéro')
  initialContext.targets[0].meters[0].compteur = {}
  const identifier = flow.field('Nom ou repère du compteur', {stage: 'before'})
  t.true(identifier.props.disabled)
  t.is(identifier.props.value, '')
  t.is(identifier.props.placeholder, 'Non renseigné')
  t.deepEqual(flow.calls, [])
})

test('le rappel d’identité supplémentaire est réservé à la saisie d’un nouveau compteur', t => {
  const flow = interaction()
  begin(flow)
  t.throws(() => flow.field('Numéro de série'), {message: 'Champ absent : Numéro de série'})
  flow.click('Nouveau compteur')
  t.truthy(flow.field('Numéro de série', {stage: 'before'}))
  flow.click(/Compteur remis à zéro/)
  t.throws(() => flow.field('Numéro de série'), {message: 'Champ absent : Numéro de série'})
  t.deepEqual(flow.calls, [])
})

for (const nextMeter of [{serialNumber: 'SN-2026'}, {identifier: 'Compteur principal'}, {serialNumber: 'SN-2026', identifier: 'Compteur principal'}]) {
  test(`un nouveau compteur peut être déclaré avec ${Object.keys(nextMeter).join(' et ')}, sans création anticipée`, t => {
    const flow = interaction()
    begin(flow)
    flow.click('Nouveau compteur')
    for (const [key, value] of Object.entries(nextMeter)) {
      flow.change(key === 'serialNumber' ? 'Numéro de série' : 'Nom ou repère du compteur', ` ${value} `)
    }

    fill(flow)
    t.notRegex(flow.html(), /fiche du nouveau compteur|Ajouter au brouillon|Le changement sera ajouté/)
    t.notRegex(flow.html(), /Aucune fiche créée pour l’ancien compteur/)
    t.deepEqual(flow.calls, [])
    flow.click(addLabel)
    const {nextCompteurId, ...expected} = savedEvent()
    t.deepEqual(flow.calls[0].meterEvents, [{...expected, nextMeter}])
    t.regex(flow.html(), new RegExp(nextMeter.serialNumber || nextMeter.identifier))
    t.notRegex(flow.html(), /fiche du nouveau compteur|Ajouter au brouillon|Vous pourrez le retirer/)
    t.falsy(flow.button(addLabel))
  })
}

test('un nouveau compteur sans identité ou avec une identité trop longue ne peut pas être ajouté', t => {
  const flow = interaction()
  begin(flow)
  flow.click('Nouveau compteur')
  fill(flow)
  flow.click(addLabel)
  t.deepEqual(flow.calls, [])
  t.regex(flow.html(), /numéro de série ou un nom/)
  flow.change('Numéro de série', 'a'.repeat(201))
  flow.click(addLabel)
  t.deepEqual(flow.calls, [])
  t.regex(flow.html(), /200 caractères maximum/)
  flow.change('Numéro de série', 'a'.repeat(200))
  flow.click(addLabel)
  t.is(flow.calls.length, 1)
})

test('changer pour une remise à zéro ne conserve pas une création de compteur', t => {
  const flow = interaction()
  begin(flow)
  flow.click('Nouveau compteur')
  flow.change('Numéro de série', 'SN-2026')
  flow.click(/Compteur remis à zéro/)
  fill(flow)
  flow.click(addLabel)
  t.is(flow.calls.length, 1)
  t.falsy(flow.calls[0].meterEvents[0].nextMeter)
  t.is(flow.calls[0].meterEvents[0].nextCompteurId, 'meter-a')
})

test('le récapitulatif du point ne montre pas les événements d’un autre point', t => {
  const flow = interaction({initialDraft: {readings: [], meterEvents: [savedEvent({targetId: 'point-b', reason: 'Ne pas afficher cette intervention'})]}})
  t.notRegex(flow.html(), /Ne pas afficher cette intervention/)
  t.falsy(flow.button(/Modifier|Supprimer/))
  t.truthy(flow.button('Déclarer un changement de compteur'))
  t.falsy(flow.button('Déclarer un autre changement de compteur'))
})

for (const conflict of [false, true]) {
  test(`supprimer réattribue les relevés au compteur connu précédent sauf doublon de date (${conflict})`, async t => {
    const initialContext = context()
    initialContext.targets[0].meters.push({
      ...meter('pending-meter', 'SN-2026'), pending: true, pendingEvent: {previousCompteurId: 'meter-a', at: '2026-03-12'}
    })
    const {nextCompteurId, ...event} = savedEvent()
    const otherEvent = savedEvent({targetId: 'point-b'})
    const keep = [{
      targetId: 'point-a', compteurId: 'meter-a', readingDate: '2025-11-01', value: '12'
    }, {
      targetId: 'point-b', compteurId: 'pending-meter', readingDate: '2026-06-01', value: '45'
    }]
    const following = {
      targetId: 'point-a', compteurId: 'pending-meter', readingDate: '2026-06-01', value: '33.1234', sourceChunkValueId: 'source-preserved', correctionReason: 'Valeur vérifiée'
    }
    const flow = interaction({
      initialContext, initialDraft: {
        comment: 'Conserver', meterEvents: [{...event, nextMeter: {serialNumber: 'SN-2026'}}, otherEvent], readings: [...keep, following, ...(conflict ? [{...following, compteurId: 'meter-a', value: '99'}] : [])]
      }
    })
    const initialDraft = structuredClone(flow.props.draft)
    t.false(Boolean(flow.button('Modifier').props.disabled))
    const card = flow.card(event.at)
    const deleteButton = nodes(card).find(node => node.type === 'button' && content(node) === 'Supprimer')
    t.is(deleteButton.props.disabled, conflict)
    if (conflict) {
      t.truthy(deleteButton.props['aria-describedby'])
      const explanation = nodes(card).find(node => node.props.id === deleteButton.props['aria-describedby'])
      t.regex(content(explanation), /même date|juin 2026/)
      await flow.clickCard(event.at, 'Supprimer')
      t.deepEqual(flow.calls, [])
      t.deepEqual(flow.props.draft, initialDraft)
      flow.clickCard(event.at, 'Modifier')
      t.true(flow.button('Supprimer', {scope: 'editor'}).props.disabled)
    } else {
      await flow.clickCard(event.at, 'Supprimer')
      t.deepEqual(flow.saves, [{comment: 'Conserver', meterEvents: [otherEvent], readings: [...keep, {...following, compteurId: 'meter-a'}]}])
      t.falsy(flow.card(event.at))
      t.deepEqual(flow.confirmations, [])
    }
  })
}

test('un changement qui utilise le nouveau compteur doit être retiré avant celui qui le crée', t => {
  const initialContext = context()
  initialContext.targets[0].meters.push({
    ...meter('pending-meter', 'SN-2026'), pending: true, pendingEvent: {previousCompteurId: 'meter-a', at: '2026-03-12'}
  })
  const {nextCompteurId, ...event} = savedEvent()
  const followup = savedEvent({
    type: 'RESET', at: '2026-04-12', previousCompteurId: 'pending-meter', nextCompteurId: 'pending-meter'
  })
  const initialDraft = {meterEvents: [{...event, nextMeter: {serialNumber: 'SN-2026'}}, followup], readings: [{targetId: 'point-a', compteurId: 'pending-meter', value: '33'}]}
  const flow = interaction({initialContext, initialDraft})
  t.false(Boolean(flow.button('Modifier').props.disabled))
  const card = flow.card(event.at)
  const deleteButton = nodes(card).find(node => node.type === 'button' && content(node) === 'Supprimer')
  t.true(deleteButton.props.disabled)
  t.truthy(deleteButton.props['aria-describedby'])
  const explanation = nodes(card).find(node => node.props.id === deleteButton.props['aria-describedby'])
  t.regex(content(explanation), /changement suivant/)
  flow.click('Modifier')
  t.true(flow.button('Supprimer', {scope: 'editor'}).props.disabled)
  flow.click('Supprimer', {scope: 'editor'})
  t.deepEqual(flow.calls, [])
  t.regex(flow.html(), /[Ss]upprimez d’abord le changement suivant|[Rr]etirez d’abord le changement suivant/)
})

test('supprimer le dernier remplacement d’une chaîne restitue les relevés au compteur précédent sans perdre leurs valeurs', async t => {
  const first = savedEvent({nextCompteurId: undefined, nextMeter: {serialNumber: 'SN-INTERMEDIAIRE'}})
  const second = savedEvent({
    at: '2026-05-12', previousCompteurId: 'pending-first', nextCompteurId: undefined, nextMeter: {serialNumber: 'SN-DERNIER'}
  })
  const initialContext = context()
  initialContext.targets[0].meters.push(...[first, second].map((event, index) => ({
    ...meter(index === 0 ? 'pending-first' : 'pending-second', event.nextMeter.serialNumber), pending: true, startDate: event.at, endDate: null, pendingEvent: {previousCompteurId: event.previousCompteurId, at: event.at}
  })))
  const keep = [{
    targetId: 'point-a', compteurId: 'meter-a', readingDate: '2025-11-01', value: '100'
  }, {
    targetId: 'point-b', compteurId: 'pending-second', readingDate: '2026-06-01', value: '50'
  }]
  const following = [{
    targetId: 'point-a', compteurId: 'pending-second', readingDate: '2026-06-01', value: '0', sourceChunkValueId: 'source-zero'
  }, {
    targetId: 'point-a', compteurId: 'pending-second', readingDate: '2026-11-01', value: '123.4567', sourceChunkValueId: 'source-decimal', correctionReason: 'Valeur vérifiée'
  }]
  const other = savedEvent({targetId: 'point-b'})
  const initialDraft = {comment: 'Commentaire conservé', meterEvents: [first, second, other], readings: [...keep, ...following]}
  const flow = interaction({initialContext, initialDraft})
  t.true(flow.cardButton(first.at, 'Supprimer').props.disabled)
  t.false(flow.cardButton(second.at, 'Supprimer').props.disabled)
  await flow.clickCard(second.at, 'Supprimer')
  t.deepEqual(flow.saves, [{...initialDraft, meterEvents: [first, other], readings: [...keep, ...following.map(reading => ({...reading, compteurId: 'pending-first'}))]}])
  t.falsy(flow.card(second.at))
  t.truthy(flow.card(first.at))
  t.false(flow.cardButton(first.at, 'Supprimer').props.disabled)
  t.deepEqual(flow.confirmations, [])
})

for (const endDate of ['2026-06-01', '2026-05-31']) {
  test(`supprimer préserve les relevés et respecte la fin de service du compteur précédent (${endDate})`, async t => {
    const initialContext = context()
    initialContext.targets[0].meters[0] = {...initialContext.targets[0].meters[0], startDate: '2025-01-01', endDate}
    initialContext.targets[0].meters.push({...meter('pending-meter', 'SN-INITIAL'), pending: true, pendingEvent: {previousCompteurId: 'meter-a', at: '2026-03-12'}})
    const {nextCompteurId, ...event} = savedEvent()
    event.nextMeter = {serialNumber: 'SN-INITIAL'}
    const reading = {
      targetId: 'point-a', compteurId: 'pending-meter', readingDate: '2026-06-01', value: '123.4567', sourceChunkValueId: 'source'
    }
    const initialDraft = {readings: [reading], meterEvents: [event]}
    const flow = interaction({initialContext, initialDraft})
    const blocked = endDate < reading.readingDate
    t.is(flow.cardButton(event.at, 'Supprimer').props.disabled, blocked)
    await flow.clickCard(event.at, 'Supprimer')
    if (blocked) {
      t.regex(content(flow.card(event.at)), /compteur précédent.*en service au 1 juin 2026/)
      t.deepEqual(flow.saves, [])
      t.deepEqual(flow.props.draft, initialDraft)
    } else {
      t.deepEqual(flow.saves, [{readings: [{...reading, compteurId: 'meter-a'}], meterEvents: []}])
    }
  })
}

test('supprimer accepte une seconde affectation valide du compteur précédent après une première expirée', async t => {
  const initialContext = context()
  initialContext.targets[0].meters = [
    {...meter('meter-a', 'Ancien A'), startDate: '2024-01-01', endDate: '2025-01-01'},
    {
      ...meter('meter-a', 'Ancien A'), id: 'binding-meter-a-current', startDate: '2025-06-01', endDate: null
    },
    {...meter('pending-meter', 'SN-INITIAL'), pending: true, pendingEvent: {previousCompteurId: 'meter-a', at: '2026-03-12'}}
  ]
  const {nextCompteurId, ...event} = savedEvent()
  event.nextMeter = {serialNumber: 'SN-INITIAL'}
  const reading = {
    targetId: 'point-a', compteurId: 'pending-meter', readingDate: '2026-06-01', value: '123.4567', sourceChunkValueId: 'source'
  }
  const flow = interaction({initialContext, initialDraft: {readings: [reading], meterEvents: [event]}})
  t.false(flow.cardButton(event.at, 'Supprimer').props.disabled)
  t.false(nodes(flow.card(event.at)).some(node => node.props.role === 'alert'))
  await flow.clickCard(event.at, 'Supprimer')
  t.deepEqual(flow.saves, [{readings: [{...reading, compteurId: 'meter-a'}], meterEvents: []}])
})

test('les bornes de période sont acceptées et le jour suivant est refusé', t => {
  for (const at of ['2025-11-01', '2026-11-01', '2026-11-02']) {
    const flow = interaction()
    begin(flow)
    fill(flow)
    flow.change('Date du changement', at)
    flow.click(addLabel)
    t.is(flow.calls.length, at === '2026-11-02' ? 0 : 1)
  }
})

test('un changement de droits conserve la saisie lisible mais verrouille aussi les anciens callbacks', t => {
  const flow = interaction()
  begin(flow)
  fill(flow)
  t.is(flow.pendingSignals.at(-1), true)
  const save = flow.button(addLabel).props.onClick
  const change = flow.field(/Dernier index/).props.onChange
  flow.props.disabled = true
  t.true(nodes(flow.tree()).find(node => node.type === 'fieldset').props.disabled)
  t.true(flow.button(addLabel).props.disabled)
  t.true(flow.button('Annuler').props.disabled)
  t.is(flow.field(/Dernier index/).props.value, '125.5')
  t.is(flow.pendingSignals.at(-1), false)
  save()
  change({target: {value: '999'}})
  t.is(flow.field(/Dernier index/).props.value, '125.5')
  t.deepEqual(flow.calls, [])
  t.deepEqual(flow.saves, [])
})

test('les deux choix sont neutres avant sélection et partagent le même style sélectionné', t => {
  const flow = interaction()
  flow.click('Déclarer un changement de compteur')
  const choices = [/^Compteur remplacé/, /^Compteur remis à zéro/]
  for (const label of choices) {
    const choice = flow.button(label)
    t.false(choice.props['aria-pressed'])
    t.notRegex(choice.props.className, /replacement|reset|selected/)
  }

  for (const label of choices) {
    flow.click(label)
    const selected = flow.button(label)
    t.true(selected.props['aria-pressed'])
    t.regex(selected.props.className, /selected/)
    t.notRegex(selected.props.className, /replacement|reset/)
    const other = flow.button(choices.find(choice => choice !== label))
    t.false(other.props['aria-pressed'])
    t.notRegex(other.props.className, /selected/)
    t.true(nodes(selected).some(node => node.props?.className?.includes('fr-icon-check-line')))
  }
})
