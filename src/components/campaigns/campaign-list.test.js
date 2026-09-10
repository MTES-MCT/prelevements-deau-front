import React from 'react'

import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {runInNewContext} from 'node:vm'

import test from 'ava'
import {transformSync} from 'next/dist/build/swc/index.js'
import {renderToStaticMarkup} from 'react-dom/server'

import * as calendarHelpers from '../../lib/campaign-calendar.js'
import * as timelineHelpers from '../../lib/campaign-timeline.js'
import * as campaignHelpers from '../../lib/collection-campaigns.js'

const require = createRequire(import.meta.url)
const load = (name = 'campaign-list', overrides = {}, globals = {}) => {
  const filename = new URL(`${name}.js`, import.meta.url)
  const {code} = transformSync(readFileSync(filename, 'utf8'), {filename: filename.pathname, jsc: {parser: {syntax: 'ecmascript', jsx: true}, transform: {react: {runtime: 'automatic'}}, target: 'es2022'}, module: {type: 'commonjs'}})
  const compiledModule = {exports: {}}
  const imports = {
    '@/lib/campaign-calendar.js': calendarHelpers,
    '@/lib/campaign-timeline.js': timelineHelpers,
    '@/lib/collection-campaigns.js': campaignHelpers,
    'next/link': ({children, ...props}) => React.createElement('a', props, children),
    ...overrides
  }
  runInNewContext('(function(require, module, exports) {' + code + '\n})', globals)(specifier => {
    if (specifier === '@/components/campaigns/campaign-ui.js' || specifier === '@/components/campaigns/campaign-progress.js') {
      return load(specifier.split('/').at(-1).replace('.js', ''), overrides, globals)
    }

    if (specifier.includes('/server/') || specifier.includes('fetch')) {
      throw new Error('Aucun chargement réseau dans la liste')
    }

    return imports[specifier] || require(specifier)
  }, compiledModule, compiledModule.exports)
  return compiledModule.exports
}

const components = load()
const now = '2026-09-10T09:00:00Z'
const target = (id, preleveurUserId = 'farmer-a') => ({id: `target-${id}`, pointPrelevementId: id, preleveurUserId})
const fixture = extra => ({
  id: 'campaign-id', name: 'Collecte de la vallée', year: 2026, status: 'OPEN', timezone: 'Europe/Paris',
  owner: {userId: 'owner-secret-id', label: 'Syndicat de la vallée'},
  zone: {id: 'zone-secret-id', name: 'Vallée du fleuve', type: 'SAGE'},
  opensAt: '2026-06-01T07:00:00Z', closesAt: '2026-11-01T23:00:00Z',
  indexDates: ['2025-10-31', '2026-06-01', '2026-10-31'],
  periods: [
    {
      id: 'index-period', kind: 'INDEX', startDate: '2025-10-31', endDate: '2026-06-01'
    },
    {
      id: 'need-period', kind: 'NEEDS', startDate: '2027-06-01', endDate: '2027-11-01'
    }
  ],
  targets: [target('point-a'), target('point-b'), target('point-c', 'farmer-b')], ...extra
})
const card = (campaign = fixture(), extra = {}) => renderToStaticMarkup(React.createElement(components.CampaignManagementListCard, {item: {campaign, ...extra}, now}))
const list = props => renderToStaticMarkup(React.createElement(components.default, props))
const visibleText = markup => markup.replaceAll(/<[^>]*>/g, '')
const progress = {
  expectedCount: 10, receivedCount: 7, correctionCount: 2, scopeComplete: true,
  byKind: {
    INDEX: {expectedCount: 5, receivedCount: 4, correctionCount: 0},
    NEEDS: {expectedCount: 5, receivedCount: 3, correctionCount: 2}
  }
}

test('les cartes exposent les libellés métier et les effectifs déjà autorisés, sans identifiants', t => {
  const markup = card()
  for (const text of ['Collecte de la vallée', 'Année 2026', 'Syndicat de la vallée', 'Vallée du fleuve', 'Dans votre périmètre', '3 points', '2 préleveurs', 'Saisie ouverte', 'Consulter le suivi']) {
    t.true(markup.includes(text), `${text}`)
  }

  for (const technical of ['owner-secret-id', 'zone-secret-id', 'SAGE', 'target-point-a', 'farmer-a', 'campaign-id']) {
    t.false(visibleText(markup).includes(technical), `${technical}`)
  }

  t.true(markup.includes('href="/campagnes/campaign-id"'))
  t.true(markup.includes('fr-sr-only'))
  t.false(markup.includes('Les préleveurs peuvent répondre.'))
  t.false(markup.includes('réponses reçues'))
})

