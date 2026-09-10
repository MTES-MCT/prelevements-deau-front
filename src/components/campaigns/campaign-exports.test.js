import React from 'react'

import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {runInNewContext} from 'node:vm'

import test from 'ava'
import {transformSync} from 'next/dist/build/swc/index.js'
import {renderToStaticMarkup} from 'react-dom/server'

import * as campaignHelpers from '../../lib/collection-campaigns.js'

const require = createRequire(import.meta.url)
const nodes = tree => Array.isArray(tree) ? tree.flatMap(node => nodes(node)) : (tree && typeof tree === 'object' ? [tree, ...nodes(tree.props?.children)] : [])
const item = (status = 'COMPLETED', id = 'export') => ({id, status, createdAt: '2026-09-10T08:30:00Z'})
const success = data => ({success: true, data})
const deferred = () => {
  let resolve
  const promise = new Promise(_resolve => {
    resolve = _resolve
  })
  return {promise, resolve}
}

const load = (overrides = {}, globals = {}, component = 'campaign-exports') => {
  const filename = new URL(`${component}.js`, import.meta.url)
  const {code} = transformSync(readFileSync(filename, 'utf8'), {filename: filename.pathname, jsc: {parser: {syntax: 'ecmascript', jsx: true}, transform: {react: {runtime: 'automatic'}}, target: 'es2022'}, module: {type: 'commonjs'}})
  const compiledModule = {exports: {}}
  const imports = {
    '@/components/campaigns/campaign-ui.js': component === 'campaign-exports' ? load(overrides, globals, 'campaign-ui') : undefined,
    'next/link': ({children, ...props}) => React.createElement('a', props, children),
    '@/lib/collection-campaigns.js': campaignHelpers,
    '@codegouvfr/react-dsfr/Alert': ({description, severity}) => React.createElement('div', {role: severity === 'error' ? 'alert' : 'status'}, description),
    '@codegouvfr/react-dsfr/Badge': {Badge: ({children}) => React.createElement('span', {className: 'fr-badge'}, children)},
    '@codegouvfr/react-dsfr/Button': ({children, priority, size, ...props}) => React.createElement('button', {type: 'button', ...props}, children),
    '@/server/actions/campaigns.js': new Proxy({}, {
      get: () => () => {
        throw new Error('Appel réseau interdit')
      }
    }),
    ...overrides
  }
  runInNewContext('(function(require, module, exports) {' + code + '\n})', {
    URL, setTimeout, clearTimeout, ...globals
  })(specifier => imports[specifier] || require(specifier), compiledModule, compiledModule.exports)
  return compiledModule.exports
}

const components = load()
const html = (component, props) => renderToStaticMarkup(React.createElement(component, props))

test('les exports utilisent les mêmes cartes et titres que le suivi et la configuration, avec historique et commandes conservés', t => {
  const markup = html(components.default, {campaignId: 'campaign', permissions: {canExport: true}})
  t.true(markup.includes('Paramètres de l’export'))
  t.true(markup.includes('Historique des exports'))
  t.true(markup.includes('Créer l’export'))
  t.is((markup.match(/<section class="mb-5 rounded-lg border border-\[var\(--border-default-grey\)] bg-\[var\(--background-default-grey\)] p-5 md:p-6">/g) || []).length, 2)
  t.is((markup.match(/<h2 class="fr-h5 fr-mb-0">/g) || []).length, 2)
  t.false(markup.includes('fr-h4'))
  t.true(markup.includes('Chargement de l’historique des exports'))
  t.false(markup.includes('Aucun export demandé'))
  t.false(markup.includes('<details'))
  t.false(markup.includes('Supprimer'))
  t.false(markup.includes('Date de début'))
})

