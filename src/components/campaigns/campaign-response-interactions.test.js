import React from 'react'

import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {runInNewContext} from 'node:vm'

import test from 'ava'
import {transformSync} from 'next/dist/build/swc/index.js'
import {renderToStaticMarkup} from 'react-dom/server'

import * as campaignCalendar from '../../lib/campaign-calendar.js'
import * as draftQueue from '../../lib/campaign-draft.js'
import * as meterEventValidation from '../../lib/campaign-meter-event-validation.js'
import * as responseMapHelpers from '../../lib/campaign-response-map.js'
import * as responseReadingHelpers from '../../lib/campaign-response-readings.js'
import * as responseRecoveryHelpers from '../../lib/campaign-response-recovery.js'
import * as campaignHelpers from '../../lib/collection-campaigns.js'
import * as waterHelpers from '../../lib/water-uses.js'

const require = createRequire(import.meta.url)
const nodes = tree => Array.isArray(tree) ? tree.flatMap(node => nodes(node)) : (tree && typeof tree === 'object' ? [tree, ...nodes(typeof tree.props?.children === 'function' ? tree.props.children({pointProps: () => ({})}) : tree.props?.children)] : [])
const button = (tree, label) => nodes(tree).find(node => node.type === 'button' && node.props.children === label)
const content = tree => Array.isArray(tree) ? tree.map(item => content(item)).join('') : (typeof tree === 'string' ? tree : content(tree?.props?.children || []))
const draftFeedback = tree => nodes(nodes(tree).find(node => node.type === 'section' && node.props['aria-label'] === 'Enregistrement et transmission')).findLast(node => node.props?.role === 'status')
const deferred = () => {
  let resolve
  const promise = new Promise(_resolve => {
    resolve = _resolve
  })

  return {promise, resolve}
}

const settle = async () => {
  for (let index = 0; index < 25; index++) {
    // Exercise the real serial queue and effect promises without a wall-clock wait.
    // eslint-disable-next-line no-await-in-loop
    await Promise.resolve()
  }
}

const nestedHooks = {
  state: React.useState, ref: React.useRef, effect: React.useEffect, callback: React.useCallback
}
const baseContext = ({canEdit = true, canSubmit = true, editableTargetIds = ['point-a'], status = 'DRAFT'} = {}) => ({
  campaign: {
    id: 'campaign', name: 'Collecte de bassin', year: 2026, status: 'OPEN',
    indexDates: ['2025-11-01', '2026-06-01'],
    periods: [{
      id: 'index', kind: 'INDEX', startDate: '2025-11-01', endDate: '2026-06-01'
    }]
  },
  preleveurUserId: 'represented-user', availablePreleveurs: [],
  permissions: {canRead: true, canEdit, canSubmit}, editableTargetIds,
  targets: [{id: 'point-a', pointPrelevement: {name: 'Forage A'}, meters: []}],
  responses: {
    INDEX: {
      id: 'response', version: 4, status, draft: {readings: [], meterEvents: []}
    }
  },
  existingReadings: [], calculation: {totals: []}
})
const reading = value => ({
  targetId: 'point-a', compteurId: null, readingDate: '2026-06-01', value
})
const responseContext = kind => {
  const context = baseContext()
  if (kind === 'NEEDS') {
    context.campaign.periods = [{
      id: 'needs', kind: 'NEEDS', startDate: '2026-06-01', endDate: '2026-11-01'
    }]
    context.responses.NEEDS = {...context.responses.INDEX, draft: {needs: []}}
  }

  return context
}

const responseDraft = (flow, kind, value) => kind === 'INDEX'
  ? {...flow.draft(), readings: [reading(value)]}
  : {...flow.draft(), needs: [{targetId: 'point-a', periodId: 'needs', requestedVolume: value}]}
const successfulSave = payload => ({
  success: true,
  data: {
    response: {
      ...baseContext().responses.INDEX, version: payload.expectedVersion + 1, status: 'DRAFT', draft: payload.data
    },
    calculation: {totals: []}
  }
})

// Real response component + real serial draft queue; only hooks, timers and
// server actions are controlled. The rendering tree keeps every permission gate.
let actorNumber = 0
const interaction = ({initialContext = baseContext(), responseKind = 'INDEX', saveResult, submitResult, contextResult, userId = `actor-${++actorNumber}`, auth, sessionStorage, confirmNavigation = false} = {}) => {
  const state = []
  const timers = new Map()
  const loaded = new Map()
  const calls = []
  const confirmations = []
  const windowListeners = new Map()
  const documentListeners = new Map()
  const navigation = {href: '', reloadCount: 0}
  const browser = {
    sessionStorage,
    addEventListener: (type, listener) => windowListeners.set(type, listener),
    removeEventListener: type => windowListeners.delete(type),
    location: {
      get href() {
        return navigation.href
      },
      set href(value) {
        navigation.href = value
      },
      reload() {
        navigation.reloadCount++
      }
    }
  }
  const document = {
    addEventListener: (type, listener) => documentListeners.set(type, listener),
    removeEventListener: type => documentListeners.delete(type)
  }
  let cursor = 0
  let timerId = 0
  let renderingMarkup = false
  let currentResponse = structuredClone(initialContext.responses[responseKind])
  const react = {
    ...React,
    useState(initial) {
      if (renderingMarkup) {
        return nestedHooks.state(initial)
      }

      const index = cursor++
      if (!(index in state)) {
        state[index] = typeof initial === 'function' ? initial() : initial
      }

      return [state[index], value => {
        state[index] = typeof value === 'function' ? value(state[index]) : value
      }]
    },
    useRef(initial) {
      if (renderingMarkup) {
        return nestedHooks.ref(initial)
      }

      const index = cursor++
      state[index] ||= {current: initial}
      return state[index]
    },
    useEffect(effect, dependencies) {
      if (renderingMarkup) {
        nestedHooks.effect(effect, dependencies)
        return
      }

      const index = cursor++
      if (!state[index] || !dependencies?.every((dependency, position) => Object.is(dependency, state[index].dependencies[position]))) {
        state[index]?.cleanup?.()
        state[index] = {dependencies, cleanup: effect()}
      }
    },
    useCallback(callback, dependencies) {
      if (renderingMarkup) {
        return nestedHooks.callback(callback, dependencies)
      }

      const index = cursor++
      if (!state[index] || !dependencies.every((dependency, position) => Object.is(dependency, state[index].dependencies[position]))) {
        state[index] = {dependencies, callback}
      }

      return state[index].callback
    }
  }
  const actions = {
    async getCampaignContextAction(id, preleveurUserId) {
      calls.push({action: 'context', id, preleveurUserId})
      return contextResult || {success: true, data: {...initialContext, responses: {...initialContext.responses, [responseKind]: currentResponse}}}
    },
    async saveCampaignResponseAction(id, kind, payload) {
      calls.push({
        action: 'save', id, kind, payload: structuredClone(payload)
      })
      if (typeof saveResult === 'function') {
        return saveResult(id, kind, payload)
      }

      if (saveResult) {
        return saveResult
      }

      currentResponse = {
        ...currentResponse, version: payload.expectedVersion + 1, status: 'DRAFT', draft: payload.data
      }
      return {success: true, data: {response: currentResponse, calculation: {totals: []}}}
    },
    async submitCampaignResponseAction(id, kind, payload) {
      calls.push({
        action: 'submit', id, kind, payload: structuredClone(payload)
      })
      const overridden = typeof submitResult === 'function' ? await submitResult(id, kind, payload) : submitResult
      if (overridden) {
        return overridden
      }

      currentResponse = {...currentResponse, version: payload.expectedVersion + 1, status: 'SUBMITTED'}
      return {success: true, data: {response: currentResponse, calculation: {totals: []}}}
    },
    async reopenCampaignResponseAction() {
      throw new Error('Aucune réouverture autorisée dans ces scénarios')
    }
  }
  const loadComponent = name => {
    if (loaded.has(name)) {
      return loaded.get(name)
    }

    const filename = new URL(`${name}.js`, import.meta.url)
    const {code} = transformSync(readFileSync(filename, 'utf8'), {filename: filename.pathname, jsc: {parser: {syntax: 'ecmascript', jsx: true}, transform: {react: {runtime: 'automatic'}}, target: 'es2022'}, module: {type: 'commonjs'}})
    const compiledModule = {exports: {}}
    const imports = {
      react,
      '@/contexts/auth-context.js': {useAuth: () => auth || ({user: {id: userId}, isLoading: false})},
      '@/lib/campaign-response-recovery.js': responseRecoveryHelpers,
      '@/lib/campaign-calendar.js': campaignCalendar,
      '@/lib/campaign-draft.js': draftQueue,
      '@/lib/campaign-meter-event-validation.js': meterEventValidation,
      '@/lib/campaign-response-map.js': responseMapHelpers,
      '@/lib/campaign-response-readings.js': responseReadingHelpers,
      '@/lib/collection-campaigns.js': {
        ...campaignHelpers,
        confirmCampaignAction(message) {
          confirmations.push(message)
          return confirmNavigation
        }
      },
      '@/lib/water-uses.js': waterHelpers,
      '@/server/actions/campaigns.js': actions,
      'next/link': ({children, ...props}) => React.createElement('a', props, children)
    }
    const componentRequire = specifier => {
      if (specifier.endsWith('.module.css')) {
        return {}
      }

      if (Object.hasOwn(imports, specifier)) {
        return imports[specifier]
      }

      if (specifier === '@/components/campaigns/campaign-point-change-request.js') {
        throw new Error('Le formulaire de signalement retiré ne doit plus être importé')
      }

      if (specifier.startsWith('@/components/campaigns/')) {
        return loadComponent(specifier.split('/').at(-1).replace('.js', ''))
      }

      return require(specifier)
    }

    runInNewContext('(function(require, module, exports) {' + code + '\n})', {
      structuredClone, URLSearchParams, window: browser, document, crypto: {randomUUID: () => 'test-transmission-key'},
      setTimeout(callback) {
        const id = ++timerId
        timers.set(id, callback)
        return id
      },
      clearTimeout(id) {
        timers.delete(id)
      }
    })(componentRequire, compiledModule, compiledModule.exports)
    loaded.set(name, compiledModule.exports)
    return compiledModule.exports
  }

  const renderResponse = loadComponent('campaign-response-form').default
  return {
    calls,
    confirmations,
    navigation,
    unmount() {
      for (const item of state) {
        item?.cleanup?.()
      }
    },
    editor(value, targetId = 'point-a') {
      nodes(this.render()).find(node => node.props?.onEditorChange).props.onEditorChange(targetId, value)
    },
    recoveredEditors() {
      return nodes(this.render()).find(node => node.props?.recoveredEditors).props.recoveredEditors
    },
    render() {
      cursor = 0
      return renderResponse({initialContext, kind: responseKind})
    },
    draft() {
      return nodes(this.render()).find(node => node.props?.draft && node.props?.onChange).props.draft
    },
    context() {
      return nodes(this.render()).find(node => node.props?.draft && node.props?.onChange).props.context
    },
    meterIssues() {
      return nodes(this.render()).find(node => node.props?.onPendingMeterEventChange).props.issues
    },
    change(draft) {
      nodes(this.render()).find(node => node.props?.draft && node.props?.onChange).props.onChange(draft)
    },
    saveMeterEvent(draft) {
      return nodes(this.render()).find(node => node.props?.onSaveMeterEvent).props.onSaveMeterEvent(draft)
    },
    pendingMeterEvent(pending, targetId = 'point-a') {
      nodes(this.render()).find(node => node.props?.onPendingMeterEventChange).props.onPendingMeterEventChange(targetId, pending)
    },
    beforeUnload() {
      const event = {
        prevented: false, preventDefault() {
          this.prevented = true
        }
      }
      windowListeners.get('beforeunload')(event)
      return event
    },
    navigate() {
      const event = {
        prevented: false, stopped: false,
        target: {closest: () => ({hasAttribute: () => false, target: ''})},
        preventDefault() {
          this.prevented = true
        },
        stopPropagation() {
          this.stopped = true
        }
      }
      documentListeners.get('click')(event)
      return event
    },
    html() {
      const tree = this.render()
      renderingMarkup = true
      try {
        return renderToStaticMarkup(tree)
      } finally {
        renderingMarkup = false
      }
    },
    async runAutosave() {
      await Promise.all([...timers].map(async ([id, callback]) => {
        timers.delete(id)
        await callback()
      }))
    }
  }
}

