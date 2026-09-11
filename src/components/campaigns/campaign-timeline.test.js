import React from 'react'

import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {runInNewContext} from 'node:vm'

import test from 'ava'
import {transformSync} from 'next/dist/build/swc/index.js'
import {renderToStaticMarkup} from 'react-dom/server'

import * as timelineHelpers from '../../lib/campaign-timeline.js'
import * as campaignHelpers from '../../lib/collection-campaigns.js'

const require = createRequire(import.meta.url)
const stylesheet = readFileSync(new URL('campaign-timeline.module.css', import.meta.url), 'utf8')
const styles = Object.fromEntries([...stylesheet.matchAll(/\.([A-Z]\w*)/gi)].map(([, name]) => [name, name]))
const filename = new URL('campaign-timeline.js', import.meta.url)
const {code} = transformSync(readFileSync(filename, 'utf8'), {filename: filename.pathname, jsc: {parser: {syntax: 'ecmascript', jsx: true}, transform: {react: {runtime: 'automatic'}}, target: 'es2022'}, module: {type: 'commonjs'}})
const compiledModule = {exports: {}}
runInNewContext('(function(require, module, exports) {' + code + '\n})', {})(specifier => {
  if (specifier.endsWith('.module.css')) {
    return {__esModule: true, default: styles}
  }

  if (specifier === '@/lib/campaign-timeline.js') {
    return timelineHelpers
  }

  if (specifier === '@/lib/collection-campaigns.js') {
    return campaignHelpers
  }

  return require(specifier)
}, compiledModule, compiledModule.exports)

const render = props => renderToStaticMarkup(React.createElement(compiledModule.exports.CampaignGlobalTimeline, props))
const detailsText = html => html.replaceAll(/<[^<>]+>/g, ' ').replaceAll(/\s+/g, ' ')
const fullYear = {indexDates: ['2026-01-01', '2026-12-31']}
const need = (startDate, endDate, id = 'need') => ({
  id, kind: 'NEEDS', label: `Besoins ${id}`, startDate, endDate
})
const responseDates = {
  timezone: 'Europe/Paris', opensAt: '2026-09-01T00:00', closesAt: '2026-10-01T00:00', reminderDays: [7]
}

test('chaque période indique directement son nom et ses bornes inclusives dans une plage continue', t => {
  const html = render({...fullYear, periods: [need('2026-03-01', '2026-11-01')]})
  t.is((html.match(/class="needPeriod"/g) || []).length, 1)
  t.true(detailsText(html).includes('Du 1 mars 2026 au 31 octobre 2026'))
  t.false(detailsText(html).includes('au 1 novembre 2026'))
  t.regex(html, /class="needPeriod"><strong>Besoins need<\/strong><span>Du <time/)
  t.regex(stylesheet, /\.needPeriod[^}]+border-bottom:[^;]+solid var\(--campaign-needs\)/)
})

test('deux périodes contiguës partagent une plage, sans présenter de jours inexistants', t => {
  const html = render({periods: [need('2026-03-01', '2026-04-01', 'mars'), need('2026-04-01', '2026-05-01', 'avril')]})
  t.is((html.match(/class="needPeriods"/g) || []).length, 1)
  t.is((html.match(/class="needPeriod"/g) || []).length, 2)
  t.true(detailsText(html).includes('Du 1 mars 2026 au 31 mars 2026'))
  t.true(detailsText(html).includes('Du 1 avril 2026 au 30 avril 2026'))
})

test('des périodes séparées ne sont jamais réunies dans une plage continue', t => {
  const html = render({...fullYear, periods: [need('2026-03-01', '2026-04-01', 'printemps'), need('2026-05-01', '2026-06-01', 'été')]})
  t.is((html.match(/class="needPeriods"/g) || []).length, 2)
  t.true(detailsText(html).includes('Du 1 mars 2026 au 31 mars 2026'))
  t.true(detailsText(html).includes('Du 1 mai 2026 au 31 mai 2026'))
})