test('les statuts de l’historique correspondent à la page exports et aucune suppression n’est inventée', t => {
  for (const [status, label] of [['PENDING', 'En attente'], ['PROCESSING', 'En cours'], ['RUNNING', 'En cours'], ['COMPLETED', 'Disponible'], ['READY', 'Disponible'], ['FAILED', 'Échec']]) {
    const markup = html(components.CampaignExportHistoryItem, {item: item(status), timezone: 'Europe/Paris'})
    t.true(markup.includes(label))
    t.true(markup.includes('10 septembre 2026 à 10:30'))
    t.is(markup.includes('Télécharger'), ['COMPLETED', 'READY'].includes(status))
    t.false(markup.includes('Supprimer'))
    t.false(markup.includes('0 lignes'))
  }
})

test('un échec est expliqué sans exposer le code technique de traitement', t => {
  const markup = html(components.CampaignExportHistoryItem, {item: {...item('FAILED'), error: 'ECHEC_EXPORT_OU_DROITS_MODIFIES'}})
  t.true(markup.includes('Le fichier n’a pas pu être généré'))
  t.false(markup.includes('ECHEC_EXPORT'))
})

test('le feedback reprend le suivi flottant de la page exports et devient téléchargeable', t => {
  const pending = html(components.CampaignExportFeedback, {items: [item('PENDING')], timezone: 'Europe/Paris'})
  t.true(pending.includes('fixed bottom-4 left-4 right-4'))
  t.true(pending.includes('aria-live="polite"'))
  t.true(pending.includes('1 fichier en préparation'))
  t.true(pending.includes('Export en attente'))
  const ready = html(components.CampaignExportFeedback, {items: [item()]})
  t.true(ready.includes('Export prêt'))
  t.true(ready.includes('Télécharger'))
  t.true(ready.includes('Masquer le suivi des exports'))
  t.is(html(components.CampaignExportFeedback, {items: []}), '')
})

const interaction = ({props = {}, initialItems = [], actions = {}} = {}) => {
  const states = []
  const timers = new Map()
  const calls = []
  const downloads = []
  const anchors = []
  let cursor = 0
  let timerId = 0
  const properties = {
    campaignId: 'campaign', timezone: 'Europe/Paris', permissions: {canExport: true}, ...props
  }
  const react = {
    ...React,
    useState(initial) {
      const index = cursor++
      if (!(index in states)) {
        states[index] = typeof initial === 'function' ? initial() : initial
      }

      return [states[index], value => {
        states[index] = typeof value === 'function' ? value(states[index]) : value
      }]
    },
    useRef(initial) {
      const index = cursor++
      states[index] ||= {current: initial}
      return states[index]
    },
    useEffect(effect, dependencies) {
      const index = cursor++
      if (!states[index] || dependencies.some((value, position) => !Object.is(value, states[index].dependencies[position]))) {
        states[index]?.cleanup?.()
        states[index] = {dependencies, cleanup: effect()}
      }
    }
  }
  const api = Object.fromEntries(['listCampaignExportsAction', 'createCampaignExportAction', 'getCampaignExportAction'].map(name => [name, async (...args) => {
    calls.push({name, args})
    if (actions[name]) {
      return actions[name](...args)
    }

    if (name === 'listCampaignExportsAction') {
      return success(initialItems)
    }

    if (name === 'createCampaignExportAction') {
      return success(item('PENDING', 'new-export'))
    }

    return success({downloadUrl: 'https://storage.example.invalid/campagne.xlsx?token=fresh'})
  }]))
  const renderComponent = load({react, '@/server/actions/campaigns.js': api}, {
    setTimeout(callback, ms) {
      const id = ++timerId
      timers.set(id, {callback, ms})
      return id
    },
    clearTimeout(id) {
      timers.delete(id)
    },
    document: {
      createElement(tag) {
        const anchor = {
          tag, removed: false,
          click() {
            downloads.push({href: this.href, rel: this.rel})
          },
          remove() {
            this.removed = true
          }
        }
        anchors.push(anchor)
        return anchor
      },
      body: {append() {}}
    }
  }).default
  return {
    calls, downloads, anchors, timers, props: properties,
    render() {
      cursor = 0
      return renderComponent(properties)
    },
    html() {
      return renderToStaticMarkup(this.render())
    },
    submit() {
      return nodes(this.render()).find(node => node.type === 'form')?.props.onSubmit({preventDefault() {}})
    },
    download(value = initialItems[0]) {
      const node = nodes(this.render()).find(node => node.props?.item?.id === value.id)
      return node.props.onDownload(value)
    },
    button(label) {
      return nodes(this.render()).find(node => node.props?.children === label && node.props.onClick)
    },
    async settle() {
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    },
    async mount() {
      this.render()
      await this.settle()
      this.render()
    },
    tick() {
      for (const [id, timer] of timers) {
        timers.delete(id)
        timer.callback()
      }

      this.render()
    },
    unmount() {
      for (const state of states) {
        state?.cleanup?.()
      }
    }
  }
}

