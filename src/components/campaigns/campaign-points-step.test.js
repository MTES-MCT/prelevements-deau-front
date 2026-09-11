import React from 'react'

import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {runInNewContext} from 'node:vm'

import test from 'ava'
import {transformSync} from 'next/dist/build/swc/index.js'
import {renderToStaticMarkup} from 'react-dom/server'

import * as pointHelpers from '../../lib/campaign-point-selection.js'
import * as campaignHelpers from '../../lib/collection-campaigns.js'
import * as waterHelpers from '../../lib/water-uses.js'

const require = createRequire(import.meta.url)
const loaded = new Map()
const loadComponent = (name, overrides = {}) => {
  const useCache = Object.keys(overrides).length === 0
  if (useCache && loaded.has(name)) {
    return loaded.get(name)
  }

  const filename = new URL(`${name}.js`, import.meta.url)
  const {code} = transformSync(readFileSync(filename, 'utf8'), {filename: filename.pathname, jsc: {parser: {syntax: 'ecmascript', jsx: true}, transform: {react: {runtime: 'automatic'}}, target: 'es2022'}, module: {type: 'commonjs'}})
  const compiledModule = {exports: {}}
  const componentRequire = specifier => {
    if (Object.hasOwn(overrides, specifier)) {
      return overrides[specifier]
    }

    if (specifier === '@/lib/collection-campaigns.js') {
      return campaignHelpers
    }

    if (specifier === '@/lib/campaign-point-selection.js') {
      return pointHelpers
    }

    if (specifier === '@/lib/water-uses.js') {
      return waterHelpers
    }

    if (specifier.startsWith('@/components/campaigns/')) {
      return loadComponent(specifier.split('/').at(-1).replace('.js', ''), overrides)
    }

    if (specifier === '@/server/actions/campaigns.js') {
      return new Proxy({}, {
        get: () => () => {
          throw new Error('Aucun appel réseau pendant le rendu')
        }
      })
    }

    if (specifier === 'next/link') {
      return function Link({children, ...props}) {
        return React.createElement('a', props, children)
      }
    }

    return require(specifier)
  }

  runInNewContext('(function(require, module, exports) {' + code + '\n})', {})(componentRequire, compiledModule, compiledModule.exports)
  if (useCache) {
    loaded.set(name, compiledModule.exports)
  }

  return compiledModule.exports
}

const visible = {
  id: 'a', pointPrelevementId: 'p-a', pointPrelevement: {id: 'p-a', name: 'Point visible', collectionMode: 'MANUAL'}, preleveur: {socialReason: 'EARL des prés'}, usage: {id: 'irrigation', name: 'Irrigation', code: '2'}
}
const outside = {
  id: 'outside', pointPrelevementId: 'p-outside', pointPrelevement: {id: 'p-outside', name: 'Point conservé', collectionMode: 'MANUAL'}, preleveur: {socialReason: 'Entreprise hors filtre'}, usage: {id: 'industry', name: 'Industrie', code: '4'}
}
const drinkingWater = {id: 'drinking', name: 'Alimentation en eau potable', code: '5'}
const props = () => ({
  form: {zoneId: 'zone', ownerCollecteurUserId: 'owner', targets: []},
  options: {exploitations: [visible], usages: [visible.usage, outside.usage, drinkingWater], pagination: {total: 1, hasMore: false}},
  knownTargets: new Map([['a', visible], ['outside', outside]]), query: '', setQuery() {}, usageId: '', setUsageId() {}, loadingOptions: false, update() {}
})
const render = initial => renderToStaticMarkup(React.createElement(loadComponent('campaign-points-step').default, initial))
const descendants = element => [element, ...React.Children.toArray(element?.props?.children).flatMap(child => descendants(child))]

test('les usages, la recherche de préleveur et les commandes groupées sont visibles', t => {
  const html = render(props())
  t.true(html.includes('Rechercher un point ou un préleveur'))
  t.true(html.includes('Filtrer par usage'))
  t.true(html.includes('Tous les usages'))
  t.true(html.includes('EARL des prés'))
  t.true(html.includes('Irrigation'))
  t.true(html.includes('Sélectionner tous les résultats'))
  t.true(html.includes('Désélectionner les résultats'))
  t.true(html.includes('>Tout sélectionner</button>'))
  t.true(html.includes('>Tout désélectionner</button>'))
  t.regex(html, /role="group" aria-label="Points de prélèvement trouvés"/)
})