test('trois rubriques métier remplacent les points numérotés et la légende à décoder', t => {
  const html = render({...fullYear, ...responseDates, periods: [need('2026-03-01', '2026-11-01')]})
  t.is((html.match(/class="lane"/g) || []).length, 3)
  for (const title of ['Relevés à fournir', 'Besoins à estimer', 'Quand répondre']) {
    t.true(html.includes(title))
  }

  t.notRegex(html, /débit|m³\/h|\bt[1-4]\b|—|title=|aria-hidden|relevé [1-9]|class="(?:axis|readingnumber|responsemarker)"/i)
  t.is((html.match(/class="responseRange"/g) || []).length, 1)
})

test('les dates exactes sont directement visibles et sémantiques sans survol ni légende', t => {
  const html = render({...fullYear, ...responseDates, periods: [need('2026-03-01', '2026-11-01')]})
  const text = detailsText(html)
  for (const date of ['1 janvier 2026', '31 décembre 2026', '1 mars 2026', '31 octobre 2026', '1 septembre 2026', '23 septembre 2026', '30 septembre 2026']) {
    t.true(text.includes(date), `La date ${date} est visible hors survol`)
  }

  t.true(text.includes('Relances prévues si une réponse manque'))
  t.true(text.includes('30 septembre 2026'))
  t.true(html.includes('<time dateTime="2026-09-23">23 septembre 2026</time>'))
  t.notRegex(html, /aria-hidden|<details|title=/)
})

test('une ouverture ou une clôture inconnue ne crée jamais de durée de réponse fictive', t => {
  for (const props of [{}, {opensAt: responseDates.opensAt}, {closesAt: responseDates.closesAt}]) {
    const html = render({...fullYear, ...props})
    t.false(html.includes('class="responseRange"'))
    t.notRegex(html, /NaN|Infinity|width:-/)
  }

  const unknown = detailsText(render(fullYear))
  t.true(unknown.includes('À votre initiative, sans date définie.'))
  t.true(unknown.includes('sans date limite'))
})

test('sans aucune date, le calendrier attend les informations sans inventer de période', t => {
  const html = render({})
  t.true(html.includes('Renseignez des dates pour afficher le calendrier.'))
  t.false(html.includes('class="needPeriod"'))
  t.false(html.includes('class="responseRange"'))
  t.notRegex(html, /NaN|Infinity|width:-/)
})

test('les dates invalides produisent une explication, pas une plage valide', t => {
  for (const props of [
    {indexDates: ['2026-02-30']},
    {opensAt: '2026-02-30T09:00'},
    {closesAt: 'incorrect'},
    {periods: [need('2026-06-01', '2026-05-01')]}
  ]) {
    const html = render(props)
    t.regex(detailsText(html), /corriger|invalide|doit suivre/)
    t.false(html.includes('class="needPeriod"'))
    t.false(html.includes('class="responseRange"'))
    t.notRegex(html, /NaN|Infinity|width:-/)
  }

  const reversed = render({opensAt: '2026-10-01T09:00', closesAt: '2026-09-01T09:00'})
  t.false(reversed.includes('class="responseRange"'))
  t.regex(detailsText(reversed), /précéder/)
})

test('une ouverture effective remplace la date prévue dans la période de réponse', t => {
  const html = render({
    ...fullYear, ...responseDates, status: 'OPEN', openedAt: '2026-09-03T08:00:00Z'
  })
  const text = detailsText(html)
  t.true(text.includes('Ouverture effective 3 septembre 2026'))
  t.true(text.includes('Ouverture au plus tôt initialement prévue : 1 septembre 2026'))
  t.false(text.includes('À votre initiative'))
  t.true(html.includes('class="responseRange"'))
})

test('une date prévue égale à la date effective ne se répète pas', t => {
  const html = render({...responseDates, status: 'OPEN', openedAt: '2026-09-01T08:00:00Z'})
  const text = detailsText(html)
  t.is((text.match(/1 septembre 2026/g) || []).length, 1)
  t.false(text.includes('initialement'))
})

