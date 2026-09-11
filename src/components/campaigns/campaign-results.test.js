import React from 'react'

import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {runInNewContext} from 'node:vm'

import test from 'ava'
import {transformSync} from 'next/dist/build/swc/index.js'
import {renderToStaticMarkup} from 'react-dom/server'

import * as calendarHelpers from '../../lib/campaign-calendar.js'
import * as campaignHelpers from '../../lib/collection-campaigns.js'
import * as waterHelpers from '../../lib/water-uses.js'
import * as numberHelpers from '../../utils/number.js'

const require = createRequire(import.meta.url)
const nodes = tree => Array.isArray(tree) ? tree.flatMap(node => nodes(node)) : (tree && typeof tree === 'object' ? [tree, ...nodes(tree.props?.children)] : [])
const button = (tree, label) => nodes(tree).find(node => node.type === 'button' && node.props.children === label)
const deferred = () => {
  let resolve
  const promise = new Promise(_resolve => {
    resolve = _resolve
  })
  return {promise, resolve}
}

const load = (name, overrides = {}) => {
  const filename = new URL(`${name}.js`, import.meta.url)
  const {code} = transformSync(readFileSync(filename, 'utf8'), {filename: filename.pathname, jsc: {parser: {syntax: 'ecmascript', jsx: true}, transform: {react: {runtime: 'automatic'}}, target: 'es2022'}, module: {type: 'commonjs'}})
  const compiledModule = {exports: {}}
  const imports = {
    '@/utils/number.js': numberHelpers,
    '@/lib/campaign-calendar.js': calendarHelpers,
    '@/lib/collection-campaigns.js': campaignHelpers,
    '@/lib/water-uses.js': waterHelpers,
    'next/link': ({children, ...props}) => React.createElement('a', props, children),
    '@/server/actions/campaigns.js': new Proxy({}, {
      get: () => () => {
        throw new Error('Appel réseau interdit')
      }
    }),
    ...overrides
  }
  runInNewContext('(function(require, module, exports) {' + code + '\n})', {URLSearchParams})(specifier => {
    if (specifier === '@/components/campaigns/campaign-ui.js') {
      return load('campaign-ui', overrides)
    }

    return imports[specifier] || require(specifier)
  }, compiledModule, compiledModule.exports)
  return compiledModule.exports
}

const components = load('campaign-results')
const campaign = {
  id: 'campaign', status: 'OPEN', timezone: 'Europe/Paris',
  periods: [
    {
      id: 'index-a', label: 'Hiver', kind: 'INDEX', startDate: '2025-11-01', endDate: '2026-06-01'
    },
    {
      id: 'index-b', label: 'Été', kind: 'INDEX', startDate: '2026-06-01', endDate: '2026-11-01'
    },
    {
      id: 'needs-a', label: 'Besoins annuels', kind: 'NEEDS', startDate: '2027-01-01', endDate: '2028-01-01'
    }
  ]
}
const target = {
  id: 'target', preleveurUserId: 'farmer', pointPrelevement: {id: 'point', name: 'Forage du moulin'}, usage: {code: '2', label: 'Irrigation'},
  meters: [{compteurId: 'meter', compteur: {serialNumber: '123456'}}]
}
const row = (userId = 'farmer', extra = {}) => ({
  preleveur: {userId, label: `Ferme ${userId}`}, pointCount: 2,
  responses: {INDEX: {status: 'SUBMITTED', received: true, latestSubmissionAt: '2026-06-02T08:00:00Z'}, NEEDS: {status: null, received: false}}, ...extra
})
const overview = (items = [row()], pagination = {}) => ({
  success: true, data: {
    items, pagination: {
      totalCount: items.length, hasMore: false, nextCursor: null, limit: 20, ...pagination
    }
  }
})
const results = (overrides = {}) => ({
  targets: [target], preleveurUserId: 'farmer',
  responses: {
    INDEX: {
      status: 'DRAFT', draft: {readings: [{targetId: 'target', value: '999999999'}]},
      latestSubmission: {
        submittedAt: '2026-06-02T08:00:00Z',
        snapshot: {
          readings: [{
            targetId: 'target', compteurId: 'meter', readingDate: '2026-06-01', value: '1450.5'
          }]
        },
        publication: {
          totals: [{
            targetId: 'target', periodId: 'index-a', value: '1200.5', status: 'COMPLETE'
          }, {
            targetId: 'target', periodId: 'index-b', value: null, status: 'MISSING'
          }]
        }
      }
    },
    NEEDS: {
      draft: {needs: [{targetId: 'target', periodId: 'needs-a', requestedVolume: '8888888'}]},
      latestSubmission: {snapshot: {needs: [{targetId: 'target', periodId: 'needs-a', requestedVolume: '0'}]}}
    }
  }, ...overrides
})
const html = (component, props) => renderToStaticMarkup(React.createElement(component, props))

