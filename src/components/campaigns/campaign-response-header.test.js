import React from 'react'

import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {runInNewContext} from 'node:vm'

import test from 'ava'
import {transformSync} from 'next/dist/build/swc/index.js'
import {renderToStaticMarkup} from 'react-dom/server'

import * as campaignCalendar from '../../lib/campaign-calendar.js'
import * as campaignHelpers from '../../lib/collection-campaigns.js'

const require = createRequire(import.meta.url)
const filename = new URL('campaign-response-header.js', import.meta.url)
const {code} = transformSync(readFileSync(filename, 'utf8'), {filename: filename.pathname, jsc: {parser: {syntax: 'ecmascript', jsx: true}, transform: {react: {runtime: 'automatic'}}, target: 'es2022'}, module: {type: 'commonjs'}})
const compiledModule = {exports: {}}
runInNewContext('(function(require, module, exports) {' + code + '\n})', {})(specifier => {
  if (specifier === '@/lib/collection-campaigns.js') {
    return campaignHelpers
  }

  if (specifier === '@/lib/campaign-calendar.js') {
    return campaignCalendar
  }

  if (specifier.startsWith('@/')) {
    throw new Error('L’en-tête ne doit importer aucune action ni service réseau')
  }

  return require(specifier)
}, compiledModule, compiledModule.exports)
const Component = compiledModule.exports.default
const campaign = {
  name: 'Collecte du bassin 2026', year: 2026, timezone: 'Europe/Paris', owner: {label: 'Syndicat du bassin'},
  indexDates: ['2025-11-01', '2026-06-01', '2026-11-01'],
  periods: [
    {kind: 'INDEX', startReadingDate: '2025-11-01', endReadingDate: '2026-11-01'},
    {kind: 'NEEDS', startDate: '2027-06-01', endDate: '2027-11-01'}
  ]
}
const render = (overrides = {}) => renderToStaticMarkup(React.createElement(Component, {
  campaign, kind: 'INDEX', ...overrides
}))

for (const [kind, title] of [['INDEX', 'Relevés de compteurs'], ['NEEDS', 'Besoins en eau']]) {
  test(`l’en-tête ${kind} présente un seul titre puis le nom exact de la campagne`, t => {
    const before = structuredClone(campaign)
    const html = render({kind})
    t.true(html.startsWith('<header class="mb-5 mt-4 min-w-0 border border-gray-200 bg-white p-4 md:p-5">'))
    t.is((html.match(/<h1\b/g) || []).length, 1)
    t.true(html.includes(`<h1 class="fr-h3 fr-mb-1v break-words">${title}</h1>`))
    t.true(html.includes('<p class="fr-text--sm fr-mb-0 max-w-3xl break-words text-gray-700">Collecte du bassin 2026</p>'))
    t.is((html.match(/Collecte du bassin 2026/g) || []).length, 1)
    t.false(html.includes('(2026)'))
    t.true(html.indexOf('<h1 ') < html.indexOf('Collecte du bassin 2026'))
    t.notRegex(html, /border-l|rounded|shadow|bg-blue|text-blue/)
    t.true(html.includes('gap-y-1 text-xs text-gray-600'))
    t.notRegex(html, /<(?:button|input|select|textarea|a)\b|onClick|Enregistrement automatique/)
    t.notRegex(html, /\d{1,16} points? concernés?/)
    t.deepEqual(campaign, before)
  })
}

test('l’organisme propriétaire prime sur le contact et le contact fournit le libellé de secours', t => {
  const withBoth = render({campaign: {...campaign, ownerContact: {label: 'Collecteur de secours'}}})
  t.true(withBoth.includes('Collecteur : <strong class="font-medium">Syndicat du bassin</strong>'))
  t.false(withBoth.includes('Collecteur de secours'))
  const fallback = render({campaign: {...campaign, owner: null, ownerContact: {label: 'Collecteur de secours'}}})
  t.true(fallback.includes('<strong class="font-medium">Collecteur de secours</strong>'))
  t.false(fallback.includes('Syndicat du bassin'))
})

test('les informations absentes ne créent ni organisme fictif, ni échéance, ni message vide', t => {
  const html = render({campaign: {name: 'Campagne', year: 2026}})
  t.notRegex(html, /Collecteur|undefined|null|Date limite de réponse|whitespace-pre-wrap|<time/)
  t.notRegex(html, /(?:Relevés|Besoins) (?:du|le) |points? concernés?/)
  const empty = render({campaign: {...campaign, closesAt: null, openingMessage: ''}})
  t.notRegex(empty, /Date limite de réponse|whitespace-pre-wrap|border-t|<time/)
})

test('les relevés utilisent les dates extrêmes du volet sans dépendre de leur ordre ni des périodes de besoins', t => {
  const input = {...campaign, indexDates: ['2026-11-01', '2026-06-01', '2025-11-01']}
  const before = structuredClone(input)
  const html = render({campaign: input})
  t.true(html.includes('<p class="fr-mb-0 min-w-0 break-words">Relevés du 1 novembre 2025 au 1 novembre 2026</p>'))
  t.false(html.includes('2027'))
  t.notRegex(html, /inclus|points? concernés?/)
  t.deepEqual(input, before)
})