test('une campagne clôturée distingue la clôture réelle de la date limite initiale', t => {
  const html = render({
    ...responseDates, status: 'CLOSED', openedAt: '2026-09-03T08:00:00Z', closedAt: '2026-09-25T08:00:00Z'
  })
  const text = detailsText(html)
  t.true(text.includes('Clôture effective 25 septembre 2026'))
  t.true(text.includes('Date limite initialement prévue : 30 septembre 2026'))
  t.true(html.includes('class="responseRange"'))
})

test('une clôture inconnue ne transforme pas une échéance en clôture effective', t => {
  for (const closesAt of [null, responseDates.closesAt]) {
    const html = render({status: 'CLOSED', openedAt: '2026-09-03T08:00:00Z', closesAt})
    const text = detailsText(html)
    t.notRegex(text, /Clôture effective \d/)
    t.regex(text, /clôture.*non renseignée/i)
    t.false(text.includes('À votre initiative'))
    if (closesAt) {
      t.true(text.includes('Date limite prévue'))
    } else {
      t.false(html.includes('class="responseRange"'))
    }
  }
})

test('sur mobile, la lecture devient verticale sans cacher aucune date ni scroller horizontalement', t => {
  const html = render({...fullYear, ...responseDates, periods: [need('2026-03-01', '2026-11-01')]})
  t.notRegex(stylesheet, /min-width:\s*\d+(?:rem|px)/)
  const mobile = stylesheet.slice(stylesheet.indexOf('@media'))
  t.regex(mobile, /\.readingDates\s*\{[^}]*flex-direction:\s*column/)
  t.regex(mobile, /\.responseRange[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/)
  t.notRegex(mobile, /display:\s*none|visibility:\s*hidden/)
  t.true(detailsText(html).includes('23 septembre 2026'))
  t.true(detailsText(html).includes('31 octobre 2026'))
})

test('les périodes qui se chevauchent restent séparées et toutes lisibles', t => {
  const html = render({...fullYear, periods: [need('2026-03-01', '2026-08-01', 'longs'), need('2026-05-01', '2026-06-01', 'courts')]})
  t.is((html.match(/class="needPeriods"/g) || []).length, 2)
  t.is((html.match(/class="needPeriod"/g) || []).length, 2)
  t.true(detailsText(html).includes('Besoins longs'))
  t.true(detailsText(html).includes('Besoins courts'))
})

test('le tri et le regroupement ne modifient pas les données du formulaire', t => {
  const props = {
    ...responseDates, indexDates: ['2026-12-31', '2026-01-01'], reminderDays: [7, 14], periods: [need('2026-05-01', '2026-06-01', 'courts'), need('2026-03-01', '2026-08-01', 'longs')]
  }
  const before = structuredClone(props)
  render(props)
  t.deepEqual(props, before)
})

test('intégré à la fiche, le calendrier évite un second cadre et titre sans masquer les dates', t => {
  const html = render({...fullYear, ...responseDates, embedded: true})
  t.true(html.includes('class="calendar embedded"'))
  t.false(html.includes('>Calendrier<'))
  t.true(detailsText(html).includes('1 janvier 2026'))
  t.is((html.match(/class="lane"/g) || []).length, 3)
  t.regex(stylesheet, /\.embedded\s*\{[^}]*border:\s*0/)
})

test('les intitulés et dates ne sont pas répétés dans un second récapitulatif', t => {
  const html = render({...fullYear, ...responseDates, periods: [need('2026-03-01', '2026-11-01', 'été')]})
  const text = detailsText(html)
  t.is((text.match(/Besoins été/g) || []).length, 1)
  t.is((text.match(/23 septembre 2026/g) || []).length, 1)
  t.is((text.match(/31 octobre 2026/g) || []).length, 1)
  t.false(html.includes('class="details"'))
})

test('le détail commence par une seule fenêtre de saisie sans répéter les dates ni les relances', t => {
  const html = render({
    ...responseDates, showPosition: true, now: '2026-09-18T10:00:00Z', status: 'OPEN', openedAt: '2026-09-01T08:00:00Z'
  })
  const text = detailsText(html)
  t.regex(text, /Saisie des réponses Encore 12 jours pour répondre/)
  t.notRegex(text, /relance|envoyé|réponse reçue|réponse transmise|Situation au|Saisie ouverte|Aujourd’hui|Temps écoulé/)
  t.notRegex(html, /<progress/)
  t.true(text.indexOf('Date limite de réponse') < text.indexOf('Relevés de compteurs'))
  t.is((text.match(/1 septembre 2026/g) || []).length, 1)
  t.is((text.match(/30 septembre 2026/g) || []).length, 1)
})

test('les relevés restent des dates alignées sans empiler les badges et les phrases d’aide', t => {
  const html = render({
    showPosition: true, now: '2026-09-10T10:00:00Z', status: 'OPEN', indexDates: ['2026-09-01', '2026-09-10', '2026-10-01']
  })
  const text = detailsText(html)
  const dates = /<ol class="detailReadings">(.*?)<\/ol>/.exec(html)[1]
  t.regex(dates, /1 septembre 2026/)
  t.regex(dates, /10 septembre 2026/)
  t.regex(dates, /1 octobre 2026/)
  t.notRegex(dates, /Date passée|Aujourd’hui|À venir|badge|position/)
  t.notRegex(text, /reçu|transmis|terminé|Index des compteurs à chacune/)
  t.notRegex(text, /Aujourd’hui/)
  t.regex(stylesheet, /\.detailReadings > li \+ li::before[^}]+content: "→"/)
})