test('les volumes conservent zéro, décimales et précision, sans remplacer les absences', t => {
  const {campaignResultVolume: format} = components
  t.is(format(0), '0 m³')
  t.is(format('1200.5001'), '1\u202F200,5001 m³')
  t.is(format('9999999999999999.9999'), '9\u202F999\u202F999\u202F999\u202F999\u202F999,9999 m³')
  for (const value of [null, undefined, '', 'NaN', -1, false, Infinity]) {
    t.is(format(value), null)
  }
})

test('les badges distinguent réponse reçue, correction en cours, brouillon et attente', t => {
  const render = response => html(components.CampaignResponseStatus, {response})
  t.true(render({received: true}).includes('Reçue'))
  t.true(render({received: true, status: 'DRAFT', correctionPending: true}).includes('Correction à transmettre'))
  t.true(render({status: 'DRAFT', received: false}).includes('Brouillon'))
  t.true(render(null).includes('À recevoir'))
  t.false(render({status: 'DRAFT', received: false}).includes('fr-badge--success'))
})

test('la date de réception suit le passage à minuit de Paris, sans décaler une échéance', t => {
  for (const latestSubmissionAt of ['2026-07-12T22:00:00Z', '2026-07-12T23:30:00Z']) {
    for (const timezone of ['Europe/Paris', undefined]) {
      const markup = html(components.CampaignResponseStatus, {response: {received: true, latestSubmissionAt}, timezone})
      t.true(markup.includes('Reçue le 13 juillet 2026'))
      t.false(markup.includes('12 juillet 2026'))
    }
  }
})

test('la date de réception peut être la veille de la date UTC dans un fuseau négatif', t => {
  const markup = html(components.CampaignResponseStatus, {response: {received: true, latestSubmissionAt: '2026-07-13T01:30:00Z'}, timezone: 'America/Martinique'})
  t.true(markup.includes('Reçue le 12 juillet 2026'))
  t.false(markup.includes('13 juillet 2026'))
})

test('la liste initiale ne charge aucun résultat individuel et annonce son chargement', t => {
  const markup = html(components.default, {campaign})
  t.true(markup.includes('Chargement du suivi des réponses'))
  t.true(markup.includes('Rechercher un préleveur ou un point'))
  t.true(markup.includes('aria-busy="true"'))
  t.false(markup.includes('Aucun préleveur ne correspond'))
})

test('le détail affiche uniquement les publications et snapshots transmis, jamais les brouillons', t => {
  const markup = html(components.CampaignResultsDetail, {campaign, data: results()})
  t.true(markup.includes('Forage du moulin'))
  t.true(markup.includes('Irrigation'))
  t.true(markup.includes('1\u202F200,5 m³'))
  t.true(markup.includes('1\u202F450,5 m³'))
  t.true(markup.includes('0 m³'))
  t.true(markup.includes('Volume non calculable'))
  t.true(markup.includes('31 mai 2026'))
  t.true(markup.includes('31 décembre 2027'))
  t.false(markup.includes('999999999'))
  t.false(markup.includes('8888888'))
  t.false(markup.includes('brouillons et corrections'))
  t.false(markup.includes('href="/mes-index/'))
  t.true(markup.includes('href="/points-prelevement/point"'))
})