for (const kind of ['INDEX', 'NEEDS']) {
  test(`Soumettre ${kind} réessaie une autosauvegarde corrigée sans exiger Enregistrer le brouillon`, async t => {
    const flow = interaction({initialContext: responseContext(kind), responseKind: kind})
    flow.change(responseDraft(flow, kind, '-1'))
    await flow.runAutosave()
    t.is(flow.calls.length, 0)
    flow.change(responseDraft(flow, kind, '42'))
    await button(flow.render(), 'Soumettre').props.onClick()
    t.deepEqual(flow.calls.map(call => call.action), ['save', 'submit'])
    t.is(flow.calls[1].payload.expectedVersion, 5)
  })
}

test('Soumettre réessaie aussi une erreur réseau de sauvegarde, sans modifier la clé de transmission', async t => {
  let attempts = 0
  const flow = interaction({saveResult: (id, kind, payload) => ++attempts === 1 ? {success: false, code: 503, error: 'Indisponible'} : successfulSave(payload)})
  flow.change({...flow.draft(), readings: [reading('42')]})
  await flow.runAutosave()
  await button(flow.render(), 'Soumettre').props.onClick()
  t.deepEqual(flow.calls.map(call => call.action), ['save', 'save', 'submit'])
})

test('un retour SPA enregistre immédiatement la saisie avant le délai de debounce', async t => {
  const flow = interaction()
  flow.change({...flow.draft(), readings: [reading('42')]})
  flow.unmount()
  await settle()
  t.deepEqual(flow.calls.map(call => call.action), ['save'])
  t.is(flow.calls[0].payload.data.readings[0].value, '42')
  await flow.runAutosave()
  t.is(flow.calls.length, 1)
})

for (const kind of ['INDEX', 'NEEDS']) {
  test(`le retour sur ${kind} reprend la saisie après un échec de sauvegarde à la sortie`, async t => {
    const userId = `return-${kind}`
    const initialContext = responseContext(kind)
    const first = interaction({
      userId, initialContext, responseKind: kind, saveResult: {success: false, code: 503, error: 'Indisponible'}
    })
    first.change(responseDraft(first, kind, '42'))
    first.unmount()
    await settle()
    const returned = interaction({userId, initialContext, responseKind: kind})
    returned.render()
    await settle()
    t.deepEqual(returned.draft(), first.draft())
    t.true(returned.html().includes('Votre saisie non enregistrée a été reprise.'))
    await button(returned.render(), 'Soumettre').props.onClick()
    t.deepEqual(returned.calls.map(call => call.action), ['context', 'save', 'submit'])
    t.is(returned.calls[1].payload.expectedVersion, 4)
  })
}

test('la reprise attend la sauvegarde en vol et relit la version canonique sans écriture en double', async t => {
  const pending = deferred()
  const userId = 'return-in-flight'
  const first = interaction({userId, saveResult: () => pending.promise})
  first.change({...first.draft(), readings: [reading('42')]})
  const running = first.runAutosave()
  first.unmount()
  await settle()
  const fresh = baseContext()
  fresh.responses.INDEX = {...fresh.responses.INDEX, version: 5, draft: {readings: [reading('42')], meterEvents: []}}
  const returned = interaction({userId, contextResult: {success: true, data: fresh}})
  returned.render()
  t.true(button(returned.render(), 'Soumettre').props.disabled)
  t.is(returned.calls.length, 0)
  pending.resolve(successfulSave(first.calls[0].payload))
  await running
  await settle()
  t.is(returned.draft().readings[0].value, '42')
  t.is(returned.context().responses.INDEX.version, 5)
  t.deepEqual(first.calls.map(call => call.action), ['save'])
  t.deepEqual(returned.calls.map(call => call.action), ['context'])
  returned.change({...returned.draft(), comment: 'Après le retour'})
  await returned.runAutosave()
  t.is(returned.calls.at(-1).payload.expectedVersion, 5)
})

test('la reprise attend aussi une soumission en vol avant de relire sa version finale', async t => {
  const pending = deferred()
  const userId = 'return-submission-in-flight'
  const first = interaction({userId, submitResult: () => pending.promise})
  const transmitting = button(first.render(), 'Soumettre').props.onClick()
  await settle()
  first.unmount()
  const fresh = baseContext()
  fresh.responses.INDEX = {...fresh.responses.INDEX, version: 5, status: 'SUBMITTED'}
  const returned = interaction({userId, contextResult: {success: true, data: fresh}})
  returned.render()
  await settle()
  t.is(returned.calls.length, 0)
  t.true(button(returned.render(), 'Soumettre').props.disabled)
  pending.resolve({success: true, data: {response: fresh.responses.INDEX, calculation: {totals: []}}})
  await transmitting
  await settle()
  t.is(returned.context().responses.INDEX.version, 5)
  t.is(returned.context().responses.INDEX.status, 'SUBMITTED')
  t.deepEqual(first.calls.map(call => call.action), ['submit'])
  t.deepEqual(returned.calls.map(call => call.action), ['context'])
})