test('les besoins situent la période en cours en respectant sa fin exclusive et le fuseau de la campagne', t => {
  const props = {
    showPosition: true, now: '2026-09-30T22:30:00Z', status: 'OPEN', timezone: 'Europe/Paris',
    periods: [need('2026-09-01', '2026-10-01', 'septembre'), need('2026-10-01', '2026-11-01', 'octobre'), need('2026-11-01', '2026-12-01', 'novembre')]
  }
  const html = render(props)
  t.regex(html, /class="detailPeriod" data-current="true"><div class="periodHeading"><strong>Besoins octobre<\/strong><span>En cours/)
  t.regex(html, /class="detailPeriod"><div class="periodHeading"><strong>Besoins septembre<\/strong>/)
  t.regex(html, /class="detailPeriod"><div class="periodHeading"><strong>Besoins novembre<\/strong>/)
  t.is((html.match(/data-current="true"/g) || []).length, 1)
  t.regex(detailsText(html), /31 octobre 2026/)
  t.notRegex(detailsText(html), /Passée|À venir/)
  const western = render({...props, timezone: 'America/New_York'})
  t.regex(western, /class="detailPeriod" data-current="true"><div class="periodHeading"><strong>Besoins septembre/)
  t.regex(western, /class="detailPeriod"><div class="periodHeading"><strong>Besoins octobre/)
})

test('une échéance dépassée ne devient pas une clôture effective et ne propose plus de prochaine relance', t => {
  const props = {
    ...responseDates, showPosition: true, now: '2026-10-01T00:00:00Z', openedAt: '2026-09-01T08:00:00Z'
  }
  const expired = detailsText(render({...props, status: 'OPEN'}))
  t.true(expired.includes('Date limite dépassée'))
  t.true(expired.includes('La campagne n’est pas encore clôturée.'))
  t.false(expired.includes('Saisie ouverte'))
  t.false(expired.includes('Prochaine relance prévue'))
  t.false(expired.includes('Clôture effective'))
  const closed = detailsText(render({...props, status: 'CLOSED', closedAt: '2026-09-25T08:00:00Z'}))
  t.true(closed.includes('Clôture effective 25 septembre 2026'))
  t.true(closed.includes('Date limite de réponse 30 septembre 2026'))
  t.false(closed.includes('Date limite dépassée'))
  t.false(closed.includes('Prochaine relance prévue'))
})

test('la configuration et le premier rendu sans horloge ne reçoivent aucun repère temporel', t => {
  for (const props of [
    {now: '2026-09-10T10:00:00Z'},
    {showPosition: false, now: '2026-09-10T10:00:00Z'},
    {showPosition: true, now: null},
    {showPosition: true}
  ]) {
    const html = render({...responseDates, ...fullYear, ...props})
    t.notRegex(html, /<progress|Situation au|Aujourd’hui|Date passée|Prochaine relance prévue/)
  }
})