test('sans droit aucun chargement ni commande d’export n’est monté', async t => {
  const flow = interaction({props: {permissions: {canExport: false}}})
  await flow.mount()
  t.is(flow.html(), '')
  t.deepEqual(flow.calls, [])
})

test('le montage charge uniquement l’historique, sans préparer ni télécharger de fichier', async t => {
  const flow = interaction()
  await flow.mount()
  t.deepEqual(flow.calls.map(call => call.name), ['listCampaignExportsAction'])
  t.true(flow.html().includes('Aucun export demandé pour le moment'))
  t.is(flow.timers.size, 0)
  t.is(flow.downloads.length, 0)
})

test('la préparation est explicite et immédiatement visible dans historique et feedback', async t => {
  const pendingRefresh = deferred()
  let lists = 0
  const flow = interaction({actions: {listCampaignExportsAction: () => ++lists === 1 ? success([]) : pendingRefresh.promise}})
  await flow.mount()
  await flow.submit()
  const markup = flow.html()
  t.true(markup.includes('En attente'))
  t.true(markup.includes('Export en attente'))
  t.true(markup.includes('Un export est déjà en préparation'))
  t.is(flow.calls.filter(call => call.name === 'createCampaignExportAction').length, 1)
  t.false(markup.includes('Aucun export demandé pour le moment'))
  pendingRefresh.resolve(success([item('PENDING', 'new-export')]))
  await flow.settle()
})

test('deux clics synchrones sur Créer ne déclenchent qu’une demande', async t => {
  const pending = deferred()
  const flow = interaction({actions: {createCampaignExportAction: () => pending.promise}})
  await flow.mount()
  const submit = nodes(flow.render()).find(node => node.type === 'form').props.onSubmit
  const first = submit({preventDefault() {}})
  const second = submit({preventDefault() {}})
  t.is(flow.calls.filter(call => call.name === 'createCampaignExportAction').length, 1)
  t.true(flow.html().includes('Demande en cours…'))
  pending.resolve(success(item('PENDING', 'new-export')))
  await Promise.all([first, second])
})

for (const status of ['PENDING', 'PROCESSING', 'RUNNING']) {
  test(`un export ${status} empêche un doublon et se rafraîchit sans requêtes concurrentes`, async t => {
    const pending = deferred()
    let lists = 0
    const flow = interaction({initialItems: [item(status)], actions: {listCampaignExportsAction: () => ++lists === 1 ? success([item(status)]) : pending.promise}})
    await flow.mount()
    await flow.submit()
    t.is(flow.calls.filter(call => call.name === 'createCampaignExportAction').length, 0)
    t.is(flow.timers.size, 1)
    t.is([...flow.timers.values()][0].ms, 4000)
    flow.tick()
    t.is(flow.timers.size, 0)
    t.is(lists, 2)
    pending.resolve(success([item('COMPLETED')]))
    await flow.settle()
    const markup = flow.html()
    t.true(markup.includes('Export prêt'))
    t.is(flow.timers.size, 0)
  })
}