test('un conflit ou une valeur absente ne devient jamais un volume nul', t => {
  const data = results()
  data.responses.INDEX.latestSubmission.publication.totals = [{
    targetId: 'target', periodId: 'index-a', value: '987', status: 'CONFLICT'
  }]
  data.responses.NEEDS.latestSubmission.snapshot.needs[0].requestedVolume = null
  const markup = html(components.CampaignResultsDetail, {campaign, data})
  t.true(markup.includes('À vérifier'))
  t.true(markup.includes('Volume non calculable'))
  t.true(markup.includes('Volume non renseigné'))
  t.false(markup.includes('987 m³'))
  t.false(markup.includes('0 m³'))
})

test('un volume prélevé n’est fiable que si sa publication confirme COMPLETE', t => {
  for (const status of [undefined, null, 'UNKNOWN', 'MISSING', 'CONFLICT']) {
    const data = results()
    data.responses.INDEX.latestSubmission.publication.totals = [{
      targetId: 'target', periodId: 'index-a', value: '987', status
    }]
    const markup = html(components.CampaignResultsDetail, {campaign, data})
    t.false(markup.includes('987 m³'))
  }
})

test('sans transmission, le brouillon n’est ni affiché ni présenté comme un résultat', t => {
  const data = results({responses: {INDEX: {status: 'DRAFT', draft: {readings: [{value: '456'}]}}, NEEDS: null}})
  const markup = html(components.CampaignResultsDetail, {campaign, data})
  t.is((markup.match(/Aucune réponse transmise\./g) || []).length, 2)
  t.false(markup.includes('456'))
  t.false(markup.includes('href="/mes-'))
  t.false(markup.includes('0 m³'))
})