test('les périodes invalides restent à corriger et ne reçoivent pas d’étiquette temporelle', t => {
  const html = render({showPosition: true, now: '2026-09-10T10:00:00Z', periods: [need('2026-10-01', '2026-09-01')]})
  t.regex(detailsText(html), /Dates à préciser ou à corriger/)
  t.notRegex(html, /data-current="true"|<progress/)
})

test('un brouillon garde une ouverture manuelle, sans progression de saisie fictive', t => {
  const html = render({
    ...responseDates, showPosition: true, status: 'DRAFT', now: '2026-09-10T10:00:00Z'
  })
  const text = detailsText(html)
  t.true(text.includes('Ouverture au plus tôt 1 septembre 2026'))
  t.true(text.includes('L’ouverture reste à déclencher depuis l’onglet Configuration.'))
  t.false(text.includes('Encore'))
  t.false(text.includes('Saisie ouverte'))
  t.notRegex(html, /<progress/)
})

test('une fenêtre sans ouverture ou sans échéance reste explicite sans barre inventée', t => {
  for (const dates of [{}, {opensAt: responseDates.opensAt}, {closesAt: responseDates.closesAt}]) {
    const html = render({
      status: 'OPEN', showPosition: true, now: '2026-09-10T10:00:00Z', ...dates
    })
    t.notRegex(html, /<progress|NaN|Infinity/)
    t.regex(detailsText(html), /Date non renseignée|Aucune date limite définie/)
  }
})

test('les cartes de besoins sont neutres avec un seul accent pour les périodes effectivement en cours', t => {
  t.regex(stylesheet, /\.detailPeriod\s*\{[^}]*background: var\(--background-default-grey/)
  t.regex(stylesheet, /\.detailPeriod\[data-current="true"\]\s*\{[^}]*border-color: var\(--campaign-accent\)/)
  t.notRegex(stylesheet.match(/\.detailPeriod\s*\{[^}]*\}/)[0], /green|success/)
})

test('la fenêtre et les cartes restent compactes sur mobile sans dates masquées', t => {
  const html = render({
    ...responseDates, showPosition: true, status: 'OPEN', now: '2026-09-10T10:00:00Z', ...fullYear, periods: [need('2026-09-01', '2026-10-01')]
  })
  const mobile = stylesheet.slice(stylesheet.indexOf('@media'))
  t.regex(mobile, /\.detailReadings\s*\{[^}]*flex-direction: column/)
  t.regex(mobile, /\.detailReadings > li \+ li::before[^}]+content: "↓"/)
  t.notRegex(mobile, /display:\s*none|visibility:\s*hidden/)
  for (const date of ['1 janvier 2026', '31 décembre 2026', '1 septembre 2026', '30 septembre 2026']) {
    t.true(detailsText(html).includes(date))
  }
})

test('aucun état du calendrier ne présente de repère Aujourd’hui, de jauge temporelle ou de suffixe inclus', t => {
  for (const status of ['DRAFT', 'OPEN', 'CLOSED']) {
    for (const showPosition of [false, true]) {
      const html = render({
        ...responseDates, status, showPosition, now: '2026-09-18T10:00:00Z',
        openedAt: status === 'DRAFT' ? null : '2026-09-03T08:00:00Z',
        closedAt: status === 'CLOSED' ? '2026-09-25T08:00:00Z' : null,
        periods: [need('2026-09-01', '2026-10-01')]
      })
      const text = detailsText(html)
      t.notRegex(html, /<progress|role="progressbar"|timeProgress|detailToday/)
      t.notRegex(text, /aujourd’hui|temps écoulé|\binclus\b/i)
      t.regex(text, /30 septembre 2026/)
      t.notRegex(text, /au 1 octobre 2026/)
    }
  }

  t.notRegex(stylesheet, /detailToday|timeProgress/)
})