test('un formulaire compteur inachevé est repris sans le convertir en événement sauvegardé', async t => {
  const userId = 'return-editor'
  const first = interaction({userId})
  const editor = {event: {type: 'RESET', at: '2026-03-01', previousIndex: '500'}, editing: null, lastAttempt: null}
  first.editor(editor)
  first.unmount()
  await settle()
  t.is(first.calls.length, 0)
  const returned = interaction({userId})
  returned.render()
  await settle()
  t.deepEqual(returned.recoveredEditors()['point-a'], editor)
  t.deepEqual(returned.draft().meterEvents, [])
  t.deepEqual(returned.calls.map(call => call.action), ['context'])
})

test('les relevés hors période sont signalés uniquement sur leur point et restent dans le brouillon', async t => {
  const initialContext = baseContext()
  const retained = {...reading('900'), code: 'READING_OUTSIDE_METER_PERIOD'}
  initialContext.responses.INDEX.draft.readings = [reading('900')]
  initialContext.calculation.ignoredReadings = [retained, {...retained, targetId: 'foreign', value: '123456789'}]
  const flow = interaction({initialContext})
  const html = flow.html()
  t.true(html.includes('1 relevé hors période du compteur'))
  t.true(html.includes('ne sont ni utilisées dans les volumes ni transmises'))
  t.false(html.includes('123456789'))
  flow.change({...flow.draft(), comment: 'Conserver les valeurs'})
  await flow.runAutosave()
  t.is(flow.calls[0].payload.data.readings[0].value, '900')
})

test('une version concurrente garde la saisie locale visible mais interdit son rejeu', async t => {
  const userId = 'return-conflict'
  const first = interaction({userId, saveResult: {success: false, code: 409, error: 'Conflit'}})
  first.change({...first.draft(), readings: [reading('42')]})
  first.unmount()
  await settle()
  const fresh = baseContext()
  fresh.responses.INDEX.version = 6
  const returned = interaction({userId, contextResult: {success: true, data: fresh}})
  returned.render()
  await settle()
  t.is(returned.draft().readings[0].value, '42')
  t.true(button(returned.render(), 'Soumettre').props.disabled)
  await button(returned.render(), 'Soumettre').props.onClick()
  returned.change({...returned.draft(), readings: [reading('99')]})
  t.deepEqual(returned.calls.map(call => call.action), ['context'])
  t.is(returned.draft().readings[0].value, '42')
  t.true(returned.beforeUnload().prevented)
})

test('un éditeur compteur en conflit reste consultable sans action ni identifiant technique', async t => {
  const userId = 'return-editor-conflict'
  const first = interaction({userId})
  first.editor({
    event: {
      type: 'REPLACEMENT', at: '2026-03-01', previousCompteurId: 'private-id', previousIndex: '125', nextIndex: '0', serialNumber: 'Nouveau-42', reason: 'Cadran cassé'
    }, editing: null, lastAttempt: null
  })
  first.unmount()
  const fresh = baseContext()
  fresh.responses.INDEX.version = 5
  const returned = interaction({userId, contextResult: {success: true, data: fresh}})
  returned.render()
  await settle()
  const html = returned.html()
  t.true(html.includes('Changement de compteur retrouvé'))
  t.true(html.includes('125 m³ / 0 m³'))
  t.true(html.includes('Nouveau-42'))
  t.true(html.includes('Cadran cassé'))
  t.false(html.includes('private-id'))
  t.deepEqual(returned.recoveredEditors(), {})
  t.true(button(returned.render(), 'Soumettre').props.disabled)
  t.deepEqual(returned.calls.map(call => call.action), ['context'])
})

test('des droits retirés et un autre utilisateur ne récupèrent pas le brouillon privé précédent', async t => {
  const userId = 'return-rights'
  const first = interaction({userId, saveResult: {success: false, code: 503, error: 'Indisponible'}})
  first.change({...first.draft(), readings: [reading('42')]})
  first.unmount()
  await settle()
  const otherUser = interaction({userId: 'different-user'})
  t.deepEqual(otherUser.draft().readings, [])
  t.is(otherUser.calls.length, 0)
  const returned = interaction({userId, contextResult: {success: true, data: baseContext({canEdit: false, canSubmit: false, editableTargetIds: []})}})
  returned.render()
  await settle()
  t.deepEqual(returned.draft().readings, [])
  t.falsy(button(returned.render(), 'Soumettre'))
  t.deepEqual(returned.calls.map(call => call.action), ['context'])
})

test('une erreur de contexte pendant la reprise ne déverrouille jamais le formulaire périmé', async t => {
  const userId = 'return-unavailable'
  const first = interaction({userId, saveResult: {success: false, code: 503, error: 'Indisponible'}})
  first.change({...first.draft(), readings: [reading('42')]})
  first.unmount()
  await settle()
  const returned = interaction({userId, contextResult: {success: false, code: 403, error: 'Accès refusé'}})
  returned.render()
  await settle()
  t.true(button(returned.render(), 'Soumettre').props.disabled)
  returned.change({...returned.draft(), readings: [reading('99')]})
  t.deepEqual(returned.calls.map(call => call.action), ['context'])
  t.true(returned.html().includes('La reprise de votre saisie est momentanément indisponible.'))
})

test('la session en chargement puis un changement d’utilisateur bloquent les callbacks de saisie', async t => {
  const auth = {user: {id: 'initial-user'}, isLoading: true}
  const flow = interaction({auth})
  t.true(button(flow.render(), 'Enregistrer le brouillon').props.disabled)
  flow.change({...flow.draft(), readings: [reading('42')]})
  t.deepEqual(flow.draft().readings, [])
  auth.isLoading = false
  flow.change({...flow.draft(), readings: [reading('42')]})
  t.is(flow.draft().readings[0].value, '42')
  await flow.runAutosave()
  auth.user = {id: 'different-user'}
  flow.change({...flow.draft(), readings: [reading('99')]})
  t.is(flow.draft().readings[0].value, '42')
  t.true(button(flow.render(), 'Soumettre').props.disabled)
  t.deepEqual(flow.calls.map(call => call.action), ['save'])
})

test.serial('la fin tardive d’une sauvegarde après déconnexion ne recrée pas de journal', async t => {
  const pending = deferred()
  const userId = 'logout-in-flight'
  const first = interaction({userId, saveResult: () => pending.promise})
  first.change({...first.draft(), readings: [reading('42')]})
  const running = first.runAutosave()
  await settle()
  responseRecoveryHelpers.clearCampaignRecoveries()
  pending.resolve(successfulSave(first.calls[0].payload))
  await running
  first.unmount()
  await settle()
  const key = responseRecoveryHelpers.campaignRecoveryKey({
    userId, campaignId: 'campaign', preleveurUserId: 'represented-user', kind: 'INDEX'
  })
  t.is(responseRecoveryHelpers.readCampaignRecovery(key), null)
})

test('la soumission directe sauvegarde d’abord le dernier brouillon avec la version et le préleveur représenté', async t => {
  const flow = interaction()
  flow.change({...flow.draft(), readings: [reading('42')]})
  t.deepEqual(flow.calls, [])
  await button(flow.render(), 'Soumettre').props.onClick()
  t.deepEqual(flow.calls.map(call => call.action), ['save', 'submit'])
  t.is(flow.calls[0].payload.expectedVersion, 4)
  t.is(flow.calls[0].payload.data.readings[0].value, '42')
  t.false(Object.hasOwn(flow.calls[0].payload.data.readings[0], 'meterConfirmed'))
  t.is(flow.calls[1].payload.expectedVersion, 5)
  t.is(flow.calls[1].payload.idempotencyKey, 'test-transmission-key')
  t.true(flow.calls.every(call => call.id === 'campaign' && call.kind === 'INDEX' && call.payload.preleveurUserId === 'represented-user'))
  t.true(flow.html().includes('Votre réponse a bien été transmise.'))
})

test('la barre d’actions soumet la dernière modification sans étape de confirmation supplémentaire', async t => {
  const flow = interaction()
  flow.change({...flow.draft(), readings: [reading('42')]})
  t.false(button(flow.render(), 'Soumettre').props.disabled)
  flow.change({...flow.draft(), readings: [reading('43')]})
  t.false(button(flow.render(), 'Soumettre').props.disabled)
  t.notRegex(flow.html(), /Je confirme|Tant que|type="checkbox"/)
  t.true(flow.html().includes('Vous pourrez modifier votre réponse tant que la saisie est ouverte.'))
  t.deepEqual(flow.calls, [])
  await button(flow.render(), 'Soumettre').props.onClick()
  t.deepEqual(flow.calls.map(call => call.action), ['save', 'submit'])
  t.is(flow.calls[0].payload.data.readings[0].value, '43')
  t.deepEqual(flow.confirmations, [])
})