test('les filtres natifs conservent des libellés associés et les valeurs de recherche', t => {
  const initial = props()
  initial.query = 'Moulin'
  initial.usageId = 'irrigation'
  const html = render(initial)
  const searchLabel = /<label[^>]*for="([^"]+)"[^>]*>Rechercher un point ou un préleveur<\/label>/.exec(html)
  const usageLabel = /<label[^>]*for="([^"]+)"[^>]*>Filtrer par usage<\/label>/.exec(html)
  t.truthy(searchLabel)
  t.truthy(usageLabel)
  const search = html.match(/<input\b[^>]*>/g)?.find(tag => tag.includes(`id="${searchLabel?.[1]}"`)) || ''
  const select = html.match(/<select\b[^>]*>/g)?.find(tag => tag.includes(`id="${usageLabel?.[1]}"`)) || ''
  t.regex(search, /type="search"/)
  t.regex(search, /value="Moulin"/)
  t.true(select.length > 0)
  t.regex(html, /<option value="irrigation" selected="">Irrigation<\/option>/)
})

test('les filtres transmettent les valeurs saisies et se réinitialisent ensemble', t => {
  const {CampaignPointFilters: pointFilters} = loadComponent('campaign-points-step')
  const events = []
  let tree
  const Capture = () => {
    tree = pointFilters({
      query: 'Moulin', usageId: 'irrigation', usages: props().options.usages, setQuery: value => events.push(['query', value]), setUsageId: value => events.push(['usage', value])
    })
    return tree
  }

  renderToStaticMarkup(React.createElement(Capture))
  const elements = descendants(tree)
  elements.find(element => element.type === 'input').props.onChange({target: {value: 'Préleveur'}})
  elements.find(element => element.type === 'select').props.onChange({target: {value: 'industry'}})
  const reset = elements.find(element => element.type === 'button')
  t.false(reset.props.disabled)
  reset.props.onClick()
  t.deepEqual(events, [['query', 'Préleveur'], ['usage', 'industry'], ['query', ''], ['usage', '']])
  t.regex(render(props()), /<button[^>]*disabled=""[^>]*>Effacer les filtres<\/button>/)
})

test('les badges reprennent les couleurs réelles des usages irrigation, industrie et eau potable', t => {
  for (const [usage, expected] of [[visible.usage, '#2E7D32'], [outside.usage, '#B3404A'], [drinkingWater, '#1D70B8']]) {
    const initial = props()
    initial.options.exploitations = [{...visible, usage}]
    const html = render(initial).toLowerCase()
    t.is(waterHelpers.getUsageColor(usage), expected)
    t.true(html.includes(`background-color:${expected.toLowerCase()}`), `Couleur de ${usage.name}`)
    t.true(html.includes(`color:${waterHelpers.getUsageTextColor(usage).toLowerCase()}`), `Contraste de ${usage.name}`)
    t.true(html.includes(usage.name.toLowerCase()))
  }
})

test('les sous-usages héritent de leur palette et une couleur spécifique reste respectée', t => {
  const initial = props()
  const usage = {id: 'irrigation-drip', name: 'Irrigation au goutte à goutte', code: '2C'}
  initial.options.exploitations = [{...visible, usage}]
  t.true(render(initial).includes(`background-color:${waterHelpers.getUsageColor('2')}`))
  initial.options.exploitations = [{...visible, usage: {...usage, color: '#ABCDEF'}}]
  t.true(render(initial).includes('background-color:#ABCDEF'))
})

test('un usage absent ou inconnu reçoit un badge neutre sans supprimer son libellé', t => {
  const initial = props()
  initial.options.exploitations = [{...visible, usage: null}]
  t.true(render(initial).includes('Usage non renseigné'))
  t.true(render(initial).includes('background-color:#cccccc'))
  initial.options.exploitations = [{...visible, usage: {id: 'unknown', code: '99', name: 'Usage particulier'}}]
  t.true(render(initial).includes('Usage particulier'))
  t.true(render(initial).includes('background-color:#cccccc'))
  t.true(render(initial).includes('color:var(--text-default-grey)'))
})