test('le périmètre explicite, même vide, prime et les compteurs dédupliquent points et préleveurs', t => {
  const markup = card(fixture(), {targets: [target('point-a'), target('point-a'), target('point-b')]})
  t.true(markup.includes('2 points'))
  t.true(markup.includes('1 préleveur'))
  t.false(markup.includes('3 points'))
  const empty = card(fixture(), {targets: []})
  t.true(empty.includes('0 point'))
  t.false(empty.includes('3 points'))
  t.false(empty.includes('préleveurs'))
})

test('les effectifs absents ne deviennent pas des zéros et les champs manquants restent explicites', t => {
  const markup = card(fixture({targets: undefined, owner: {userId: 'secret'}, zone: {id: 'secret'}}))
  for (const text of ['Points non renseignés', 'Collecteur non renseigné', 'Territoire non renseigné']) {
    t.true(markup.includes(text))
  }

  t.false(markup.includes('0 point'))
  t.false(visibleText(markup).includes('secret'))
  const partialIdentity = card(fixture({targets: [{pointPrelevement: {id: 'point'}}]}))
  t.true(partialIdentity.includes('1 point'))
  t.false(partialIdentity.includes('0 préleveur'))
})

test('les calendriers affichent chaque date de relevé et chaque période de besoins avec leur fin effective', t => {
  const markup = card()
  for (const text of ['Relevés de compteurs', '31 octobre 2025', '1 juin 2026', '31 octobre 2026', 'Besoins en eau', 'Du 1 juin 2027 au 31 octobre 2027']) {
    t.true(markup.includes(text), `${text}`)
  }

  t.false(markup.includes('1 novembre 2027'))
  t.false(markup.includes('Du 31 octobre 2025 au 31 octobre 2026'))
  t.is(markup.match(/Date limite de réponse/g).length, 1)
  t.true(markup.includes('Date limite de réponse : <strong>1 novembre 2026</strong>'))
})

test('plusieurs périodes de besoins séparées ne sont pas présentées comme une période continue', t => {
  const campaign = fixture({
    periods: [
      {kind: 'NEEDS', startDate: '2027-06-01', endDate: '2027-07-01'},
      {kind: 'NEEDS', startDate: '2028-09-01', endDate: '2028-11-01'}
    ]
  })
  const markup = card(campaign)
  t.true(markup.includes('Du 1 juin 2027 au 30 juin 2027'))
  t.true(markup.includes('Du 1 septembre 2028 au 31 octobre 2028'))
  t.false(markup.includes('Entre le 1 juin 2027 et le 31 octobre 2028'))
  t.false(markup.includes('Du 1 juin 2027 au 31 octobre 2028'))
})

test('les repères différencient une date d’un intervalle sans répéter les informations aux lecteurs d’écran', t => {
  const markup = card()
  t.true(markup.includes('aria-label="Dates de relevé"'))
  t.true(markup.includes('aria-label="Périodes de besoin"'))
  t.is((markup.match(/<circle\b/g) || []).length, 3)
  t.is((markup.match(/<path\b/g) || []).length, 1)
  const marks = [...markup.matchAll(/<svg\b[^>]*>/g)].map(match => match[0])
  t.is(marks.length, 4)
  for (const mark of marks) {
    t.true(mark.includes('aria-hidden="true"'))
    t.true(mark.includes('focusable="false"'))
  }

  for (const date of ['2025-10-31', '2026-06-01', '2026-10-31']) {
    t.true(markup.includes(`<time dateTime="${date}">`))
  }
})

test('les jours civils, les doublons et les dates incomplètes restent traités sans faux calendrier', t => {
  const summary = components.campaignListCalendar({
    indexDates: ['2026-06-01T00:00:00.000Z', '2026-06-01', 'impossible'],
    periods: [{kind: 'NEEDS', startDate: '2027-06-01', endDate: '2027-11-01'}, {kind: 'NEEDS', startDate: '', endDate: ''}]
  })
  t.deepEqual([...summary.readingDates], ['2026-06-01'])
  t.deepEqual(summary.needPeriods.map(period => ({...period})), [{start: '2027-06-01', end: '2027-10-31'}])
  t.true(summary.readingsIncomplete)
  t.true(summary.needsIncomplete)
  const empty = card(fixture({indexDates: [], periods: []}))
  t.true(empty.includes('Dates à préciser'))
  t.true(empty.includes('Périodes à préciser'))
  t.false(empty.includes('0 date'))
  t.false(empty.includes('Date invalide'))
})