test('les besoins sont soumis directement après sauvegarde avec les mêmes droits, versions et préleveur', async t => {
  const flow = interaction({initialContext: responseContext('NEEDS'), responseKind: 'NEEDS'})
  flow.change(responseDraft(flow, 'NEEDS', '42.5'))
  t.false(button(flow.render(), 'Soumettre').props.disabled)
  await button(flow.render(), 'Soumettre').props.onClick()
  t.deepEqual(flow.calls.map(call => call.action), ['save', 'submit'])
  t.is(flow.calls[0].payload.expectedVersion, 4)
  t.deepEqual(flow.calls[0].payload.data.needs, [{targetId: 'point-a', periodId: 'needs', requestedVolume: '42.5'}])
  t.is(flow.calls[1].payload.expectedVersion, 5)
  t.is(flow.calls[1].payload.idempotencyKey, 'test-transmission-key')
  t.true(flow.calls.every(call => call.kind === 'NEEDS' && call.payload.preleveurUserId === 'represented-user'))
  t.deepEqual(flow.confirmations, [])
  t.true(flow.html().includes('Votre réponse a bien été transmise.'))
})

for (const kind of ['INDEX', 'NEEDS']) {
  test(`un double clic ${kind} sur le même callback ne double ni le flush ni la soumission`, async t => {
    const savingStarted = deferred()
    const saveCompletion = deferred()
    const submittingStarted = deferred()
    const submitCompletion = deferred()
    const flow = interaction({
      initialContext: responseContext(kind), responseKind: kind,
      async saveResult(id, responseKind, payload) {
        savingStarted.resolve()
        await saveCompletion.promise
        return successfulSave(payload)
      },
      async submitResult() {
        submittingStarted.resolve()
        await submitCompletion.promise
      }
    })
    flow.change(responseDraft(flow, kind, '42'))
    const submit = button(flow.render(), 'Soumettre').props.onClick
    const save = button(flow.render(), 'Enregistrer le brouillon').props.onClick
    const submitting = submit()
    await savingStarted.promise
    await submit()
    await save()
    t.true(button(flow.render(), 'Soumission…').props.disabled)
    t.deepEqual(flow.calls.map(call => call.action), ['save'])
    saveCompletion.resolve()
    await submittingStarted.promise
    await submit()
    await save()
    t.deepEqual(flow.calls.map(call => call.action), ['save', 'submit'])
    t.is(flow.calls[1].payload.expectedVersion, 5)
    t.is(flow.calls[1].kind, kind)
    submitCompletion.resolve()
    await submitting
    t.deepEqual(flow.calls.map(call => call.action), ['save', 'submit'])
    t.true(flow.html().includes('Votre réponse a bien été transmise.'))
  })

  test(`une valeur ${kind} invalide bloque aussi la soumission directe sans checkbox`, async t => {
    const flow = interaction({initialContext: responseContext(kind), responseKind: kind})
    flow.change(responseDraft(flow, kind, '-1'))
    t.true(button(flow.render(), 'Soumettre').props.disabled)
    await button(flow.render(), 'Soumettre').props.onClick()
    await flow.runAutosave()
    t.deepEqual(flow.calls, [])
  })
}

test('un échec de soumission conserve la saisie et autorise un nouvel essai sans fausse réussite', async t => {
  let failed = true
  const flow = interaction({
    submitResult: () => failed ? {success: false, code: 503, error: 'Service indisponible'} : undefined
  })
  flow.change({...flow.draft(), readings: [reading('42')]})
  await button(flow.render(), 'Soumettre').props.onClick()
  t.deepEqual(flow.calls.map(call => call.action), ['save', 'submit'])
  t.is(flow.draft().readings[0].value, '42')
  t.false(flow.html().includes('Votre réponse a bien été transmise.'))
  t.true(flow.html().includes('Service indisponible'))
  t.false(button(flow.render(), 'Soumettre').props.disabled)
  failed = false
  await button(flow.render(), 'Soumettre').props.onClick()
  t.deepEqual(flow.calls.map(call => call.action), ['save', 'submit', 'submit'])
  t.is(flow.calls[1].payload.idempotencyKey, flow.calls[2].payload.idempotencyKey)
  t.true(flow.html().includes('Votre réponse a bien été transmise.'))
})

test('la sauvegarde automatique reste un brouillon sans aucune transmission implicite', async t => {
  const flow = interaction()
  flow.change({...flow.draft(), readings: [reading('0')]})
  await flow.runAutosave()
  t.deepEqual(flow.calls.map(call => call.action), ['save'])
  t.is(flow.calls[0].payload.data.readings[0].value, '0')
  t.false(button(flow.render(), 'Soumettre').props.disabled)
})

const meterEvent = (extra = {}) => ({
  targetId: 'point-a', type: 'RESET', previousCompteurId: null, nextCompteurId: null,
  at: '2026-03-01', previousIndex: '120', nextIndex: '2', reason: 'Remise à zéro après intervention', ...extra
})

test('les problèmes de calcul sont transmis aux cartes et masqués tant que leur calcul est obsolète', async t => {
  const issue = {
    code: 'INVALID_METER_EVENT', targetId: 'point-a', compteurId: null, at: '2026-03-01'
  }
  const initialContext = baseContext()
  initialContext.calculation.issues = [issue]
  const flow = interaction({initialContext})
  t.deepEqual(flow.meterIssues(), [issue])
  flow.change({...flow.draft(), readings: [reading('42')]})
  t.deepEqual(flow.meterIssues(), [])
  await flow.runAutosave()
  t.deepEqual(flow.meterIssues(), [])
})

test('le détail des volumes calculés est retiré de la saisie sans supprimer les problèmes de calcul des cartes', t => {
  const issue = {
    code: 'INVALID_METER_EVENT', targetId: 'point-a', compteurId: null, at: '2026-03-01'
  }
  const initialContext = baseContext()
  initialContext.calculation = {
    totals: [{
      targetId: 'point-a', periodId: 'index', status: 'COMPLETE', value: '98765'
    }], issues: [issue]
  }
  const flow = interaction({initialContext})
  const html = flow.html()
  t.notRegex(html, /Voir les volumes calculés|Volumes prélevés|98765|Enregistrement automatique\./)
  t.deepEqual(flow.meterIssues(), [issue])
  t.deepEqual(initialContext.calculation.totals, [{
    targetId: 'point-a', periodId: 'index', status: 'COMPLETE', value: '98765'
  }])
  t.deepEqual(flow.calls, [])
})

for (const nested of [false, true]) {
  test(`les erreurs serveur ciblées persistent pendant une autre saisie puis disparaissent après correction (${nested})`, async t => {
    const issue = {
      code: 'METER_EVENT_AFTER_EXIT', targetId: 'point-a', compteurId: null, at: '2026-03-01', field: 'at', message: 'Ce compteur a déjà été remplacé.'
    }
    let attempt = 0
    const flow = interaction({
      async saveResult(id, kind, payload) {
        return ++attempt === 1 ? {
          success: false, code: 400, error: 'Date incorrecte', data: nested ? {data: {issues: [issue]}} : {issues: [issue]}
        } : successfulSave(payload)
      }
    })
    await t.throwsAsync(flow.saveMeterEvent({...flow.draft(), meterEvents: [meterEvent()]}), {message: 'Date incorrecte'})
    t.deepEqual(flow.meterIssues(), [issue])
    flow.change({...flow.draft(), comment: 'Une autre précision'})
    t.deepEqual(flow.meterIssues(), [issue])
    t.is(flow.draft().comment, 'Une autre précision')
    await flow.saveMeterEvent({...flow.draft(), meterEvents: [meterEvent({at: '2026-02-01'})]})
    t.deepEqual(flow.meterIssues(), [])
    t.is(flow.draft().comment, 'Une autre précision')
    t.deepEqual(flow.calls.map(call => call.action), ['save', 'save'])
  })
}