test('une seule case présente la sélection, y compris pour une ancienne participation', t => {
  const initial = props()
  initial.form.targets = [{exploitationId: 'a', eligibilityConfirmed: true}]
  const html = render(initial)
  t.is((html.match(/type="checkbox"/g) || []).length, 1)
  t.regex(html, /type="checkbox" checked=""/)
  t.false(html.includes('Je confirme que ce point'))
  initial.form.targets[0].eligibilityConfirmed = false
  t.regex(render(initial), /type="checkbox" checked=""/)
  t.false(render(initial).includes('confirmer sa participation'))
})

test('les sélections hors résultats sont conservées dans une section distincte', t => {
  const initial = props()
  initial.form.targets = [{exploitationId: 'outside', eligibilityConfirmed: true}]
  initial.usageId = 'irrigation'
  const html = render(initial)
  const outsideSection = html.indexOf('Sélection conservée hors des résultats affichés (1)')
  t.true(outsideSection > html.indexOf('Point visible'))
  t.true(html.indexOf('Point conservé') > outsideSection)
  t.false(html.slice(0, outsideSection).includes('Entreprise hors filtre'))
  t.is((html.match(/type="checkbox"/g) || []).length, 1)
  t.true(html.slice(outsideSection).includes(`background-color:${waterHelpers.getUsageColor(outside.usage)}`))
  t.true(html.includes('aria-label="Retirer Point conservé de la sélection"'))
})

test('les points externes ne peuvent pas être cochés et les points ambigus sont signalés', t => {
  const initial = props()
  initial.options.exploitations = [{...visible, pointPrelevement: {...visible.pointPrelevement, collectionMode: 'EXTERNAL'}}]
  t.regex(render(initial), /type="checkbox" disabled=""/)
  initial.options.exploitations = [{...visible, ambiguousPoint: true}]
  const html = render(initial)
  t.true(html.includes('Plusieurs exploitations utilisent ce point. Cochez celle qui doit répondre.'))
  t.notRegex(html, /type="checkbox" disabled=""/)
})

test('un doublon est bloqué avec une explication reliée à sa case et un ancien point externe reste retirable', t => {
  const initial = props()
  initial.form.targets = [{exploitationId: 'other', eligibilityConfirmed: true}]
  initial.knownTargets.set('other', {...visible, id: 'other'})
  const html = render(initial)
  const checkbox = html.match(/<input\b[^>]+type="checkbox"[^>]*>/)?.[0] || ''
  const hintId = /aria-describedby="([^"]+)"/.exec(checkbox)?.[1]
  t.regex(checkbox, /disabled=""/)
  t.truthy(hintId)
  t.true(html.includes(`id="${hintId}"`))
  t.true(html.includes('Ce point est déjà sélectionné avec une autre exploitation.'))
  initial.form.targets = [{exploitationId: 'a', eligibilityConfirmed: false}]
  initial.options.exploitations = [{...visible, pointPrelevement: {...visible.pointPrelevement, collectionMode: 'EXTERNAL'}}]
  const externalCheckbox = render(initial).match(/<input\b[^>]+type="checkbox"[^>]*>/)?.[0] || ''
  t.regex(externalCheckbox, /checked=""/)
  t.notRegex(externalCheckbox, /disabled=""/)
})

test('un point sélectionné sans mode renseigné ne demande aucun réglage sur sa fiche', t => {
  const initial = props()
  const detail = {...visible, pointPrelevement: {...visible.pointPrelevement, collectionMode: null}}
  initial.options.exploitations = [detail]
  initial.knownTargets.set('a', detail)
  initial.form.targets = [{exploitationId: 'a', eligibilityConfirmed: true}]
  const html = render(initial)
  t.regex(html, /type="checkbox" checked=""/)
  t.false(html.includes('mode de saisie'))
  t.false(html.includes('avant l’ouverture'))
  t.false(html.includes('autre outil'))
  t.is(detail.pointPrelevement.collectionMode, null)
})