test('le calendrier trie et déduplique les relevés sans modifier les dates de la campagne', t => {
  const campaign = fixture({
    indexDates: ['2026-10-31', '2026-06-01T00:00:00.000Z', '2025-10-31', '2026-06-01', '2026-06-01T00:00:00Z']
  })
  const before = structuredClone(campaign)
  const result = components.campaignListCalendar(campaign)
  t.deepEqual([...result.readingDates], ['2025-10-31', '2026-06-01', '2026-10-31'])
  t.false(result.readingsIncomplete)
  t.false(result.needsIncomplete)
  const markup = card(campaign)
  t.is((markup.match(/1 juin 2026/g) || []).length, 1)
  t.true(markup.indexOf('31 octobre 2025') < markup.indexOf('1 juin 2026'))
  t.true(markup.indexOf('1 juin 2026') < markup.indexOf('31 octobre 2026'))
  t.deepEqual(campaign, before)
})

test('chaque période de besoins reste distincte et les bornes exclues deviennent des jours civils', t => {
  const campaign = fixture({
    periods: [
      {kind: 'NEEDS', startDate: '2028-02-29', endDate: '2028-03-01'},
      {kind: 'INDEX', startDate: '2020-01-01', endDate: '2030-01-01'},
      {kind: 'NEEDS', startDate: '2027-09-01', endDate: '2027-11-01'},
      {kind: 'NEEDS', startDate: '2027-06-01', endDate: '2027-07-01'}
    ]
  })
  const before = structuredClone(campaign)
  const result = components.campaignListCalendar(campaign)
  t.deepEqual(result.needPeriods.map(period => ({...period})), [
    {start: '2027-06-01', end: '2027-06-30'},
    {start: '2027-09-01', end: '2027-10-31'},
    {start: '2028-02-29', end: '2028-02-29'}
  ])
  t.false(result.needsIncomplete)
  const markup = card(campaign)
  t.true(markup.includes('Du 1 juin 2027 au 30 juin 2027'))
  t.true(markup.includes('Du 1 septembre 2027 au 31 octobre 2027'))
  t.true(markup.includes('Le 29 février 2028'))
  t.notRegex(markup, /2020|2030|1 mars 2028|inclus/)
  t.deepEqual(campaign, before)
})

test('les dates incomplètes sont signalées sans cacher les relevés ou périodes valides', t => {
  const campaign = fixture({
    indexDates: ['2026-06-01', '2026-02-30', '2026-06-01T01:00:00Z', null, ''],
    periods: [
      {kind: 'NEEDS', startDate: '2027-06-01', endDate: '2027-07-01'},
      {kind: 'NEEDS', startDate: '2027-02-30', endDate: '2027-03-01'},
      {kind: 'NEEDS', startDate: '2027-06-01', endDate: '2027-06-01'},
      {kind: 'NEEDS', startDate: '2027-06-01', endDate: '2027-05-01'},
      {kind: 'NEEDS', startDate: '2027-06-01'}
    ]
  })
  const result = components.campaignListCalendar(campaign)
  t.deepEqual([...result.readingDates], ['2026-06-01'])
  t.deepEqual(result.needPeriods.map(period => ({...period})), [{start: '2027-06-01', end: '2027-06-30'}])
  t.true(result.readingsIncomplete)
  t.true(result.needsIncomplete)
  const markup = card(campaign)
  for (const text of ['1 juin 2026', 'Du 1 juin 2027 au 30 juin 2027', 'Dates à préciser', 'Périodes à préciser']) {
    t.true(markup.includes(text), `${text}`)
  }

  t.notRegex(markup, /Date invalide|undefined|NaN|inclus/)
})

test('l’état de saisie respecte ouverture, échéance exclusive et clôture', t => {
  for (const [changes, label] of [
    [{opensAt: '2026-10-01T07:00:00Z'}, 'Saisie à venir'],
    [{closesAt: now}, 'Date limite dépassée'],
    [{closesAt: '2026-08-01T07:00:00Z'}, 'Date limite dépassée'],
    [{status: 'CLOSED', closedAt: '2026-09-01T07:00:00Z'}, 'Saisie terminée'],
    [{status: 'DRAFT'}, 'Campagne en préparation']
  ]) {
    const markup = card(fixture(changes))
    t.true(markup.includes(label), `${label}`)
    t.false(markup.includes('Saisie ouverte'), `${label}`)
  }

  t.true(card().includes('fr-badge--success'))
  t.true(card(fixture({closesAt: now})).includes('fr-badge--warning'))
})