test('valider un changement enregistre immédiatement le brouillon et retourne sa version canonique sans transmettre', async t => {
  const started = deferred()
  const completion = deferred()
  const flow = interaction({
    async saveResult(id, kind, payload) {
      started.resolve()
      await completion.promise
      return successfulSave(payload)
    }
  })
  flow.pendingMeterEvent(true)
  const draft = {...flow.draft(), readings: [reading('42')], meterEvents: [meterEvent()]}
  const saving = flow.saveMeterEvent(draft)
  await started.promise
  t.is(flow.calls.length, 1)
  t.is(flow.calls[0].payload.expectedVersion, 4)
  t.is(flow.calls[0].payload.preleveurUserId, 'represented-user')
  t.deepEqual(flow.calls[0].payload.data, draft)
  t.true(button(flow.render(), 'Enregistrement…').props.disabled)
  t.true(button(flow.render(), 'Soumettre').props.disabled)
  t.false(flow.html().includes('Brouillon enregistré.'))
  completion.resolve()
  const result = await saving
  t.is(result.response.version, 5)
  t.deepEqual(result.response.draft, draft)
  t.deepEqual(flow.draft(), draft)
  t.true(flow.html().includes('Validez ou annulez le changement de compteur pour continuer.'))
  flow.pendingMeterEvent(false)
  await flow.runAutosave()
  t.deepEqual(flow.calls.map(call => call.action), ['save'])
  t.false(button(flow.render(), 'Enregistrer le brouillon').props.disabled)
  t.false(button(flow.render(), 'Soumettre').props.disabled)
})

test('un changement en cours de validation bloque les doubles sauvegardes et les anciens callbacks de transmission', async t => {
  const started = deferred()
  const completion = deferred()
  const flow = interaction({
    async saveResult(id, kind, payload) {
      started.resolve()
      await completion.promise
      return successfulSave(payload)
    }
  })
  const transmit = button(flow.render(), 'Soumettre').props.onClick
  const save = button(flow.render(), 'Enregistrer le brouillon').props.onClick
  const saveEvent = nodes(flow.render()).find(node => node.props?.onSaveMeterEvent).props.onSaveMeterEvent
  const draft = {...flow.draft(), meterEvents: [meterEvent()]}
  const saving = saveEvent(draft)
  await started.promise
  await t.throwsAsync(saveEvent({...draft, comment: 'Double clic'}), {message: /enregistrement est déjà en cours/})
  await save()
  await transmit()
  t.deepEqual(flow.calls.map(call => call.action), ['save'])
  t.not(flow.draft().comment, 'Double clic')
  completion.resolve()
  await saving
  await flow.runAutosave()
  t.deepEqual(flow.calls.map(call => call.action), ['save'])
})

test('la validation attend les sauvegardes précédentes et les nouvelles saisies sans perdre les valeurs', async t => {
  const started = [deferred(), deferred(), deferred()]
  const completions = [deferred(), deferred(), deferred()]
  const initialContext = baseContext()
  const targets = [{
    ...initialContext.targets[0], meterlessInitial: true, meters: [{compteurId: 'virtual-meter', pending: true, compteur: {serialNumber: 'Nouveau'}}]
  }]
  let saveIndex = 0
  const flow = interaction({
    initialContext,
    async saveResult(id, kind, payload) {
      const index = saveIndex++
      started[index].resolve()
      await completions[index].promise
      const saved = successfulSave(payload)
      if (payload.data.meterEvents.length > 0) {
        saved.data.targets = targets
        saved.data.response.draft.readings = payload.data.readings.map(reading => ({...reading, compteurId: 'virtual-meter'}))
      }

      return saved
    }
  })
  flow.change({...flow.draft(), readings: [reading('100')]})
  const autosaving = flow.runAutosave()
  await started[0].promise
  const saving = flow.saveMeterEvent({...flow.draft(), meterEvents: [meterEvent({type: 'REPLACEMENT', nextCompteurId: undefined, nextMeter: {serialNumber: 'Nouveau'}})]})
  flow.change({...flow.draft(), readings: [reading('101')]})
  completions[0].resolve()
  await started[1].promise
  t.is(flow.draft().readings[0].value, '101')
  t.is(flow.draft().readings[0].compteurId, null)
  flow.change({...flow.draft(), readings: [reading('102')], comment: 'Dernière précision'})
  completions[1].resolve()
  await started[2].promise
  t.is(flow.draft().readings[0].value, '102')
  t.is(flow.draft().readings[0].compteurId, null)
  completions[2].resolve()
  const [result] = await Promise.all([saving, autosaving])
  t.is(result.response.version, 7)
  t.deepEqual(result.targets, targets)
  t.is(flow.draft().readings[0].value, '102')
  t.is(flow.draft().readings[0].compteurId, 'virtual-meter')
  t.is(flow.draft().comment, 'Dernière précision')
  t.deepEqual(flow.calls.map(call => call.payload.expectedVersion), [4, 5, 6])
  t.deepEqual(flow.calls.map(call => call.payload.data.readings[0].value), ['100', '101', '102'])
  await flow.runAutosave()
  t.is(flow.calls.length, 3)
})

test('le marqueur de modification conserve l’ancienne identification pendant les sauvegardes concurrentes', async t => {
  const original = meterEvent({type: 'REPLACEMENT', nextCompteurId: 'virtual-old', nextMeter: {serialNumber: 'Ancien numéro'}})
  const previousEvent = {at: original.at, previousCompteurId: original.previousCompteurId, nextMeter: original.nextMeter}
  const corrected = {...original, nextMeter: {serialNumber: 'Numéro corrigé'}, previousEvent}
  const initialContext = baseContext()
  initialContext.responses.INDEX.draft = {readings: [{...reading('100'), compteurId: 'virtual-old'}], meterEvents: [original]}
  const started = [deferred(), deferred()]
  const completions = [deferred(), deferred()]
  let saveIndex = 0
  const flow = interaction({
    initialContext,
    async saveResult(id, kind, payload) {
      const index = saveIndex++
      started[index].resolve()
      await completions[index].promise
      const saved = successfulSave(payload)
      const {previousEvent, ...normalized} = payload.data.meterEvents[0]
      saved.data.response.draft = {
        ...payload.data,
        meterEvents: [{...normalized, nextCompteurId: 'virtual-new'}],
        readings: payload.data.readings.map(reading => ({...reading, compteurId: 'virtual-new'}))
      }
      return saved
    }
  })
  const saving = flow.saveMeterEvent({...flow.draft(), meterEvents: [corrected]})
  await started[0].promise
  flow.change({...flow.draft(), readings: [{...reading('101'), compteurId: 'virtual-old'}]})
  completions[0].resolve()
  await started[1].promise
  t.deepEqual(flow.calls[1].payload.data.meterEvents[0].previousEvent, previousEvent)
  t.is(flow.calls[1].payload.data.readings[0].compteurId, 'virtual-old')
  t.is(flow.draft().readings[0].value, '101')
  completions[1].resolve()
  const result = await saving
  t.false(Object.hasOwn(result.response.draft.meterEvents[0], 'previousEvent'))
  t.false(Object.hasOwn(flow.draft().meterEvents[0], 'previousEvent'))
  t.is(flow.draft().meterEvents[0].nextMeter.serialNumber, 'Numéro corrigé')
  t.is(flow.draft().readings[0].compteurId, 'virtual-new')
  t.is(flow.draft().readings[0].value, '101')
  t.deepEqual(flow.calls.map(call => call.payload.expectedVersion), [4, 5])
})

for (const code of [503, 409]) {
  test(`l’échec ${code} de validation est propagé à l’éditeur sans fermer sa garde ni annoncer un succès`, async t => {
    const flow = interaction({saveResult: {success: false, code, error: 'Sauvegarde refusée'}})
    flow.pendingMeterEvent(true)
    const draft = {...flow.draft(), readings: [reading('42')], meterEvents: [meterEvent()]}
    const saveEvent = nodes(flow.render()).find(node => node.props?.onSaveMeterEvent).props.onSaveMeterEvent
    await t.throwsAsync(saveEvent(draft), {message: 'Sauvegarde refusée', code})
    t.deepEqual(flow.draft(), draft)
    t.true(flow.beforeUnload().prevented)
    t.true(flow.html().includes('Validez ou annulez le changement de compteur pour continuer.'))
    t.false(flow.html().includes('Brouillon enregistré.'))
    t.true(button(flow.render(), 'Enregistrer le brouillon').props.disabled)
    if (code === 409) {
      await t.throwsAsync(saveEvent({...draft, comment: 'Ancien callback'}), {message: 'Vous ne pouvez pas modifier cette réponse.'})
      t.not(flow.draft().comment, 'Ancien callback')
    }

    await flow.runAutosave()
    t.deepEqual(flow.calls.map(call => call.action), ['save'])
  })
}