test('la recherche en cours masque les résultats précédents et les commandes de sélection', t => {
  const initial = props()
  initial.loadingOptions = true
  const html = render(initial)
  t.true(html.includes('Recherche des points…'))
  t.false(html.includes('Point visible'))
  t.false(html.includes('Sélectionner tous les résultats'))
})

test('la pagination ne prétend pas limiter la sélection à la page affichée', t => {
  const initial = props()
  initial.options.pagination = {total: 900, hasMore: true, nextCursor: 'next'}
  const html = render(initial)
  t.true(html.includes('Afficher plus de résultats'))
  t.true(html.includes('inclut aussi les pages suivantes'))
  t.false(html.includes('Les 500 premiers résultats'))
})

// Run the real handlers with controlled hooks and deferred server actions.
// Existing SSR tests keep real React hooks; this harness never opens a network connection.
const pointInteraction = (initial = props()) => {
  const state = []
  const effects = []
  const pendingEffects = []
  const requests = []
  const busyEvents = []
  const changes = []
  const loadedTargets = []
  let cursor = 0
  let effectCursor = 0
  let dirty = false
  let currentProps = {
    ...initial,
    onBusyChange: value => busyEvents.push(value),
    update: change => changes.push({change, busy: busyEvents.at(-1)}),
    onTargetsLoaded: rows => loadedTargets.push(rows)
  }
  const renderPoints = loadComponent('campaign-points-step', {
    react: {
      ...React,
      useState(initialValue) {
        const index = cursor++
        if (!(index in state)) {
          state[index] = typeof initialValue === 'function' ? initialValue() : initialValue
        }

        return [state[index], value => {
          const next = typeof value === 'function' ? value(state[index]) : value
          dirty ||= !Object.is(next, state[index])
          state[index] = next
        }]
      },
      useRef(initialValue) {
        const index = cursor++
        state[index] ||= {current: initialValue}
        return state[index]
      },
      useEffect(effect, dependencies) {
        const index = effectCursor++
        if (!effects[index] || dependencies.some((value, position) => !Object.is(value, effects[index].dependencies[position]))) {
          const previous = effects[index]
          const entry = {dependencies}
          effects[index] = entry
          pendingEffects.push(() => {
            previous?.cleanup?.()
            entry.cleanup = effect()
          })
        }
      }
    },
    '@/server/actions/campaigns.js': {
      getCampaignOptionsAction: params => new Promise((resolve, reject) => {
        requests.push({params, resolve: data => resolve({success: true, data}), reject})
      })
    }
  }).default
  const flow = {
    requests, busyEvents, changes, loadedTargets,
    render() {
      let tree
      let count = 0
      do {
        if (++count > 10) {
          throw new Error('Le composant ne stabilise pas son état.')
        }

        dirty = false
        cursor = 0
        effectCursor = 0
        tree = renderPoints(currentProps)
        for (const effect of pendingEffects.splice(0)) {
          effect()
        }
      } while (dirty)

      return tree
    },
    setProps(changes) {
      currentProps = {...currentProps, ...changes}
      return this.render()
    },
    button(label) {
      return descendants(this.render()).find(element => element?.type === 'button' && element.props.children === label)
    },
    unmount() {
      for (const effect of effects) {
        effect.cleanup?.()
      }
    }
  }
  flow.render()
  return flow
}

const paginatedProps = () => {
  const initial = props()
  initial.options.pagination = {total: 2, hasMore: true, nextCursor: 'page-two'}
  return initial
}

test('le signal occupé suit le chargement des options puis est libéré au démontage', t => {
  const flow = pointInteraction({...props(), loadingOptions: true})
  t.true(flow.busyEvents.at(-1))
  flow.setProps({loadingOptions: false})
  t.false(flow.busyEvents.at(-1))
  flow.setProps({loadingOptions: true})
  t.true(flow.busyEvents.at(-1))
  flow.unmount()
  t.false(flow.busyEvents.at(-1))
  t.is(flow.requests.length, 0)
})