test('le nom du point est son unique lien et les anciennes actions ont disparu', t => {
  const markup = html(components.CampaignResultsDetail, {campaign, data: results()})
  t.regex(markup, /<h4[^>]*><a[^>]*href="\/points-prelevement\/point"[^>]*>Forage du moulin<\/a><\/h4>/)
  t.is((markup.match(/href="\/points-prelevement\//g) || []).length, 1)
  for (const text of ['Consulter la fiche du point', 'Ouvrir la réponse', 'compteur a été remplacé', 'Enregistrer']) {
    t.false(markup.includes(text))
  }

  t.false(readFileSync(new URL('campaign-results.js', import.meta.url), 'utf8').includes('renderPointActions'))
})

test('un point sans identifiant conserve son nom sans inventer de lien', t => {
  const data = results({targets: [{...target, pointPrelevement: {name: 'Forage sans identifiant'}}]})
  const markup = html(components.CampaignResultsDetail, {campaign, data})
  t.true(markup.includes('Forage sans identifiant'))
  t.false(markup.includes('href='))
})

const nestedHooks = {state: React.useState, effect: React.useEffect}
const interaction = ({component = 'default', props = {campaign}, actions = {getCampaignResponseOverviewAction: async () => overview()}} = {}) => {
  const state = []
  let cursor = 0
  let renderingMarkup = false
  const react = {
    ...React,
    useId: () => 'detail-id',
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
    useEffect(effect, dependencies) {
      if (renderingMarkup) {
        return nestedHooks.effect(effect, dependencies)
      }

      const index = cursor++
      if (!state[index] || dependencies.some((value, position) => !Object.is(value, state[index].dependencies[position]))) {
        state[index]?.cleanup?.()
        state[index] = {dependencies, cleanup: effect()}
      }
    }
  }
  const renderComponent = load('campaign-results', {react, '@/server/actions/campaigns.js': actions})[component]
  return {
    props,
    render() {
      cursor = 0
      return renderComponent(props)
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
    unmount() {
      for (const value of state) {
        value?.cleanup?.()
      }
    },
    async settle() {
      await Promise.resolve()
      await Promise.resolve()
    }
  }
}

test('le suivi charge seulement la page légère et fusionne les pages sans doublon', async t => {
  const calls = []
  const flow = interaction({
    actions: {
      async getCampaignResponseOverviewAction(id, options) {
        calls.push({id, options})
        return options.cursor ? overview([row(), row('second')]) : overview([row()], {hasMore: true, nextCursor: 'farmer', totalCount: 2})
      }
    }
  })
  flow.render()
  await flow.settle()
  t.is(calls.length, 1)
  t.deepEqual({...calls[0].options}, {
    q: '', status: 'all', cursor: null, limit: 20
  })
  t.true(flow.html().includes('Ferme farmer'))
  button(flow.render(), 'Afficher les préleveurs suivants').props.onClick()
  flow.render()
  await flow.settle()
  t.is(calls.length, 2)
  t.is(calls[1].options.cursor, 'farmer')
  const markup = flow.html()
  t.is((markup.match(/Ferme farmer/g) || []).length, 1)
  t.true(markup.includes('Ferme second'))
  t.false(markup.includes('Afficher les préleveurs suivants'))
})

test('les filtres sont envoyés au serveur et repartent de la première page', async t => {
  const calls = []
  const flow = interaction({
    actions: {
      async getCampaignResponseOverviewAction(id, options) {
        calls.push(options)
        return overview([row()], {hasMore: true, nextCursor: 'farmer'})
      }
    }
  })
  flow.render()
  await flow.settle()
  button(flow.render(), 'Afficher les préleveurs suivants').props.onClick()
  flow.render()
  await flow.settle()
  nodes(flow.render()).find(node => node.props?.label === 'Rechercher un préleveur ou un point').props.onChange('  Moulin  ')
  nodes(flow.render()).find(node => node.type === 'form').props.onSubmit({preventDefault() {}})
  flow.render()
  await flow.settle()
  t.is(calls.at(-1).q, 'Moulin')
  t.is(calls.at(-1).cursor, null)
  nodes(flow.render()).find(node => node.props?.label === 'Réponses').props.onChange('correction')
  flow.render()
  await flow.settle()
  t.is(calls.at(-1).status, 'correction')
  t.is(calls.at(-1).cursor, null)
})

test('un rafraîchissement invalide détails et pagination sans sauter la première page', async t => {
  const calls = []
  const flow = interaction({
    actions: {
      async getCampaignResponseOverviewAction(id, options) {
        calls.push(options)
        return overview([row()], {hasMore: true, nextCursor: 'farmer'})
      }
    }
  })
  flow.render()
  await flow.settle()
  button(flow.render(), 'Afficher les préleveurs suivants').props.onClick()
  flow.render()
  await flow.settle()
  const oldKey = nodes(flow.render()).find(node => node.props?.item)?.key
  flow.props.refreshKey = 2
  flow.render()
  await flow.settle()
  t.is(calls.at(-1).cursor, null)
  t.not(nodes(flow.render()).find(node => node.props?.item)?.key, oldKey)
})

test('une ancienne réponse de recherche ne remplace pas les nouveaux résultats', async t => {
  const pending = deferred()
  let calls = 0
  const flow = interaction({actions: {getCampaignResponseOverviewAction: async () => ++calls === 1 ? pending.promise : overview([row('récent')])}})
  flow.render()
  nodes(flow.render()).find(node => node.props?.label === 'Réponses').props.onChange('received')
  flow.render()
  await flow.settle()
  t.true(flow.html().includes('Ferme récent'))
  pending.resolve(overview([row('obsolète')]))
  await flow.settle()
  t.true(flow.html().includes('Ferme récent'))
  t.false(flow.html().includes('obsolète'))
})

test('un refus de suivi présente une erreur récupérable, jamais une fausse liste vide', async t => {
  let calls = 0
  const flow = interaction({actions: {getCampaignResponseOverviewAction: async () => ++calls === 1 ? {success: false, error: 'Accès refusé'} : overview()}})
  flow.render()
  await flow.settle()
  t.true(flow.html().includes('Accès refusé'))
  t.true(flow.html().includes('role="alert"'))
  t.false(flow.html().includes('Aucun préleveur ne correspond'))
  button(flow.render(), 'Réessayer').props.onClick()
  flow.render()
  await flow.settle()
  t.true(flow.html().includes('Ferme farmer'))
  t.false(flow.html().includes('Accès refusé'))
})

test('un curseur devenu invalide permet de recharger la liste depuis le début', async t => {
  const calls = []
  const flow = interaction({
    actions: {
      async getCampaignResponseOverviewAction(id, options) {
        calls.push(options)
        return options.cursor ? {success: false, error: 'Curseur périmé'} : overview([row()], {hasMore: true, nextCursor: 'farmer'})
      }
    }
  })
  flow.render()
  await flow.settle()
  button(flow.render(), 'Afficher les préleveurs suivants').props.onClick()
  flow.render()
  await flow.settle()
  t.true(flow.html().includes('Curseur périmé'))
  button(flow.render(), 'Recharger la liste').props.onClick()
  flow.render()
  await flow.settle()
  t.is(calls.at(-1).cursor, null)
  t.false(flow.html().includes('Curseur périmé'))
})

test('un résultat reçu après démontage du suivi est ignoré', async t => {
  const pending = deferred()
  const flow = interaction({actions: {getCampaignResponseOverviewAction: async () => pending.promise}})
  flow.render()
  flow.unmount()
  pending.resolve(overview([row('tardif')]))
  await flow.settle()
  t.false(flow.html().includes('Ferme tardif'))
})

test('la ligne ne charge ses résultats qu’à son ouverture, puis les réutilise', async t => {
  const calls = []
  const flow = interaction({
    component: 'CampaignPreleveurResults', props: {campaign, item: row()}, actions: {
      async getCampaignResponseResultsAction(id, userId) {
        calls.push({id, userId})
        return {success: true, data: results()}
      }
    }
  })
  t.true(flow.html().includes('aria-expanded="false"'))
  t.is(calls.length, 0)
  nodes(flow.render()).find(node => node.props?.['aria-expanded'] === false).props.onClick()
  t.true(flow.html().includes('Chargement des résultats transmis'))
  await flow.settle()
  t.deepEqual(calls, [{id: 'campaign', userId: 'farmer'}])
  t.true(flow.html().includes('Forage du moulin'))
  nodes(flow.render()).find(node => node.props?.['aria-expanded'] === true).props.onClick()
  t.false(flow.html().includes('Forage du moulin'))
  nodes(flow.render()).find(node => node.props?.['aria-expanded'] === false).props.onClick()
  t.true(flow.html().includes('Forage du moulin'))
  t.is(calls.length, 1)
})

test('la fermeture pendant le chargement ignore la réponse devenue inutile', async t => {
  const pending = deferred()
  let calls = 0
  const flow = interaction({
    component: 'CampaignPreleveurResults', props: {campaign, item: row()}, actions: {
      async getCampaignResponseResultsAction() {
        calls++
        return pending.promise
      }
    }
  })
  nodes(flow.render()).find(node => node.props?.['aria-expanded'] === false).props.onClick()
  flow.render()
  nodes(flow.render()).find(node => node.props?.['aria-expanded'] === true).props.onClick()
  flow.render()
  pending.resolve({success: true, data: results()})
  await flow.settle()
  nodes(flow.render()).find(node => node.props?.['aria-expanded'] === false).props.onClick()
  flow.render()
  t.is(calls, 2)
})

test('un détail inaccessible reste fermé aux données et propose une nouvelle tentative', async t => {
  const flow = interaction({component: 'CampaignPreleveurResults', props: {campaign, item: row()}, actions: {getCampaignResponseResultsAction: async () => ({success: false, error: 'Droits insuffisants'})}})
  nodes(flow.render()).find(node => node.props?.['aria-expanded'] === false).props.onClick()
  flow.render()
  await flow.settle()
  const markup = flow.html()
  t.true(markup.includes('Droits insuffisants'))
  t.true(markup.includes('Réessayer'))
  t.false(markup.includes('Forage du moulin'))
})

test('les actions utilisent les trois routes spécifiques, avec paramètres encodés', async t => {
  const filename = new URL('../../server/actions/campaigns.js', import.meta.url)
  const {code} = transformSync(readFileSync(filename, 'utf8'), {filename: filename.pathname, jsc: {parser: {syntax: 'ecmascript'}, target: 'es2022'}, module: {type: 'commonjs'}})
  const compiledModule = {exports: {}}
  const paths = []
  runInNewContext('(function(require, module, exports) {' + code + '\n})', {URLSearchParams})(() => ({
    async fetchJSON(path) {
      paths.push(path)
    }, withErrorHandling: operation => operation()
  }), compiledModule, compiledModule.exports)
  await compiledModule.exports.getCampaignResponseSummaryAction('campaign/id')
  await compiledModule.exports.getCampaignResponseOverviewAction('campaign/id', {cursor: 'farmer', q: 'Forage & moulin', status: 'received'})
  await compiledModule.exports.getCampaignResponseResultsAction('campaign/id', 'farmer/other')
  t.is(paths[0], 'api/campaigns/campaign%2Fid/responses/summary')
  t.is(paths[1], 'api/campaigns/campaign%2Fid/responses/overview?limit=20&status=received&cursor=farmer&q=Forage+%26+moulin')
  t.is(paths[2], 'api/campaigns/campaign%2Fid/responses/results?preleveurUserId=farmer%2Fother')
})

const {default: Progress, campaignProgressCounts} = load('campaign-progress')
const summary = {
  preleveurCount: 10, expectedCount: 20, receivedCount: 14, correctionCount: 2, scopeComplete: true,
  byKind: {INDEX: {expectedCount: 10, receivedCount: 8, correctionCount: 0}, NEEDS: {expectedCount: 10, receivedCount: 6, correctionCount: 2}}
}

test('les deux jauges séparent besoins et relevés et conservent les transmissions reçues pendant une modification', t => {
  const markup = html(Progress, {summary})
  t.is((markup.match(/role="img"/g) || []).length, 2)
  t.true(markup.indexOf('Besoins en eau') < markup.indexOf('Relevés de compteurs'))
  t.true(markup.includes('aria-label="Besoins en eau : 6 reçues · 4 attendues"'))
  t.true(markup.includes('aria-label="Relevés de compteurs : 8 reçues · 2 attendues"'))
  t.true(markup.includes('Légende des réponses'))
  t.true(markup.includes('background-action-high-success'))
  t.notRegex(markup, /correction|Correction|background-action-high-warning/)
  t.true(markup.includes('background-contrast-grey'))
  t.false(markup.includes('70 %'))
  t.false(markup.includes('brouillon'))
  t.deepEqual({...campaignProgressCounts(summary.byKind.NEEDS)}, {
    expected: 10, received: 6, missing: 4
  })
})

test('sans réponse attendue les deux jauges restent vides, sans faux pourcentage', t => {
  const markup = html(Progress, {summary: {expectedCount: 0, receivedCount: 0}})
  t.true(markup.includes('Aucune réponse attendue'))
  t.is((markup.match(/role="img"/g) || []).length, 2)
  t.false(markup.includes('width:'))
  t.false(markup.includes('NaN'))
})

test('la légende reste visible et les comptes sont compréhensibles sans les couleurs', t => {
  const markup = html(Progress, {summary: {byKind: {NEEDS: {expectedCount: 3, receivedCount: 2, correctionCount: 1}, INDEX: {expectedCount: 1, receivedCount: 1, correctionCount: 0}}}})
  t.true(markup.includes('2 reçues · 1 attendue'))
  t.true(markup.includes('1 reçue · 0 attendue'))
  t.regex(markup, /<p[^>]*>2 reçues · 1 attendue<\/p>/)
  t.regex(markup, /<ul[^>]*aria-label="Légende des réponses"/)
  t.is((markup.match(/<li\b/g) || []).length, 2)
  t.true(markup.includes('Reçues</li>'))
  t.true(markup.includes('Attendues</li>'))
  t.notRegex(markup, /correction|Correction|background-action-high-warning/)
})

test('les bornes assurent deux segments positifs dont le total vaut les réponses attendues', t => {
  for (const input of [
    {expectedCount: 10, receivedCount: 10, correctionCount: 10},
    {expectedCount: 10, receivedCount: 20, correctionCount: 30},
    {expectedCount: 10, receivedCount: 4, correctionCount: 8},
    {expectedCount: 10, receivedCount: -3, correctionCount: -2},
    {expectedCount: 0, receivedCount: 5, correctionCount: 3},
    {expectedCount: -1, receivedCount: 5, correctionCount: 3}
  ]) {
    const counts = campaignProgressCounts(input)
    t.is(counts.received + counts.missing, counts.expected)
    t.true(Object.values(counts).every(count => count >= 0 && Number.isFinite(count)))
  }

  t.deepEqual({...campaignProgressCounts({expectedCount: 10, receivedCount: 10, correctionCount: 10})}, {
    expected: 10, received: 10, missing: 0
  })
  t.deepEqual({...campaignProgressCounts()}, {
    expected: 0, received: 0, missing: 0
  })
})

test('les statistiques n’ajoutent aucun état de correction ni de validation technique', t => {
  const markup = html(Progress, {summary})
  for (const label of ['Correction', 'correction', 'Invalide', 'Erreur de saisie', 'Contrôle échoué', 'À corriger']) {
    t.false(markup.includes(label))
  }
})

test('le nombre de corrections ne change ni les reçues ni les couleurs, en liste comme en détail', t => {
  for (const correctionCount of [0, 2, 10, 50, -1, Number.NaN]) {
    t.deepEqual({...campaignProgressCounts({expectedCount: 10, receivedCount: 10, correctionCount})}, {
      expected: 10, received: 10, missing: 0
    })
    for (const compact of [false, true]) {
      const markup = html(Progress, {
        compact, summary: {
          byKind: {
            INDEX: {expectedCount: 10, receivedCount: 10, correctionCount},
            NEEDS: {expectedCount: 10, receivedCount: 10, correctionCount}
          }
        }
      })
      t.is((markup.match(/style="width:100%"/g) || []).length, 2)
      t.true(markup.includes('10 reçues · 0 attendue'))
      t.notRegex(markup, /Correction|correction|background-action-high-warning/)
    }
  }
})

test('la jauge explicite un périmètre partiel et distingue chargement et erreur', t => {
  t.true(html(Progress, {summary: {...summary, scopeComplete: false}}).includes('autorisé à suivre'))
  const loading = html(Progress, {loading: true})
  t.true(loading.includes('role="status"'))
  t.true(loading.includes('Chargement de la progression'))
  const failed = html(Progress, {error: 'forbidden', onRetry() {}})
  t.true(failed.includes('role="alert"'))
  t.true(failed.includes('Réessayer'))
  t.false(failed.includes('role="img"'))
  t.is(html(Progress, {}), '')
})