test('le démontage annule le polling et ignore les résultats de chargement tardifs', async t => {
  const flow = interaction({initialItems: [item('PENDING')]})
  await flow.mount()
  t.is(flow.timers.size, 1)
  flow.unmount()
  t.is(flow.timers.size, 0)
  const pending = deferred()
  const second = interaction({actions: {listCampaignExportsAction: () => pending.promise}})
  second.render()
  second.unmount()
  pending.resolve(success([item('COMPLETED')]))
  await second.settle()
  t.false(second.html().includes('Disponible'))
})

test('un historique en erreur ne devient pas vide et bloque une création à l’aveugle', async t => {
  let lists = 0
  const flow = interaction({actions: {listCampaignExportsAction: () => ++lists === 1 ? {success: false, error: 'Accès refusé'} : success([])}})
  await flow.mount()
  await flow.submit()
  t.true(flow.html().includes('Accès refusé'))
  t.false(flow.html().includes('Aucun export demandé'))
  t.is(flow.calls.filter(call => call.name === 'createCampaignExportAction').length, 0)
  flow.button('Réessayer').props.onClick()
  flow.render()
  await flow.settle()
  t.true(flow.html().includes('Aucun export demandé'))
})

test('un échec de polling stoppe les requêtes et permet une reprise manuelle', async t => {
  let lists = 0
  const flow = interaction({actions: {listCampaignExportsAction: () => ++lists === 2 ? {success: false, error: 'Indisponible'} : success([item('PENDING')])}})
  await flow.mount()
  flow.tick()
  await flow.settle()
  flow.render()
  t.is(flow.timers.size, 0)
  t.true(flow.html().includes('Indisponible'))
  flow.button('Réessayer').props.onClick()
  flow.render()
  await flow.settle()
  flow.render()
  t.is(flow.timers.size, 1)
})

test('un export READY se télécharge en un clic avec une nouvelle URL à chaque demande', async t => {
  let serial = 0
  const flow = interaction({initialItems: [item('READY')], actions: {getCampaignExportAction: () => success({downloadUrl: `https://storage.example.invalid/campagne.xlsx?token=${++serial}`})}})
  await flow.mount()
  await flow.download()
  await flow.download()
  t.deepEqual(flow.downloads, [{href: 'https://storage.example.invalid/campagne.xlsx?token=1', rel: 'noopener noreferrer'}, {href: 'https://storage.example.invalid/campagne.xlsx?token=2', rel: 'noopener noreferrer'}])
  t.true(flow.anchors.every(anchor => anchor.tag === 'a' && anchor.removed))
  t.is(flow.calls.filter(call => call.name === 'getCampaignExportAction').length, 2)
})

test('un double clic de téléchargement ne déclenche pas deux requêtes', async t => {
  const pending = deferred()
  const flow = interaction({initialItems: [item()], actions: {getCampaignExportAction: () => pending.promise}})
  await flow.mount()
  const first = flow.download()
  const second = flow.download()
  t.is(flow.calls.filter(call => call.name === 'getCampaignExportAction').length, 1)
  pending.resolve(success({downloadUrl: 'https://storage.example.invalid/export.xlsx'}))
  await Promise.all([first, second])
  t.is(flow.downloads.length, 1)
})

// eslint-disable-next-line no-script-url
for (const url of ['javascript:alert(1)', 'data:text/plain,secret', 'file:///tmp/export.xlsx', 'https://user:password@example.invalid/export.xlsx']) {
  test(`le téléchargement refuse le lien dangereux ${url.split(':')[0]}`, async t => {
    const flow = interaction({initialItems: [item()], actions: {getCampaignExportAction: () => success({downloadUrl: url})}})
    await flow.mount()
    await flow.download()
    t.is(flow.downloads.length, 0)
    t.true(flow.html().includes('Lien de téléchargement invalide'))
  })
}