for (const isEditing of [false, true]) {
  test(`après un échec annuler ${isEditing ? 'la modification' : 'l’ajout'} restaure le brouillon sans effacer les autres saisies`, async t => {
    let attempt = 0
    const flow = interaction({
      async saveResult(id, kind, payload) {
        return ++attempt === 1 ? {success: false, code: 503, error: 'Réseau indisponible'} : successfulSave(payload)
      }
    })
    const original = isEditing ? [meterEvent()] : []
    flow.change({...flow.draft(), readings: [reading('100')], meterEvents: original})
    flow.pendingMeterEvent(true)
    const candidate = meterEvent({previousIndex: '130'})
    await t.throwsAsync(flow.saveMeterEvent({...flow.draft(), meterEvents: [candidate]}))
    flow.change({...flow.draft(), readings: [reading('101')], comment: 'Note conservée'})
    // The editor restores only its attempted event in the latest draft before closing.
    flow.change({...flow.draft(), meterEvents: original})
    flow.pendingMeterEvent(false)
    await flow.runAutosave()
    t.deepEqual(flow.calls[1].payload.data.meterEvents, original)
    t.is(flow.calls[1].payload.data.readings[0].value, '101')
    t.is(flow.draft().comment, 'Note conservée')
    t.deepEqual(flow.draft().meterEvents, original)
    t.deepEqual(flow.calls.map(call => call.action), ['save', 'save'])
    t.false(flow.beforeUnload().prevented)
  })
}

test('la sauvegarde immédiate respecte la lecture seule et le périmètre du collecteur partiel', async t => {
  await Promise.all([{canEdit: false}, {editableTargetIds: []}].map(async permissions => {
    const readOnly = interaction({initialContext: baseContext(permissions)})
    await t.throwsAsync(readOnly.saveMeterEvent({...readOnly.draft(), meterEvents: [meterEvent()]}), {message: 'Vous ne pouvez pas modifier cette réponse.'})
    t.deepEqual(readOnly.calls, [])
  }))

  const initialContext = baseContext({canSubmit: false})
  initialContext.targets.push({id: 'point-b', meters: []})
  const partial = interaction({initialContext})
  await partial.saveMeterEvent({
    ...partial.draft(), comment: 'Non autorisé', readings: [reading('42'), {...reading('100'), targetId: 'point-b'}], meterEvents: [meterEvent(), meterEvent({targetId: 'point-b'})]
  })
  const saved = partial.calls[0].payload.data
  t.deepEqual(saved.meterEvents, [meterEvent()])
  t.deepEqual(saved.readings, [reading('42')])
  t.false(Object.hasOwn(saved, 'comment'))
  t.falsy(button(partial.render(), 'Soumettre'))
})

test('le retour manuel reste près des actions et confirme aussi un brouillon déjà autosauvegardé', async t => {
  const flow = interaction()
  const initialFeedback = draftFeedback(flow.render())
  t.truthy(initialFeedback)
  t.is(initialFeedback.props['aria-atomic'], 'true')
  t.is(content(initialFeedback), '')
  flow.change({...flow.draft(), readings: [reading('42')]})
  await flow.runAutosave()
  t.is(content(draftFeedback(flow.render())), '')
  t.deepEqual(flow.calls.map(call => call.action), ['save'])
  await button(flow.render(), 'Enregistrer le brouillon').props.onClick()
  const savedFeedback = draftFeedback(flow.render())
  t.is(savedFeedback.type, initialFeedback.type)
  t.is(savedFeedback.key, initialFeedback.key)
  t.is(content(savedFeedback), 'Brouillon enregistré.')
  t.true(nodes(savedFeedback).some(node => node.props?.className?.includes('fr-valid-text')))
  t.is(flow.calls.length, 1)
  const firstAnnouncement = nodes(savedFeedback).find(node => node.key !== null)
  t.truthy(firstAnnouncement)
  await button(flow.render(), 'Enregistrer le brouillon').props.onClick()
  const nextFeedback = draftFeedback(flow.render())
  const nextAnnouncement = nodes(nextFeedback).find(node => node.key !== null)
  t.is(content(nextFeedback), 'Brouillon enregistré.')
  t.not(nextAnnouncement.key, firstAnnouncement.key)
  t.is(flow.calls.length, 1)
})

test('le clic manuel attend la sauvegarde et bloque le double clic et la transmission par des callbacks antérieurs', async t => {
  const started = deferred()
  const completion = deferred()
  const flow = interaction({
    async saveResult(id, kind, payload) {
      started.resolve()
      await completion.promise
      return successfulSave(payload)
    }
  })
  flow.change({...flow.draft(), readings: [reading('42')]})
  const save = button(flow.render(), 'Enregistrer le brouillon').props.onClick
  const transmit = button(flow.render(), 'Soumettre').props.onClick
  const saving = save()
  await started.promise
  t.true(button(flow.render(), 'Enregistrement…').props.disabled)
  t.true(button(flow.render(), 'Soumettre').props.disabled)
  t.is(content(draftFeedback(flow.render())), 'Enregistrement en cours…')
  t.false(flow.html().includes('Brouillon enregistré.'))
  await save()
  await transmit()
  t.deepEqual(flow.calls.map(call => call.action), ['save'])
  completion.resolve()
  await saving
  t.is(content(draftFeedback(flow.render())), 'Brouillon enregistré.')
  t.false(button(flow.render(), 'Enregistrer le brouillon').props.disabled)
  t.false(button(flow.render(), 'Soumettre').props.disabled)
  t.deepEqual(flow.calls.map(call => call.action), ['save'])
})

test('le clic manuel attend aussi une autosauvegarde déjà en cours sans dupliquer l’écriture', async t => {
  const started = deferred()
  const completion = deferred()
  const flow = interaction({
    async saveResult(id, kind, payload) {
      started.resolve()
      await completion.promise
      return successfulSave(payload)
    }
  })
  flow.change({...flow.draft(), readings: [reading('42')]})
  const autosaving = flow.runAutosave()
  await started.promise
  t.is(content(draftFeedback(flow.render())), '')
  const saving = button(flow.render(), 'Enregistrer le brouillon').props.onClick()
  t.is(content(draftFeedback(flow.render())), 'Enregistrement en cours…')
  completion.resolve()
  await Promise.all([autosaving, saving])
  t.is(content(draftFeedback(flow.render())), 'Brouillon enregistré.')
  t.deepEqual(flow.calls.map(call => call.action), ['save'])
})

for (const {code, message} of [
  {code: 503, message: 'L’enregistrement du brouillon a échoué. Votre saisie reste dans cette page.'},
  {code: 409, message: 'Ce brouillon a été modifié ailleurs. Rechargez les données enregistrées.'}
]) {
  test(`le retour manuel signale l’erreur ${code} sans annoncer de succès ni perdre la saisie`, async t => {
    const flow = interaction({saveResult: {success: false, code, error: 'Sauvegarde refusée'}})
    flow.change({...flow.draft(), readings: [reading('42')]})
    await button(flow.render(), 'Enregistrer le brouillon').props.onClick()
    t.is(content(draftFeedback(flow.render())), message)
    t.false(flow.html().includes('Brouillon enregistré.'))
    t.is(flow.draft().readings[0].value, '42')
    t.is(button(flow.render(), 'Enregistrer le brouillon').props.disabled, code === 409)
    t.deepEqual(flow.calls.map(call => call.action), ['save'])
  })
}

test('un nouvel essai manuel réussi efface l’ancienne erreur et confirme le brouillon', async t => {
  let attempts = 0
  const flow = interaction({
    async saveResult(id, kind, payload) {
      attempts++
      return attempts === 1 ? {success: false, error: 'Réseau indisponible'} : successfulSave(payload)
    }
  })
  flow.change({...flow.draft(), readings: [reading('42')]})
  await button(flow.render(), 'Enregistrer le brouillon').props.onClick()
  t.true(flow.html().includes('Réseau indisponible'))
  await button(flow.render(), 'Enregistrer le brouillon').props.onClick()
  t.is(content(draftFeedback(flow.render())), 'Brouillon enregistré.')
  t.false(flow.html().includes('Réseau indisponible'))
  t.false(flow.html().includes('L’enregistrement du brouillon a échoué.'))
  t.is(flow.draft().readings[0].value, '42')
  t.is(attempts, 2)
})

test('le premier clic crée un brouillon même sans saisie préalable ni réponse existante', async t => {
  const initialContext = baseContext()
  initialContext.responses = {}
  const flow = interaction({initialContext})
  await button(flow.render(), 'Enregistrer le brouillon').props.onClick()
  t.deepEqual(flow.calls.map(call => call.action), ['save'])
  t.is(flow.calls[0].payload.expectedVersion, 0)
  t.is(content(draftFeedback(flow.render())), 'Brouillon enregistré.')
})

test('le clic manuel recrée un brouillon depuis une réponse transmise même sans modification', async t => {
  const flow = interaction({initialContext: baseContext({status: 'SUBMITTED'})})
  await button(flow.render(), 'Enregistrer le brouillon').props.onClick()
  t.deepEqual(flow.calls.map(call => call.action), ['save'])
  t.is(flow.calls[0].payload.expectedVersion, 4)
  t.is(flow.context().responses.INDEX.status, 'DRAFT')
  t.is(content(draftFeedback(flow.render())), 'Brouillon enregistré.')
})