test('tout sélectionner garde le parent occupé jusqu’à la dernière page et transmet la sélection avant de le libérer', async t => {
  const flow = pointInteraction(paginatedProps())
  const operation = flow.button('Tout sélectionner').props.onClick()
  t.true(flow.button('Tout sélectionner').props.disabled)
  t.true(flow.busyEvents.at(-1))
  t.is(flow.changes.length, 0)
  flow.requests[0].resolve({exploitations: [visible], pagination: {total: 2, hasMore: true, nextCursor: 'page-two'}})
  await new Promise(resolve => {
    setImmediate(resolve)
  })
  flow.render()
  t.is(flow.requests.length, 2)
  t.is(flow.requests[1].params.cursor, 'page-two')
  t.true(flow.busyEvents.at(-1))
  t.is(flow.changes.length, 0)
  flow.requests[1].resolve({exploitations: [outside], pagination: {total: 2, hasMore: false}})
  await operation
  t.deepEqual(flow.changes, [{change: {targets: [{exploitationId: 'a', eligibilityConfirmed: true}, {exploitationId: 'outside', eligibilityConfirmed: true}]}, busy: true}])
  t.deepEqual(flow.loadedTargets, [[visible, outside]])
  t.false(flow.button('Tout sélectionner').props.disabled)
  t.false(flow.busyEvents.at(-1))
  flow.unmount()
})

test('afficher plus de résultats signale son chargement sans modifier la sélection', async t => {
  const flow = pointInteraction(paginatedProps())
  const operation = flow.button('Afficher plus de résultats').props.onClick()
  t.true(flow.button('Afficher plus de résultats').props.disabled)
  t.true(flow.busyEvents.at(-1))
  t.is(flow.requests[0].params.cursor, 'page-two')
  flow.requests[0].resolve({exploitations: [outside], pagination: {total: 2, hasMore: false}})
  await operation
  const tree = flow.render()
  t.false(flow.busyEvents.at(-1))
  t.deepEqual(flow.loadedTargets, [[outside]])
  t.deepEqual(flow.changes, [])
  t.is(descendants(tree).filter(element => element?.props?.detail).length, 2)
  t.falsy(flow.button('Afficher plus de résultats'))
  flow.unmount()
})

for (const label of ['Tout sélectionner', 'Afficher plus de résultats']) {
  test(`un échec de « ${label} » libère le parent sans changer les points`, async t => {
    const flow = pointInteraction(paginatedProps())
    const operation = flow.button(label).props.onClick()
    flow.render()
    t.true(flow.busyEvents.at(-1))
    flow.requests[0].reject(new Error('Recherche indisponible'))
    await operation
    const tree = flow.render()
    t.false(flow.busyEvents.at(-1))
    t.false(flow.button(label).props.disabled)
    t.deepEqual(flow.changes, [])
    t.deepEqual(flow.loadedTargets, [])
    t.true(descendants(tree).some(element => element?.props?.error && element.props.children === 'Recherche indisponible'))
    flow.unmount()
  })

  test(`démonter pendant « ${label} » libère le parent et ignore la réponse tardive`, async t => {
    const flow = pointInteraction(paginatedProps())
    const operation = flow.button(label).props.onClick()
    flow.render()
    t.true(flow.busyEvents.at(-1))
    flow.unmount()
    t.false(flow.busyEvents.at(-1))
    const busyEvents = [...flow.busyEvents]
    flow.requests[0].resolve({exploitations: [visible], pagination: {total: 2, hasMore: true, nextCursor: 'page-two'}})
    await operation
    t.deepEqual(flow.busyEvents, busyEvents)
    t.deepEqual(flow.changes, [])
    t.deepEqual(flow.loadedTargets, [])
    t.is(flow.requests.length, 1)
  })
}

test('la fin d’une sélection ne libère pas le parent si la recherche des options continue', async t => {
  const flow = pointInteraction()
  const operation = flow.button('Tout sélectionner').props.onClick()
  flow.render()
  flow.setProps({loadingOptions: true})
  flow.requests[0].resolve({exploitations: [visible], pagination: {total: 1, hasMore: false}})
  await operation
  flow.render()
  t.true(flow.busyEvents.at(-1))
  flow.setProps({loadingOptions: false})
  t.false(flow.busyEvents.at(-1))
  flow.unmount()
})