test('les contrôles disabled et permissions sont revérifiés dans les callbacks', async t => {
  for (const change of [{disabled: true}, {permissions: {canExport: false}}]) {
    const flow = interaction({initialItems: [item()]})
    // eslint-disable-next-line no-await-in-loop
    await flow.mount()
    const tree = flow.render()
    const submit = nodes(tree).find(node => node.type === 'form').props.onSubmit
    const download = nodes(tree).find(node => node.props?.item)?.props.onDownload
    Object.assign(flow.props, change)
    flow.render()
    // eslint-disable-next-line no-await-in-loop
    await submit({preventDefault() {}})
    // eslint-disable-next-line no-await-in-loop
    await download(item())
    t.is(flow.calls.length, 1)
    t.is(flow.downloads.length, 0)
  }
})

test('les droits retirés pendant la demande empêchent le téléchargement final', async t => {
  const pending = deferred()
  const flow = interaction({initialItems: [item()], actions: {getCampaignExportAction: () => pending.promise}})
  await flow.mount()
  const operation = flow.download()
  flow.props.permissions = {canExport: false}
  flow.render()
  pending.resolve(success({downloadUrl: 'https://storage.example.invalid/export.xlsx'}))
  await operation
  t.is(flow.downloads.length, 0)
})

test('une erreur serveur de création ou téléchargement est expliquée et ne produit aucun lien', async t => {
  const flow = interaction({initialItems: [item()], actions: {createCampaignExportAction: () => ({success: false, error: 'Périmètre modifié'}), getCampaignExportAction: () => ({success: false, error: 'Droits insuffisants'})}})
  await flow.mount()
  await flow.submit()
  t.true(flow.html().includes('Périmètre modifié'))
  await flow.download()
  t.true(flow.html().includes('Droits insuffisants'))
  t.is(flow.downloads.length, 0)
})

test('une erreur de téléchargement n’interrompt pas le suivi d’un autre fichier en préparation', async t => {
  const flow = interaction({initialItems: [item('COMPLETED'), item('PENDING', 'pending')], actions: {getCampaignExportAction: () => ({success: false, error: 'Lien expiré'})}})
  await flow.mount()
  await flow.download()
  t.true(flow.html().includes('Lien expiré'))
  t.is(flow.timers.size, 1)
})

test('un lien absent ou mal formé produit un message français et aucun téléchargement', async t => {
  for (const url of [undefined, 'not a URL']) {
    const flow = interaction({initialItems: [item()], actions: {getCampaignExportAction: () => success({downloadUrl: url})}})
    // eslint-disable-next-line no-await-in-loop
    await flow.mount()
    // eslint-disable-next-line no-await-in-loop
    await flow.download()
    t.true(flow.html().includes('Lien de téléchargement invalide'))
    t.is(flow.downloads.length, 0)
  }
})

test('masquer le suivi ne retire pas l’historique et le prochain polling ne le rouvre pas', async t => {
  const flow = interaction({initialItems: [item('PENDING')]})
  await flow.mount()
  const feedback = nodes(flow.render()).find(node => node.props?.onCloseAll)
  feedback.props.onCloseAll()
  t.false(flow.html().includes('Suivi des exports'))
  t.true(flow.html().includes('Historique des exports'))
  flow.tick()
  await flow.settle()
  t.false(flow.html().includes('Suivi des exports'))
})

test('un changement de campagne ne montre jamais les fichiers de l’ancienne campagne', async t => {
  const pending = deferred()
  const flow = interaction({initialItems: [item()], actions: {listCampaignExportsAction: id => id === 'campaign' ? success([item()]) : pending.promise}})
  await flow.mount()
  flow.props.campaignId = 'other'
  const markup = flow.html()
  t.false(markup.includes('Disponible'))
  t.false(markup.includes('Télécharger'))
  pending.resolve(success([]))
  await flow.settle()
  t.true(flow.html().includes('Aucun export demandé'))
})