test('le brouillon des besoins en eau bénéficie du même retour manuel que les relevés', async t => {
  const initialContext = baseContext()
  initialContext.campaign.periods = [{
    id: 'needs', kind: 'NEEDS', startDate: '2026-06-01', endDate: '2026-09-01'
  }]
  initialContext.responses = {NEEDS: {...initialContext.responses.INDEX, draft: {needs: []}}}
  const flow = interaction({initialContext, responseKind: 'NEEDS'})
  flow.change({...flow.draft(), needs: [{targetId: 'point-a', periodId: 'needs', requestedVolume: '120'}]})
  await flow.runAutosave()
  t.is(content(draftFeedback(flow.render())), '')
  await button(flow.render(), 'Enregistrer le brouillon').props.onClick()
  t.is(content(draftFeedback(flow.render())), 'Brouillon enregistré.')
  t.deepEqual(flow.calls.map(call => call.action), ['save'])
  t.is(flow.calls[0].kind, 'NEEDS')
  t.is(flow.calls[0].payload.data.needs[0].requestedVolume, '120')
})

test('une nouvelle saisie pendant l’enregistrement invalide le retour manuel sans perdre la dernière valeur', async t => {
  const started = deferred()
  const completion = deferred()
  const flow = interaction({
    async saveResult(id, kind, payload) {
      started.resolve()
      await completion.promise
      return successfulSave(payload)
    }
  })
  flow.change({...flow.draft(), readings: [reading('42')]})
  const saving = button(flow.render(), 'Enregistrer le brouillon').props.onClick()
  await started.promise
  flow.change({...flow.draft(), readings: [reading('43')]})
  t.is(content(draftFeedback(flow.render())), '')
  completion.resolve()
  await saving
  t.is(content(draftFeedback(flow.render())), '')
  t.is(flow.draft().readings[0].value, '43')
  t.deepEqual(flow.calls.map(call => call.payload.data.readings[0].value), ['42', '43'])
  t.deepEqual(flow.calls.map(call => call.payload.expectedVersion), [4, 5])
  t.false(button(flow.render(), 'Enregistrer le brouillon').props.disabled)
})

test('ouvrir un changement de compteur pendant l’enregistrement empêche une confirmation devenue trompeuse', async t => {
  const started = deferred()
  const completion = deferred()
  const flow = interaction({
    async saveResult(id, kind, payload) {
      started.resolve()
      await completion.promise
      return successfulSave(payload)
    }
  })
  flow.change({...flow.draft(), readings: [reading('42')]})
  const saving = button(flow.render(), 'Enregistrer le brouillon').props.onClick()
  await started.promise
  flow.pendingMeterEvent(true)
  t.is(content(draftFeedback(flow.render())), '')
  completion.resolve()
  await saving
  t.is(content(draftFeedback(flow.render())), '')
  t.false(flow.html().includes('Brouillon enregistré.'))
  t.true(button(flow.render(), 'Enregistrer le brouillon').props.disabled)
  flow.pendingMeterEvent(false)
  t.false(button(flow.render(), 'Enregistrer le brouillon').props.disabled)
  t.is(content(draftFeedback(flow.render())), '')
})

test('le retour de succès disparaît à la prochaine saisie ou à l’ouverture d’un changement de compteur', async t => {
  const flow = interaction()
  await button(flow.render(), 'Enregistrer le brouillon').props.onClick()
  t.is(content(draftFeedback(flow.render())), 'Brouillon enregistré.')
  flow.change({...flow.draft(), readings: [reading('42')]})
  t.is(content(draftFeedback(flow.render())), '')
  await flow.runAutosave()
  t.is(content(draftFeedback(flow.render())), '')
  await button(flow.render(), 'Enregistrer le brouillon').props.onClick()
  t.is(content(draftFeedback(flow.render())), 'Brouillon enregistré.')
  flow.pendingMeterEvent(true)
  t.is(content(draftFeedback(flow.render())), '')
})

test('transmettre efface le retour de sauvegarde manuelle sans annoncer une seconde sauvegarde', async t => {
  const flow = interaction()
  flow.change({...flow.draft(), readings: [reading('42')]})
  await button(flow.render(), 'Enregistrer le brouillon').props.onClick()
  t.is(content(draftFeedback(flow.render())), 'Brouillon enregistré.')
  await button(flow.render(), 'Soumettre').props.onClick()
  t.is(content(draftFeedback(flow.render())), '')
  t.false(flow.html().includes('Brouillon enregistré.'))
  t.true(flow.html().includes('Votre réponse a bien été transmise.'))
  t.deepEqual(flow.calls.map(call => call.action), ['save', 'submit'])
})

test('les changements ouverts sur plusieurs points doivent tous être ajoutés ou annulés', async t => {
  const flow = interaction()
  flow.pendingMeterEvent(true, 'point-a')
  flow.pendingMeterEvent(true, 'point-b')
  flow.pendingMeterEvent(false, 'point-a')
  t.true(button(flow.render(), 'Enregistrer le brouillon').props.disabled)
  await button(flow.render(), 'Soumettre').props.onClick()
  t.deepEqual(flow.calls, [])
  flow.pendingMeterEvent(false, 'point-b')
  t.false(button(flow.render(), 'Enregistrer le brouillon').props.disabled)
  t.false(button(flow.render(), 'Soumettre').props.disabled)
})

test('l’autosauvegarde ajoute les compteurs virtuels à la grille sans remplacer les saisies locales', async t => {
  const initialContext = baseContext()
  initialContext.targets[0].meters = [{compteurId: 'old-meter', compteur: {serialNumber: 'Ancien'}}]
  const targets = [{
    ...initialContext.targets[0], meters: [...initialContext.targets[0].meters, {
      compteurId: 'virtual-meter', compteur: {serialNumber: 'Nouveau'}, pending: true,
      pendingEvent: {previousCompteurId: 'old-meter', at: '2026-03-01'}, startDate: '2026-03-01'
    }]
  }]
  const event = {
    targetId: 'point-a', type: 'REPLACEMENT', previousCompteurId: 'old-meter', at: '2026-03-01',
    previousIndex: '20', nextIndex: '0', reason: 'Compteur remplacé', nextMeter: {serialNumber: 'Nouveau'}
  }
  const flow = interaction({
    initialContext, saveResult: {
      success: true, data: {
        response: {...initialContext.responses.INDEX, version: 5, draft: {readings: [], meterEvents: [event]}},
        calculation: {totals: []}, targets
      }
    }
  })
  flow.change({...flow.draft(), meterEvents: [event], comment: 'Mon commentaire conservé'})
  await flow.runAutosave()
  t.deepEqual(flow.context().targets, targets)
  t.is(flow.draft().comment, 'Mon commentaire conservé')
  t.deepEqual(flow.draft().meterEvents[0].nextMeter, {serialNumber: 'Nouveau'})
  t.deepEqual(flow.calls.map(call => call.action), ['save'])
})

test('sans inventaire le remplacement reste complet après autosauvegarde et réouverture du brouillon', async t => {
  const initialContext = baseContext()
  const event = {
    targetId: 'point-a', type: 'REPLACEMENT', previousCompteurId: null, at: '2026-03-01',
    previousIndex: '120', nextIndex: '2', reason: 'Compteur remplacé', nextMeter: {serialNumber: 'SN-NOUVEAU'}
  }
  const initialReading = {...reading('100'), readingDate: '2025-11-01'}
  const targets = [{
    ...initialContext.targets[0], meterlessInitial: true, meterlessEndDate: null, meters: [{
      compteurId: 'virtual-meter', compteur: {serialNumber: 'SN-NOUVEAU'}, pending: true,
      pendingEvent: {previousCompteurId: null, at: event.at}, startDate: event.at
    }]
  }]
  const flow = interaction({
    initialContext,
    saveResult: (id, kind, payload) => ({...successfulSave(payload), data: {...successfulSave(payload).data, targets}})
  })
  flow.change({...flow.draft(), readings: [initialReading], meterEvents: [event]})
  await flow.runAutosave()
  t.deepEqual(flow.context().targets, targets)
  t.deepEqual(flow.draft().readings, [initialReading])
  for (const html of [flow.html(), interaction({initialContext: {...flow.context(), responses: {INDEX: {...flow.context().responses.INDEX, draft: flow.draft()}}}}).html()]) {
    t.true(html.includes('value="100"'))
    t.true(html.includes('SN-NOUVEAU'))
    t.true(html.includes('Index au 1 juin 2026 (m³) · SN-NOUVEAU'))
    t.notRegex(html, /J’ai indiqué tous les remplacements|Aucun remplacement ni remise à zéro|Hors changements déclarés/)
    t.true(html.includes('Déclarer un autre changement de compteur'))
    t.notRegex(html, /conservez votre brouillon|sans remplacement ni remise à zéro/)
  }

  t.is(flow.calls[0].payload.data.meterEvents[0].previousCompteurId, null)
})