test('les dates de réponse utilisent le fuseau campagne, y compris aux passages à minuit', t => {
  const paris = card(fixture({status: 'DRAFT', opensAt: '2026-07-12T22:30:00Z', closesAt: '2026-07-13T22:00:00Z'}))
  t.true(paris.includes('13 juillet 2026 à 00:30'))
  t.true(paris.includes('<strong>13 juillet 2026</strong>'))
  const negative = card(fixture({
    status: 'DRAFT', timezone: 'America/Martinique', opensAt: '2026-07-13T01:30:00Z', closesAt: '2026-07-14T04:00:00Z'
  }))
  t.true(negative.includes('12 juillet 2026 à 21:30'))
  t.true(negative.includes('<strong>13 juillet 2026</strong>'))
})

test('les informations incomplètes ne font pas planter toute la liste', t => {
  const markup = card(fixture({timezone: 'invalid-zone', closesAt: 'invalid-date', status: 'TECHNICAL_STATE'}))
  t.true(markup.includes('État à vérifier'))
  t.true(markup.includes('Date à préciser'))
  t.false(markup.includes('TECHNICAL_STATE'))
  const draft = card(fixture({status: 'DRAFT', opensAt: null, closesAt: null}))
  t.true(draft.includes('Ouverture à votre initiative'))
  t.true(draft.includes('Aucune date limite de réponse définie'))
})

test('le lien de préparation dépend toujours des droits, indépendamment des autres permissions', t => {
  const campaign = fixture({status: 'DRAFT'})
  for (const permissions of [{canManage: false}, {canExport: true}, {canRead: true}, {}]) {
    const markup = card(campaign, {permissions})
    t.false(markup.includes('Préparer la campagne'))
    t.true(markup.includes('Consulter le suivi'))
  }

  t.true(card(campaign, {permissions: {canManage: true}}).includes('Préparer la campagne'))
  t.true(card({...campaign, permissions: {canManage: true}}).includes('Préparer la campagne'))
  t.false(card(fixture(), {permissions: {canManage: true}}).includes('Préparer la campagne'))
})

test('la progression compacte reprend les réponses autorisées du serveur, sans les déduire des points', t => {
  const data = {targets: [target('point-unique')], permissions: {canFollowup: true}, progress}
  const before = structuredClone(data)
  const markup = card(fixture(), data)
  t.true(markup.includes('Avancement des réponses'))
  t.true(markup.includes('grid'))
  t.true(markup.includes('sm:grid-cols-2'))
  t.is((markup.match(/role="img"/g) || []).length, 2)
  t.true(markup.includes('aria-label="Relevés de compteurs : 4 reçues · 1 attendue"'))
  t.true(markup.includes('aria-label="Besoins en eau : 3 reçues · 2 attendues"'))
  t.notRegex(markup, /Correction|correction|background-action-high-warning/)
  t.is((markup.match(/5 réponses/g) || []).length, 2)
  t.false(markup.includes('1 réponse'))
  t.deepEqual(data, before)
})

test('la progression exige le droit de suivi explicite et un état de campagne publié', t => {
  for (const permissions of [{canFollowup: false}, {canManage: true}, {canExport: true}, {canRead: true}, {canFollowup: 'true'}, {}]) {
    const markup = card(fixture(), {permissions, progress})
    t.notRegex(markup, /Avancement des réponses|role="img"|4 reçues|5 réponses/)
  }

  for (const status of ['DRAFT', 'TECHNICAL_STATE']) {
    const markup = card(fixture({status}), {permissions: {canFollowup: true}, progress})
    t.notRegex(markup, /Avancement des réponses|role="img"|4 reçues|5 réponses/)
  }

  for (const status of ['OPEN', 'CLOSED']) {
    t.true(card(fixture({status}), {permissions: {canFollowup: true}, progress}).includes('Avancement des réponses'))
  }
})

test('un refus de suivi dans le périmètre explicite ne reprend pas un ancien droit global', t => {
  const campaign = fixture({permissions: {canFollowup: true}})
  t.false(card(campaign, {permissions: {canFollowup: false}, progress}).includes('Avancement des réponses'))
})

test('une progression absente ne devient pas une fausse absence de réponses', t => {
  for (const value of [undefined, null]) {
    const markup = card(fixture(), {permissions: {canFollowup: true}, progress: value})
    t.notRegex(markup, /Avancement des réponses|role="img"|Aucune réponse attendue|Chargement de la progression/)
  }
})

test('la progression partielle conserve son périmètre déclaré sans compléter les chiffres', t => {
  const markup = card(fixture(), {
    permissions: {canFollowup: true},
    progress: {...progress, scopeComplete: false},
    targets: [target('point-unique')]
  })
  t.true(markup.includes('Progression sur les points que vous êtes autorisé à suivre.'))
  t.true(markup.includes('1 point'))
  t.true(markup.includes('aria-label="Relevés de compteurs : 4 reçues · 1 attendue"'))
  const complete = card(fixture(), {permissions: {canFollowup: true}, progress})
  t.false(complete.includes('Progression sur les points que vous êtes autorisé à suivre.'))
})