test('les périodes INDEX fournissent les bornes de relevé en absence de dates directes valides', t => {
  const html = render({
    campaign: {
      ...campaign,
      indexDates: ['invalide', '2026-02-30'],
      periods: [
        {kind: 'NEEDS', startReadingDate: '2020-01-01', endReadingDate: '2030-01-01'},
        {kind: 'INDEX', startReadingDate: '2026-06-01', endReadingDate: '2026-11-01'},
        {kind: 'INDEX', startReadingDate: '2025-11-01', endReadingDate: '2026-06-01'}
      ]
    }
  })
  t.true(html.includes('Relevés du 1 novembre 2025 au 1 novembre 2026'))
  t.notRegex(html, /2020|2030|Date invalide|Non renseignée/)
})

test('les dates directes de relevé priment sur le calendrier historique des périodes INDEX', t => {
  const html = render({
    campaign: {
      ...campaign,
      indexDates: ['2026-04-01', '2026-10-01'],
      periods: [{kind: 'INDEX', startReadingDate: '2020-01-01', endReadingDate: '2030-01-01'}]
    }
  })
  t.true(html.includes('Relevés du 1 avril 2026 au 1 octobre 2026'))
  t.notRegex(html, /2020|2030/)
})

test('les besoins résument leurs seules périodes et convertissent la dernière borne exclusive sans suffixe technique', t => {
  const input = {
    ...campaign, periods: [
      {kind: 'NEEDS', startDate: '2027-08-01', endDate: '2027-11-01'},
      {kind: 'INDEX', startDate: '2020-01-01', endDate: '2030-01-01'},
      {kind: 'NEEDS', startDate: '2027-06-01', endDate: '2027-08-01'}
    ]
  }
  const before = structuredClone(input)
  const html = render({kind: 'NEEDS', campaign: input})
  t.true(html.includes('<p class="fr-mb-0 min-w-0 break-words">Besoins du 1 juin 2027 au 31 octobre 2027</p>'))
  t.notRegex(html, /2020|2030|1 novembre 2027|inclus|points? concernés?/)
  t.deepEqual(input, before)
})

for (const [kind, dates, label] of [
  ['INDEX', {indexDates: ['2026-04-01', '2026-04-01']}, 'Relevés le 1 avril 2026'],
  ['NEEDS', {periods: [{kind: 'NEEDS', startDate: '2028-02-29', endDate: '2028-03-01'}]}, 'Besoins le 29 février 2028']
]) {
  test(`un seul jour est présenté sans fausse plage : ${kind}`, t => {
    const html = render({kind, campaign: {...campaign, ...dates}})
    t.true(html.includes(`<p class="fr-mb-0 min-w-0 break-words">${label}</p>`))
    t.notRegex(html, /inclus|(?:Relevés|Besoins) du /)
  })
}

for (const kind of ['INDEX', 'NEEDS']) {
  test(`aucune période ${kind} n’est inventée à partir de bornes absentes ou invalides`, t => {
    const html = render({
      kind, campaign: {
        name: 'Campagne',
        indexDates: ['', null, 'invalide', '2026-02-30'],
        periods: [
          {kind, startDate: '2026-11-01', endDate: '2026-06-01'},
          {kind, startDate: '2026-02-30', endDate: '2026-03-01'},
          {kind, startDate: '2026-06-01'},
          {kind, endDate: '2026-11-01'},
          {kind, startReadingDate: '2026-02-30', endReadingDate: 'invalide'}
        ]
      }
    })
    t.notRegex(html, /(?:Relevés|Besoins) (?:du|le) |Date invalide|Non renseignée|undefined|null|points? concernés?/)
  })
}

test('l’échéance conserve son instant exact et affiche le dernier jour de réponse dans le fuseau de campagne', t => {
  const closesAt = '2026-10-31T23:00:00.000Z'
  const html = render({campaign: {...campaign, closesAt}})
  t.true(html.includes('<div class="min-w-0 md:max-w-xs md:shrink-0 md:pt-1">'))
  t.true(html.includes('<p class="fr-text--xs fr-mb-1v text-gray-600">Date limite de réponse</p>'))
  t.true(html.includes(`<time dateTime="${closesAt}">31 octobre 2026</time>`))
  t.is((html.match(/<time\b/g) || []).length, 1)
  t.true(html.indexOf('Syndicat du bassin') < html.indexOf('Date limite de réponse'))
  t.notRegex(html, /border-l|rounded|shadow|bg-blue|text-blue/)
})

test('une échéance en cours de journée garde l’heure de campagne', t => {
  const html = render({campaign: {...campaign, closesAt: '2026-09-30T15:00:00.000Z'}})
  t.true(html.includes('30 septembre 2026 à 17:00'))
})

test('le message organisateur est séparé des métadonnées et affiché comme texte sans interpréter de HTML', t => {
  const openingMessage = 'Première consigne.\n<script>Ne pas exécuter</script>'
  const html = render({campaign: {...campaign, openingMessage}})
  t.true(html.includes('<div class="mt-3 border-t border-gray-100 pt-3"><p class="fr-text--sm fr-mb-0 max-w-3xl break-words whitespace-pre-wrap text-gray-700">Première consigne.\n&lt;script&gt;Ne pas exécuter&lt;/script&gt;</p></div>'))
  t.false(html.includes('<script>'))
  t.is((html.match(/Première consigne\./g) || []).length, 1)
  t.true(html.indexOf('Syndicat du bassin') < html.indexOf('Première consigne.'))
})