test('la réattribution canonique attend la fin des éditions concurrentes sans perdre la nouvelle valeur', async t => {
  const initialContext = baseContext()
  const event = {
    targetId: 'point-a', type: 'REPLACEMENT', previousCompteurId: null, at: '2026-03-01',
    previousIndex: '120', nextIndex: '2', reason: 'Compteur remplacé', nextMeter: {serialNumber: 'SN-NOUVEAU'}, reassignFollowingReadings: true
  }
  const targets = [{
    ...initialContext.targets[0], meterlessInitial: true, meterlessEndDate: null, meters: [{
      compteurId: 'virtual-meter', pending: true, pendingEvent: {previousCompteurId: null, at: event.at}, startDate: event.at, compteur: {serialNumber: 'SN-NOUVEAU'}
    }]
  }]
  const started = [deferred(), deferred()]
  const completions = [deferred(), deferred()]
  let saveIndex = 0
  const flow = interaction({
    initialContext, async saveResult(id, kind, payload) {
      const index = saveIndex++
      started[index].resolve()
      await completions[index].promise
      const saved = successfulSave(payload)
      saved.data.targets = targets
      saved.data.response.draft = {
        ...payload.data, readings: payload.data.readings.map(reading => ({...reading, compteurId: 'virtual-meter'})),
        meterEvents: payload.data.meterEvents.map(({reassignFollowingReadings, ...event}) => event)
      }
      return saved
    }
  })
  flow.change({...flow.draft(), readings: [reading('100')], meterEvents: [event]})
  const saving = flow.runAutosave()
  await started[0].promise
  flow.change({...flow.draft(), readings: [reading('101')], comment: 'Nouvelle précision'})
  completions[0].resolve()
  await started[1].promise
  t.is(flow.draft().readings[0].value, '101')
  t.is(flow.draft().readings[0].compteurId, null)
  t.is(flow.draft().comment, 'Nouvelle précision')
  completions[1].resolve()
  await saving
  t.is(flow.draft().readings[0].value, '101')
  t.is(flow.draft().readings[0].compteurId, 'virtual-meter')
  t.is(flow.draft().comment, 'Nouvelle précision')
  t.falsy(flow.draft().meterEvents[0].reassignFollowingReadings)
  t.is(flow.calls.length, 2)
  t.true(flow.html().includes('value="101"'))
})

test('la lecture seule bloque aussi le callback de saisie et ne propose aucune action de mutation', async t => {
  const flow = interaction({initialContext: baseContext({canEdit: false, canSubmit: false, editableTargetIds: []})})
  flow.change({...flow.draft(), readings: [reading('42')]})
  await flow.runAutosave()
  t.deepEqual(flow.calls, [])
  t.deepEqual(flow.draft().readings, [])
  t.falsy(button(flow.render(), 'Enregistrer le brouillon'))
  t.falsy(button(flow.render(), 'Soumettre'))
})

test('le collecteur partiel conserve une sauvegarde restreinte et aucun bouton de transmission', async t => {
  const initialContext = baseContext({canSubmit: false})
  initialContext.targets.push({id: 'point-b', pointPrelevement: {name: 'Forage B'}, meters: []})
  const flow = interaction({initialContext})
  flow.change({...flow.draft(), readings: [reading('42'), {...reading('99'), targetId: 'point-b'}]})
  await button(flow.render(), 'Enregistrer le brouillon').props.onClick()
  t.is(flow.calls.length, 1)
  t.deepEqual(flow.calls[0].payload.data.readings.map(row => row.targetId), ['point-a'])
  t.falsy(button(flow.render(), 'Soumettre'))
})

test('un conflit pendant le flush interdit la transmission et conserve les valeurs visibles', async t => {
  const flow = interaction({saveResult: {success: false, code: 409, error: 'Version dépassée'}})
  flow.change({...flow.draft(), readings: [reading('42')]})
  await button(flow.render(), 'Soumettre').props.onClick()
  t.deepEqual(flow.calls.map(call => call.action), ['save'])
  t.is(flow.draft().readings[0].value, '42')
  t.true(button(flow.render(), 'Soumettre').props.disabled)
  t.true(flow.html().includes('Cette réponse a été modifiée entre-temps.'))
})

test('un changement de compteur non ajouté bloque sauvegarde et soumission, même via des callbacks antérieurs', async t => {
  const flow = interaction()
  const transmit = button(flow.render(), 'Soumettre').props.onClick
  const save = button(flow.render(), 'Enregistrer le brouillon').props.onClick
  flow.pendingMeterEvent(true)
  t.falsy(nodes(flow.render()).find(node => node.type === 'input' && node.props.type === 'checkbox'))
  t.true(button(flow.render(), 'Soumettre').props.disabled)
  t.true(button(flow.render(), 'Enregistrer le brouillon').props.disabled)
  await transmit()
  await save()
  t.deepEqual(flow.calls, [])
  t.true(flow.html().includes('Validez ou annulez le changement de compteur pour continuer.'))
})

test('annuler le changement rend la soumission disponible sans transmettre implicitement', async t => {
  const flow = interaction()
  flow.pendingMeterEvent(true)
  flow.pendingMeterEvent(false)
  t.false(button(flow.render(), 'Enregistrer le brouillon').props.disabled)
  t.false(button(flow.render(), 'Soumettre').props.disabled)
  t.false(flow.html().includes('Validez ou annulez le changement de compteur pour continuer.'))
  t.deepEqual(flow.calls, [])
  await button(flow.render(), 'Soumettre').props.onClick()
  t.deepEqual(flow.calls.map(call => call.action), ['submit'])
})

test('après ajout explicite, le changement est sauvegardé avant transmission et ses index inconnus restent null', async t => {
  const flow = interaction()
  const event = {
    targetId: 'point-a', type: 'RESET', at: '2026-03-12', previousCompteurId: 'meter-a', nextCompteurId: 'meter-a', previousIndex: null, nextIndex: '0', reason: 'Index avant intervention illisible'
  }
  flow.pendingMeterEvent(true)
  flow.change({...flow.draft(), meterEvents: [event]})
  flow.pendingMeterEvent(false)
  await button(flow.render(), 'Soumettre').props.onClick()
  t.deepEqual(flow.calls.map(call => call.action), ['save', 'submit'])
  t.deepEqual(flow.calls[0].payload.data.meterEvents, [event])
  t.is(flow.calls[1].payload.expectedVersion, 5)
})

test('la navigation protège aussi un changement local absent de la file de sauvegarde', t => {
  const flow = interaction()
  flow.render()
  t.false(flow.beforeUnload().prevented)
  flow.pendingMeterEvent(true)
  const unload = flow.beforeUnload()
  t.true(unload.prevented)
  t.is(unload.returnValue, '')
  const navigate = flow.navigate()
  t.true(navigate.prevented)
  t.true(navigate.stopped)
  t.is(flow.confirmations.length, 1)
  t.deepEqual(flow.calls, [])
  flow.pendingMeterEvent(false)
  t.false(flow.beforeUnload().prevented)
  t.false(flow.navigate().prevented)
})

test('changer de préleveur exige aussi une confirmation pour un événement non ajouté', t => {
  const initialContext = baseContext()
  initialContext.availablePreleveurs = [{userId: 'represented-user', label: 'Exploitation A'}, {userId: 'other-user', label: 'Exploitation B'}]
  const flow = interaction({initialContext})
  flow.pendingMeterEvent(true)
  nodes(flow.render()).find(node => node.props?.label === 'Répondre pour').props.onChange('other-user')
  t.is(flow.navigation.href, '')
  t.is(flow.confirmations.length, 1)
  flow.pendingMeterEvent(false)
  nodes(flow.render()).find(node => node.props?.label === 'Répondre pour').props.onChange('other-user')
  t.is(flow.navigation.href, '?preleveurUserId=other-user')
})

test('le rechargement après erreur prévient avant de perdre un changement de compteur local', async t => {
  const flow = interaction({saveResult: {success: false, error: 'Réseau indisponible'}})
  flow.change({...flow.draft(), readings: [reading('42')]})
  await flow.runAutosave()
  flow.pendingMeterEvent(true)
  await button(flow.render(), 'Recharger les données enregistrées').props.onClick()
  t.is(flow.navigation.reloadCount, 0)
  t.true(flow.confirmations.some(message => message.includes('Recharger abandonnera')))
})