test('la liste ne charge rien et son rendu initial ne suppose pas une saisie ouverte', t => {
  const markup = list({embedded: true, data: {items: [{campaign: fixture()}], permissions: {canCreate: false}}})
  t.true(markup.includes('Campagne ouverte'))
  t.false(markup.includes('Saisie ouverte'))
  t.false(markup.includes('<h1'))
  t.false(markup.includes('href="/campagnes/nouvelle"'))
  const direct = list({data: [fixture()]})
  t.true(direct.includes('Syndicat de la vallée'))
})

test('plusieurs jauges fournies par la liste sont rendues sans aucune requête supplémentaire', t => {
  const calls = []
  const component = load('campaign-list', {}, {
    fetch(...args) {
      calls.push(args)
      throw new Error('Aucune requête par carte')
    }
  }).default
  const items = Array.from({length: 8}, (_, index) => ({
    campaign: fixture({id: `campaign-${index}`}), permissions: {canFollowup: true}, progress
  }))
  const markup = renderToStaticMarkup(React.createElement(component, {embedded: true, data: {items}}))
  t.is((markup.match(/Avancement des réponses/g) || []).length, 8)
  t.is((markup.match(/role="img"/g) || []).length, 16)
  t.deepEqual(calls, [])
})

test('création, erreur et liste vide conservent les droits et leurs explications', t => {
  const data = {items: [], permissions: {canCreate: true}}
  t.true(list({data}).includes('Créer une campagne de collecte'))
  t.true(list({data}).includes('Préparer votre première collecte'))
  t.false(list({data}).includes('La création enregistre un brouillon'))
  const error = list({data, error: 'Accès refusé'})
  t.true(error.includes('role="alert"'))
  t.false(error.includes('href="/campagnes/nouvelle"'))
  t.false(error.includes('Préparer votre première collecte'))
  t.true(list({data: {items: [], permissions: {canCreate: false}}}).includes('Aucune campagne disponible pour votre compte.'))
})

test('les cartes déclarant gardent leur affichage et masquent les brouillons', t => {
  for (const [kind, route] of [['INDEX', '/mes-index'], ['NEEDS', '/mes-besoins']]) {
    const markup = list({kind, data: {items: [fixture({id: 'draft', status: 'DRAFT', name: 'Brouillon invisible'}), fixture({id: 'closed', status: 'CLOSED'})], permissions: {canCreate: true}}})
    t.false(markup.includes('Brouillon invisible'))
    t.false(markup.includes('Dans votre périmètre'))
    t.false(markup.includes('Syndicat de la vallée'))
    t.false(markup.includes('href="/campagnes/nouvelle"'))
    t.true(markup.includes(`href="${route}/closed"`))
    t.true(markup.includes('Consulter mes réponses'))
  }
})

test('la progression transmise avec une campagne déclarant reste masquée dans ses cartes', t => {
  for (const kind of ['INDEX', 'NEEDS']) {
    const markup = list({kind, data: {items: [{campaign: fixture(), permissions: {canFollowup: true}, progress}]}})
    t.notRegex(markup, /Avancement des réponses|role="img"|4 reçues|5 réponses/)
  }
})

test('une seule horloge locale est nettoyée et ne tourne pas pour erreurs, listes vides ou déclarants', t => {
  for (const extra of [{}, {kind: 'INDEX'}, {error: 'Indisponible'}, {data: {items: []}}]) {
    const effects = []
    const updates = []
    const timers = []
    const cleared = []
    const component = load('campaign-list', {
      react: {
        ...React, useState: () => [null, value => updates.push(value)], useEffect: callback => effects.push(callback)
      }
    }, {
      setInterval(callback, delay) {
        timers.push({callback, delay})
        return 12
      },
      clearInterval: id => cleared.push(id)
    }).default
    component({data: {items: [fixture(), fixture({id: 'second'})]}, ...extra})
    t.is(effects.length, 1)
    const cleanup = effects[0]()
    if (Object.keys(extra).length === 0) {
      t.is(updates.length, 1)
      t.is(timers.length, 1)
      t.is(timers[0].delay, 60_000)
      timers[0].callback()
      t.is(updates.length, 2)
      cleanup()
      t.deepEqual(cleared, [12])
    } else {
      t.is(updates.length, 0)
      t.is(timers.length, 0)
      t.is(cleanup, undefined)
    }
  }
})
