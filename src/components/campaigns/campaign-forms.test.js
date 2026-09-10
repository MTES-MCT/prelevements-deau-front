import React from 'react'

import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {runInNewContext} from 'node:vm'

import test from 'ava'
import {transformSync} from 'next/dist/build/swc/index.js'
import {renderToStaticMarkup} from 'react-dom/server'

import * as campaignCalendar from '../../lib/campaign-calendar.js'
import * as configurationHelpers from '../../lib/campaign-configuration.js'
import * as draftQueue from '../../lib/campaign-draft.js'
import * as meterEventValidation from '../../lib/campaign-meter-event-validation.js'
import * as pointSelectionHelpers from '../../lib/campaign-point-selection.js'
import * as responseMapHelpers from '../../lib/campaign-response-map.js'
import * as responseReadingHelpers from '../../lib/campaign-response-readings.js'
import * as responseRecoveryHelpers from '../../lib/campaign-response-recovery.js'
import * as campaignTimeline from '../../lib/campaign-timeline.js'
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
    if (specifier === '@/contexts/auth-context.js') {
      return {useAuth: () => ({user: {id: 'fixture-viewer'}, isLoading: false})}
    }

    if (specifier === '@/lib/campaign-response-recovery.js') {
      return responseRecoveryHelpers
    }

    if (Object.hasOwn(overrides, specifier)) {
      return overrides[specifier]
    }

    if (specifier.endsWith('.module.css')) {
      return {}
    }

    if (specifier === '@/lib/campaign-calendar.js') {
      return campaignCalendar
    }

    if (specifier === '@/lib/campaign-meter-event-validation.js') {
      return meterEventValidation
    }

    if (specifier === '@/lib/campaign-response-map.js') {
      return responseMapHelpers
    }

    if (specifier === '@/lib/campaign-response-readings.js') {
      return responseReadingHelpers
    }

    if (specifier === '@/lib/campaign-timeline.js') {
      return campaignTimeline
    }

    if (specifier === '@/lib/collection-campaigns.js') {
      return campaignHelpers
    }

    if (specifier === '@/lib/campaign-draft.js') {
      return draftQueue
    }

    if (specifier === '@/lib/campaign-configuration.js') {
      return configurationHelpers
    }

    if (specifier === '@/lib/campaign-point-selection.js') {
      return pointSelectionHelpers
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

    if (specifier === 'next/navigation') {
      return {useRouter: () => ({push() {}})}
    }

    if (specifier === 'next/link') {
      return ({children, ...props}) => React.createElement('a', props, children)
    }

    return require(specifier)
  }

  runInNewContext('(function(require, module, exports) {' + code + '\n})', {
    structuredClone, setTimeout, clearTimeout, URLSearchParams, ...overrides.globals
  })(componentRequire, compiledModule, compiledModule.exports)
  if (useCache) {
    loaded.set(name, compiledModule.exports)
  }

  return compiledModule.exports
}

const context = ({canEdit = false, canSubmit = false, canReopen = false, status = 'DRAFT', editableTargetIds = []} = {}) => ({
  campaign: {
    id: 'campaign', name: 'Collecte de bassin', year: 2026, status: 'OPEN', indexDates: ['2025-11-01', '2026-06-01', '2026-11-01'], periods: [{
      id: 'p1', kind: 'INDEX', label: 'Période un', startDate: '2025-11-01', endDate: '2026-06-01'
    }, {
      id: 'n1', kind: 'NEEDS', label: 'Besoins un', startDate: '2026-11-01', endDate: '2027-06-01'
    }]
  },
  preleveurUserId: 'preleveur', availablePreleveurs: [], permissions: {
    canRead: true, canEdit, canSubmit, canReopen
  }, editableTargetIds,
  targets: [{id: 'a', pointPrelevement: {name: 'Point A'}, meters: [{id: 'binding', compteurId: 'meter-a', compteur: {serialNumber: 'Compteur A'}}]}, {id: 'b', pointPrelevement: {name: 'Point B'}, meters: [{id: 'binding-b', compteurId: 'meter-b', compteur: {serialNumber: 'Compteur B'}}]}],
  responses: {
    INDEX: {
      id: 'response', version: 1, status, draft: {readings: [], meterEvents: []}
    }, NEEDS: null
  }, existingReadings: [], calculation: {totals: []}
})

test('le CampaignShell par défaut conserve son titre, sa description, son retour et son contenu', t => {
  const {CampaignShell} = loadComponent('campaign-ui')
  const html = renderToStaticMarkup(React.createElement(CampaignShell, {
    title: 'Configuration de campagne', description: 'Description habituelle'
  }, React.createElement('section', null, 'Contenu de configuration')))
  t.is((html.match(/<h1\b/g) || []).length, 1)
  t.regex(html, /<h1 class="fr-h3 fr-mt-3w fr-mb-1w">Configuration de campagne<\/h1>/)
  t.regex(html, /<p class="fr-text--sm text-gray-700">Description habituelle<\/p>/)
  t.regex(html, /href="\/campagnes">Retour<\/a>/)
  t.true(html.includes('Contenu de configuration'))
  t.true(html.includes('min-h-screen bg-[#f7f7fb] pb-12'))
  t.notRegex(html, /Collecte organisée par|points concernés|Date limite de réponse/)
})

test('le slot d’en-tête remplace seulement le titre et la description du CampaignShell', t => {
  const {CampaignShell} = loadComponent('campaign-ui')
  const header = React.createElement('header', null, React.createElement('h1', null, 'Titre personnalisé'))
  const html = renderToStaticMarkup(React.createElement(CampaignShell, {
    title: 'Ancien titre', description: 'Ancienne description', header, backHref: '/mes-declarations', backLabel: 'Mes déclarations'
  }, React.createElement('p', null, 'Contenu conservé')))
  t.is((html.match(/<h1\b/g) || []).length, 1)
  t.true(html.includes('<header><h1>Titre personnalisé</h1></header>'))
  t.notRegex(html, /Ancien titre|Ancienne description/)
  t.regex(html, /href="\/mes-declarations">Mes déclarations<\/a>/)
  t.true(html.includes('Contenu conservé'))
})

test('la typographie compacte reste optionnelle et conserve les libellés et aides accessibles', t => {
  const {CampaignField: renderField} = loadComponent('campaign-ui', {react: {...React, useId: () => 'field-id'}})
  for (const compact of [false, true]) {
    for (const variant of [{}, {multiline: true}, {options: [{value: '', label: 'Choisir'}]}]) {
      const tree = renderField({
        ...variant, compact, label: 'Motif', hint: 'Une explication courte.', error: 'Champ requis.', value: '', required: true, disabled: true, onChange() {}
      })
      t.is(tree.props.className.includes('[&_.fr-label]:text-xs'), compact)
      t.is(tree.props.className.includes('[&_.fr-input]:text-xs'), compact)
      t.is(tree.props.className.includes('[&_.fr-select]:text-xs'), compact)
      const nodes = wizardNodes(tree)
      const field = nodes.find(node => ['input', 'select', 'textarea'].includes(node.type))
      t.is(nodes.find(node => node.type === 'label').props.htmlFor, field.props.id)
      t.is(field.props['aria-describedby'], 'field-id-hint field-id-error')
      t.true(field.props['aria-invalid'])
      t.true(field.props.disabled)
      t.true(field.props.required)
      t.false(Object.hasOwn(field.props, 'compact'))
      t.true(nodes.some(node => node.props.id === 'field-id-hint'))
      t.true(nodes.some(node => node.props.id === 'field-id-error'))
    }
  }
})

test('rendu index en lecture seule : champs désactivés et aucune commande de mutation', t => {
  const Component = loadComponent('campaign-response-form').default
  const html = renderToStaticMarkup(React.createElement(Component, {initialContext: context(), kind: 'INDEX'}))
  t.true(html.includes('Relevés de compteurs'))
  t.true(html.includes('href="/mes-declarations#demandes"'))
  t.false(html.includes('href="/mes-index"'))
  t.regex(html, /<fieldset[^>]*disabled=""/)
  t.false(html.includes('Soumettre'))
  t.false(html.includes('Enregistrer le brouillon'))
  t.false(html.includes('Vous pourrez modifier votre réponse tant que la saisie est ouverte.'))
  t.false(html.includes('Ajouter l’événement au brouillon'))
})

test('la réponse transmise garde la date, sans historique détaillé, PDF ni identifiants techniques', t => {
  const Component = loadComponent('campaign-response-form').default
  const initialContext = context({status: 'SUBMITTED'})
  initialContext.responses.INDEX.latestSubmission = {id: 'submission-private-id', version: 42, submittedAt: '2026-09-10T08:00:00Z'}
  const html = renderToStaticMarkup(React.createElement(Component, {initialContext, kind: 'INDEX'}))
  t.true(html.includes('Dernière transmission le 10 septembre 2026'))
  t.notRegex(html, /Consulter les réponses déjà transmises|Imprimer|PDF|Référence :|version 42|submission-private-id/)
})

test('les boutons de changement sont sous chaque point autorisé, jamais dans les besoins', t => {
  const Component = loadComponent('campaign-response-form').default
  const initialContext = context({canEdit: true, editableTargetIds: ['a']})
  const html = renderToStaticMarkup(React.createElement(Component, {initialContext, kind: 'INDEX'}))
  t.is((html.match(/Déclarer un changement de compteur/g) || []).length, 1)
  t.true(html.indexOf('Déclarer un changement de compteur') > html.indexOf('>Point A<'))
  t.true(html.indexOf('Déclarer un changement de compteur') < html.indexOf('>Point B<'))
  t.false(renderToStaticMarkup(React.createElement(Component, {initialContext, kind: 'NEEDS'})).includes('Déclarer un changement de compteur'))
})

test('un collecteur partiel a un formulaire restreint, jamais un bouton de transmission', t => {
  const Component = loadComponent('campaign-response-form').default
  const html = renderToStaticMarkup(React.createElement(Component, {initialContext: context({canEdit: true, editableTargetIds: ['a']}), kind: 'INDEX'}))
  t.true(html.includes('Enregistrer le brouillon'))
  t.false(html.includes('Soumettre'))
  t.false(html.includes('Vous pourrez modifier votre réponse tant que la saisie est ouverte.'))
  const pointA = html.slice(html.indexOf('>Point A<'), html.indexOf('>Point B<'))
  const pointB = html.slice(html.indexOf('>Point B<'))
  t.true(pointA.includes('Compteur A'))
  t.true(pointB.includes('Compteur B'))
  t.notRegex(pointA, /<fieldset[^>]*disabled=""/)
  t.regex(pointB, /<fieldset[^>]*disabled=""/)
})

test('les relevés et les besoins reprennent les champs compacts, sans formulaire de signalement ni dates cachées', t => {
  const Component = loadComponent('campaign-response-form').default
  for (const kind of ['INDEX', 'NEEDS']) {
    const initialContext = context({canEdit: true, canSubmit: true, editableTargetIds: ['a', 'b']})
    initialContext.targets[0].pointPrelevement.usageName = 'Forage du moulin'
    initialContext.targets[0].usage = {id: 'irrigation', name: 'Irrigation', color: '#009081'}
    const html = renderToStaticMarkup(React.createElement(Component, {initialContext, kind}))
    t.true(html.includes('quick-declaration-field'))
    t.is((html.match(/quick-declaration-control/g) || []).length, kind === 'INDEX' ? 6 : 2)
    t.regex(html, /text-right[^"<]*tabular-nums/)
    t.true(html.includes('Irrigation'))
    t.is((html.match(/<h3[^>]*>Forage du moulin<\/h3>/g) || []).length, 1)
    t.is((html.match(/<h3[^>]*>Point B<\/h3>/g) || []).length, 1)
    t.notRegex(html, /Un point manque ou doit être corrigé|Préparer le courriel|Décrivez votre demande/)
    const dates = kind === 'INDEX' ? ['1 novembre 2025', '1 juin 2026', '1 novembre 2026'] : ['1 novembre 2026', '31 mai 2027']
    for (const date of dates) {
      t.true(html.includes(date))
    }

    t.true(html.includes('Commentaire facultatif'))
    t.false(html.includes('Enregistrement automatique.'))
    t.notRegex(html, /Recopiez les index affichés|Indiquez le volume d’eau prévu|Voir les volumes calculés|\d+\/\d+ (?:réponses|volumes) renseignés?/)
    t.false(html.includes('Je confirme les informations'))
  }
})

for (const kind of ['INDEX', 'NEEDS']) {
  test(`le pied de formulaire ${kind} propose le brouillon puis la soumission, sans confirmation supplémentaire`, t => {
    const Component = loadComponent('campaign-response-form').default
    const initialContext = context({canEdit: true, canSubmit: true, editableTargetIds: ['a', 'b']})
    const before = structuredClone(initialContext)
    const html = renderToStaticMarkup(React.createElement(Component, {initialContext, kind}))
    const footer = html.match(/<section aria-label="Enregistrement et transmission"[^>]*>(.*?)<\/section>/s)?.[1]
    t.truthy(footer)
    t.regex(footer, /<button[^>]*>Enregistrer le brouillon<\/button>.*<button[^>]*>Soumettre<\/button>/s)
    t.notRegex(footer, /<button[^>]*disabled=""/)
    t.notRegex(html, /type="checkbox"|Je confirme les informations|Tant que vous ne la transmettez pas/)
    t.is((html.match(/Vous pourrez modifier votre réponse tant que la saisie est ouverte\./g) || []).length, 1)
    t.regex(footer, /<\/button>.*<p class="[^"]*fr-text--xs[^"]*text-\[var\(--text-mention-grey\)][^"]*">Vous pourrez modifier votre réponse tant que la saisie est ouverte\.<\/p>/s)
    t.deepEqual(initialContext, before)
  })

  for (const canEdit of [false, true]) {
    test(`le pied de formulaire ${kind} respecte les droits du volet en ${canEdit ? 'édition sans soumission' : 'lecture seule'}`, t => {
      const Component = loadComponent('campaign-response-form').default
      const initialContext = context({canEdit: true, canSubmit: true, editableTargetIds: ['a', 'b']})
      initialContext.responses[kind] = {
        ...initialContext.responses[kind],
        permissions: {canEdit, canSubmit: false, editableTargetIds: canEdit ? ['a'] : []}
      }
      const html = renderToStaticMarkup(React.createElement(Component, {initialContext, kind}))
      t.is(html.includes('Enregistrer le brouillon'), canEdit)
      t.is(html.includes('aria-label="Enregistrement et transmission"'), canEdit)
      t.notRegex(html, /Soumettre|Vous pourrez modifier votre réponse tant que la saisie est ouverte\.|type="checkbox"|Je confirme les informations|Tant que vous ne la transmettez pas/)
    })
  }
}

test('la complétude compte une indisponibilité expliquée sans prétendre qu’un index a été saisi ou transmis', t => {
  const {IndexRows: renderIndexRows} = loadComponent('campaign-response-entries')
  const initialContext = context({canEdit: true, editableTargetIds: ['a']})
  const draft = {
    readings: [{
      targetId: 'a', compteurId: 'meter-a', readingDate: '2026-06-01', value: null, missingReason: 'Compteur inaccessible'
    }]
  }
  const html = renderToStaticMarkup(React.createElement(renderIndexRows, {
    context: initialContext, draft, disabled: false, onChange() {}
  }))
  t.notRegex(html, /\d+\/\d+ (?:réponses|relevés) renseignés?/)
  t.false(html.includes('border-l-green-600'))
  t.false(html.includes('transmise'))
  t.true(html.includes('Compteur inaccessible'))
  const completed = {
    readings: initialContext.campaign.indexDates.map(date => draft.readings.find(reading => reading.readingDate === date) || {
      targetId: 'a', compteurId: 'meter-a', readingDate: date, value: '100'
    })
  }
  const completeHtml = renderToStaticMarkup(React.createElement(renderIndexRows, {
    context: initialContext, draft: completed, disabled: false, onChange() {}
  }))
  t.true(completeHtml.includes('border-l-green-600'))
  t.notRegex(completeHtml, /\d+\/\d+ (?:réponses|relevés) renseignés?/)
})

test('les motifs du tableau utilisent des libellés courts et compacts sans changer la saisie', t => {
  const {IndexRows: renderIndexRows} = loadComponent('campaign-response-entries')
  const initialContext = context({canEdit: true, editableTargetIds: ['a']})
  for (const [label, reading, property] of [
    ['Motif d’indisponibilité', {value: null, missingReason: ''}, 'missingReason'],
    ['Motif de la correction', {value: '42', correctionOfChunkValueId: 'source', correctionReason: ''}, 'correctionReason']
  ]) {
    const draft = {
      readings: [{
        targetId: 'a', compteurId: 'meter-a', readingDate: '2026-06-01', ...reading
      }]
    }
    const changes = []
    const tree = renderIndexRows({
      context: initialContext, draft, disabled: false, onChange: value => changes.push(value)
    })
    const row = wizardNodes(tree).find(node => node.props?.target?.id === 'a' && node.props?.date === '2026-06-01')
    const field = wizardNodes(row.type(row.props)).find(node => node.props?.label === label)
    t.true(field.props.compact)
    field.props.onChange('Une explication')
    t.is(changes[0].readings[0][property], 'Une explication')
    t.is(changes[0].readings[0].value, reading.value)
    const html = renderToStaticMarkup(tree)
    t.true(html.includes(label))
    t.notRegex(html, /Pourquoi ce relevé est-il indisponible|Pourquoi corrigez-vous ce relevé/)
  }
})

test('la ligne compacte conserve la reprise explicite d’un relevé historique et interdit cette action en lecture seule', t => {
  let candidateId = ''
  const {HistoricalReading: renderHistoricalReading} = loadComponent('campaign-response-entries', {
    react: {
      ...React, useState: () => [candidateId, value => {
        candidateId = value
      }]
    }
  })
  const source = {
    targetId: 'a', readingDate: '2026-06-01T00:00:00Z', value: '42', sourceChunkValueId: 'source',
    sourceValueUpdatedAt: '2026-06-02T00:00:00Z', requiresMeterConfirmation: true
  }
  const changes = []
  const render = disabled => renderHistoricalReading({
    candidates: [source], meter: {compteurId: 'meter-a'}, value: {}, disabled, onChange: value => changes.push(value)
  })
  t.true(wizardButton(render(false), 'Reprendre ce relevé').props.disabled)
  const field = wizardNodes(render(false)).find(node => node.props?.label === 'Choisir un relevé')
  t.true(field.props.compact)
  field.props.onChange('source')
  wizardButton(render(false), 'Reprendre ce relevé').props.onClick()
  t.deepEqual(changes, [campaignHelpers.campaignReferenceReading(source, 'meter-a')])
  t.is(candidateId, '')
  candidateId = 'source'
  t.true(wizardButton(render(true), 'Reprendre ce relevé').props.disabled)
  wizardButton(render(true), 'Reprendre ce relevé').props.onClick()
  t.is(changes.length, 1)
})

test('la grille garde les sources au bon point et compteur et exige une correction explicite', t => {
  const {IndexRows: renderIndexRows} = loadComponent('campaign-response-entries')
  const initialContext = context({canEdit: true, canSubmit: true, editableTargetIds: ['a']})
  initialContext.existingReadings = [
    {
      targetId: 'a', compteurId: 'meter-a', readingDate: '2026-06-01', value: '42', sourceChunkValueId: 'allowed-source'
    },
    {
      targetId: 'a', compteurId: 'other-meter', readingDate: '2026-06-01', value: '80', sourceChunkValueId: 'wrong-meter'
    },
    {
      targetId: 'b', compteurId: 'meter-b', readingDate: '2026-06-01', value: '99', sourceChunkValueId: 'other-target'
    }
  ]
  const reference = campaignHelpers.campaignReferenceReading(initialContext.existingReadings[0], 'meter-a')
  const draft = {readings: [reference]}
  const changes = []
  const tree = renderIndexRows({
    context: initialContext, draft, disabled: false, onChange: value => changes.push(value)
  })
  const rows = wizardNodes(tree).filter(node => node.props?.target && node.props?.date === '2026-06-01')
  const editable = rows.find(node => node.props.target.id === 'a')
  t.deepEqual(editable.props.candidates.map(candidate => candidate.sourceChunkValueId), ['allowed-source'])
  const controls = editable.type(editable.props)
  t.true(wizardNodes(controls).find(node => node.props?.label?.startsWith('Index au')).props.disabled)
  wizardButton(controls, 'Corriger ce relevé').props.onClick()
  t.is(changes[0].readings[0].correctionOfChunkValueId, 'allowed-source')
  t.is(changes[0].readings[0].correctionReason, '')
  t.false(Object.hasOwn(changes[0].readings[0], 'sourceChunkValueId'))
  const forbidden = rows.find(node => node.props.target.id === 'b')
  t.true(forbidden.props.disabled)
  forbidden.props.onChange({...forbidden.props.value, value: '300'})
  t.is(changes.length, 1)
})

test('la saisie compacte des besoins protège aussi les callbacks des points hors mandat', t => {
  const {NeedsRows: renderNeedsRows} = loadComponent('campaign-response-entries')
  const initialContext = context({canEdit: true, editableTargetIds: ['a']})
  const changes = []
  const tree = renderNeedsRows({
    context: initialContext, draft: {needs: []}, disabled: false, onChange: draft => changes.push(draft)
  })
  const fields = wizardNodes(tree).filter(node => node.props?.label?.startsWith('Besoin en eau'))
  t.is(fields.length, 2)
  t.false(fields[0].props.disabled)
  t.true(fields[1].props.disabled)
  fields[0].props.onChange('1 234,5')
  t.is(changes[0].needs[0].targetId, 'a')
  t.is(changes[0].needs[0].requestedVolume, '1234.5')
  fields[1].props.onChange('900')
  t.is(changes.length, 1)
})

test('la réponse rappelle l’organisme demandeur et la campagne sans ajouter de navigation globale', t => {
  const Component = loadComponent('campaign-response-form').default
  const initialContext = context()
  initialContext.campaign.owner = {label: 'Organisme de gestion des eaux'}
  const html = renderToStaticMarkup(React.createElement(Component, {initialContext, kind: 'INDEX'}))
  t.true(html.includes('Relevés de compteurs'))
  t.true(html.includes('Collecte de bassin'))
  t.false(html.includes('Collecte de bassin (2026)'))
  t.regex(html, /<p[^>]*>Collecteur : <strong[^>]*>Organisme de gestion des eaux<\/strong><\/p>/)
  t.notRegex(html, /\d+ points? concernés?/)
  t.true(html.includes('Relevés du 1 novembre 2025 au 1 novembre 2026'))
  t.is((html.match(/<h1\b/g) || []).length, 1)
  t.false(html.includes('Demandé par'))
  t.true(html.includes('href="/mes-declarations#demandes">Mes déclarations</a>'))
  t.false(html.includes('href="/mes-index"'))
  t.false(html.includes('href="/mes-besoins"'))
  t.false(html.includes('Passer aux besoins en eau'))
})

for (const [kind, title] of [['INDEX', 'Relevés de compteurs'], ['NEEDS', 'Besoins en eau']]) {
  test(`l’en-tête ${kind} reste unique dans la vue et ne modifie ni les droits ni les données de contexte`, t => {
    const Component = loadComponent('campaign-response-form').default
    const initialContext = context()
    initialContext.campaign.ownerContact = {label: 'Collecteur de secours'}
    initialContext.campaign.closesAt = '2026-10-31T23:00:00.000Z'
    initialContext.campaign.timezone = 'Europe/Paris'
    initialContext.campaign.openingMessage = 'Consigne particulière de votre collecteur.'
    const before = structuredClone(initialContext)
    const html = renderToStaticMarkup(React.createElement(Component, {initialContext, kind}))
    const header = html.slice(html.indexOf('<header'), html.indexOf('</header>'))
    t.is((html.match(/<h1\b/g) || []).length, 1)
    t.regex(html, new RegExp(`<h1[^>]*>${title}</h1>`))
    t.is((html.match(/Collecte de bassin/g) || []).length, 1)
    t.false(html.includes('Collecte de bassin (2026)'))
    t.true(html.includes('Collecteur de secours'))
    t.notRegex(html, /\d+ points? concernés?/)
    t.true(header.includes(kind === 'INDEX' ? 'Relevés du 1 novembre 2025 au 1 novembre 2026' : 'Besoins du 1 novembre 2026 au 31 mai 2027'))
    t.true(html.includes('Date limite de réponse'))
    t.true(html.includes('31 octobre 2026'))
    t.is((html.match(/Consigne particulière de votre collecteur\./g) || []).length, 1)
    t.notRegex(html, /Enregistrer le brouillon|Soumettre|Déclarer un changement de compteur|Vous pourrez modifier votre réponse tant que la saisie est ouverte\./)
    t.deepEqual(initialContext, before)
  })
}

test('après transmission, le lien vers les besoins conserve le préleveur représenté sans débloquer la saisie', t => {
  const Component = loadComponent('campaign-response-form').default
  const initialContext = context({status: 'SUBMITTED'})
  initialContext.preleveurUserId = 'mandat & autre'
  const html = renderToStaticMarkup(React.createElement(Component, {initialContext, kind: 'INDEX'}))
  t.true(html.includes('href="/mes-besoins/campaign?preleveurUserId=mandat+%26+autre"'))
  t.true(html.includes('Passer aux besoins en eau'))
  t.false(html.includes('Enregistrer le brouillon'))
  t.false(html.includes('Soumettre'))
  t.false(html.includes('Vous pourrez modifier votre réponse tant que la saisie est ouverte.'))
})

test('la réouverture manuelle reste absente même si un ancien contexte la proposait', t => {
  const Component = loadComponent('campaign-response-form').default
  const initialContext = context({status: 'SUBMITTED', canReopen: true})
  const html = renderToStaticMarkup(React.createElement(Component, {initialContext, kind: 'INDEX'}))
  for (const label of ['Réouvrir le brouillon', 'Réouvrir pour correction', 'Pourquoi faut-il corriger', '7 jours pour corriger']) {
    t.false(html.includes(label))
  }

  t.true(html.includes('Votre réponse a été transmise.'))
})

test('le lien vers l’autre réponse exige sa présence et un droit de consultation', t => {
  const Component = loadComponent('campaign-response-form').default
  const initialContext = context({status: 'SUBMITTED'})
  initialContext.responses.NEEDS = {permissions: {canRead: false}}
  const render = () => renderToStaticMarkup(React.createElement(Component, {initialContext, kind: 'INDEX'}))
  t.false(render().includes('Passer aux besoins en eau'))
  initialContext.responses.NEEDS = null
  initialContext.campaign.periods = initialContext.campaign.periods.filter(period => period.kind !== 'NEEDS')
  t.false(render().includes('Passer aux besoins en eau'))
})

test('après une réponse de besoins, le lien inverse pointe vers les relevés de la même campagne', t => {
  const Component = loadComponent('campaign-response-form').default
  const initialContext = context()
  initialContext.responses.NEEDS = {
    id: 'needs', version: 1, status: 'SUBMITTED', draft: {needs: []}
  }
  const html = renderToStaticMarkup(React.createElement(Component, {initialContext, kind: 'NEEDS'}))
  t.true(html.includes('Besoins en eau'))
  t.true(html.includes('href="/mes-index/campaign?preleveurUserId=preleveur"'))
  t.true(html.includes('Passer aux relevés de compteurs'))
})

test('l’usage est unique et centré sur tous les relevés ou toutes les périodes du point', t => {
  const Component = loadComponent('campaign-response-form').default
  const initialContext = context()
  initialContext.campaign.periods.push({
    id: 'n2', kind: 'NEEDS', label: 'Besoins deux', startDate: '2027-06-01', endDate: '2027-11-01'
  })
  const render = kind => renderToStaticMarkup(React.createElement(Component, {initialContext, kind}))
  const needs = render('NEEDS')
  t.true(needs.includes('Besoins un'))
  t.true(needs.includes('Besoins deux'))
  for (const html of [needs, render('INDEX')]) {
    t.is((html.match(/class="min-w-0 md:self-center"/g) || []).length, initialContext.targets.length)
    t.is((html.match(/Usage : /g) || []).length, initialContext.targets.length)
  }
})

test('le volet besoins demande seulement un volume et présente la fin de période incluse', t => {
  const Component = loadComponent('campaign-response-form').default
  const html = renderToStaticMarkup(React.createElement(Component, {initialContext: context({canEdit: true, canSubmit: true, editableTargetIds: ['a', 'b']}), kind: 'NEEDS'}))
  t.notRegex(html, /Débit|débit|m³\/h|—/)
  t.true(html.includes('Besoin en eau (m³)'))
  t.true(html.includes('31 mai 2027'))
  t.regex(html, /<button[^>]*>Soumettre<\/button>/)
  t.false(html.includes('Ajouter l’événement au brouillon'))
})

test('un ancien besoin conserve son volume éditable sans présenter de champ de débit', t => {
  const Component = loadComponent('campaign-response-form').default
  const initialContext = context({canEdit: true, canSubmit: true, editableTargetIds: ['a', 'b']})
  initialContext.responses.NEEDS = {
    id: 'needs', version: 2, status: 'DRAFT', draft: {
      needs: [{
        targetId: 'a', periodId: 'n1', requestedFlow: '12.5', requestedVolume: '400'
      }]
    }
  }
  const html = renderToStaticMarkup(React.createElement(Component, {initialContext, kind: 'NEEDS'}))
  t.true(html.includes('value="400"'))
  t.notRegex(html, /Débit|débit|m³\/h|value="12.5"/)
  t.notRegex(html, /<button[^>]*disabled=""[^>]*>Enregistrer le brouillon/)
})

test('la confirmation des besoins présente le volume transmis sans débit ni valeur inventée', t => {
  const Component = loadComponent('campaign-history').CampaignReceipt
  const initialContext = context()
  const submission = {
    id: 'submission', version: 1, submittedAt: '2026-09-01T08:30:00Z', snapshot: {
      needs: [
        {
          targetId: 'a', periodId: 'n1', requestedFlow: '12.5', requestedVolume: '400'
        },
        {targetId: 'b', periodId: 'n1', requestedVolume: '0'}
      ]
    }
  }
  const html = renderToStaticMarkup(React.createElement(Component, {submission, context: initialContext, kind: 'NEEDS'}))
  t.true(html.includes('400 m³'))
  t.true(html.includes('0 m³'))
  t.notRegex(html, /m³\/h|12.5|undefined|—/)
  submission.snapshot.needs[0].requestedVolume = null
  t.true(renderToStaticMarkup(React.createElement(Component, {submission, context: initialContext, kind: 'NEEDS'})).includes('Volume non renseigné'))
})

test('les listes n’offrent la création qu’avec la capacité du serveur', t => {
  const Component = loadComponent('campaign-list').default
  const render = permissions => renderToStaticMarkup(React.createElement(Component, {data: {items: [], permissions}}))
  t.false(render({canCreate: false}).includes('Créer une campagne'))
  t.true(render({canCreate: true}).includes('Créer une campagne'))
})

test('la création commence par une étape simple, sans champ de fuseau ni formulaire technique complet', t => {
  const Component = loadComponent('campaign-config-form').default
  const html = renderToStaticMarkup(React.createElement(Component, {
    initialOptions: {
      zones: [{id: 'zone', name: 'Bassin de la rivière'}], collecteurs: [{userId: 'owner', label: 'Organisme du bassin'}]
    }
  }))
  t.true(html.includes('Organisation'))
  t.true(html.includes('Calendrier'))
  t.true(html.includes('Points concernés'))
  t.false(html.includes('Envoi et suivi'))
  t.true(html.includes('Étape 1 sur 3'))
  t.false(html.includes('—'))
  t.true(html.includes('Collecteur'))
  t.false(html.includes('Organisme responsable'))
  t.notRegex(html, /Fuseau horaire|Europe\/Paris|datetime-local/)
  t.notRegex(html, /Rappels avant la clôture \(jours, séparés par une virgule\)/)
  t.false(html.includes('Les champs marqués'))
  t.true(html.includes('grid items-center'))
  t.true(html.includes('role="combobox"'))
  t.true(html.includes('Rechercher un bassin, un département ou une région'))
  t.false(html.includes('Enregistrer la configuration'))
  t.true(html.includes('Continuer'))
  t.regex(html, /aria-current="step"/)
})

test('les territoires se recherchent par nom sans accent, code ou type et restent distincts', t => {
  const {filterCampaignTerritories, campaignTerritoryLabel} = loadComponent('campaign-territory-select')
  const territories = [{
    id: 'dep', name: 'Ardèche', code: '07', type: 'DEPARTEMENT'
  }, {
    id: 'sage', name: 'Ardèche', code: 'SAGE', type: 'SAGE'
  }, {id: 'region', name: 'Auvergne-Rhône-Alpes', type: 'REGION'}]
  t.is(filterCampaignTerritories(territories, {inputValue: 'ardeche'}).length, 2)
  t.is(filterCampaignTerritories(territories, {inputValue: '07'})[0].id, 'dep')
  t.is(filterCampaignTerritories(territories, {inputValue: 'sage ardeche'})[0].id, 'sage')
  t.is(filterCampaignTerritories(territories, {inputValue: 'region rhone'})[0].id, 'region')
  t.is(filterCampaignTerritories(territories, {inputValue: 'introuvable'}).length, 0)
  t.is(campaignTerritoryLabel(territories[0]), 'Ardèche (07)')
})

test('le calendrier présente une seule frise globale avant les champs, sans second calendrier de calcul', t => {
  const {CalendarStep} = loadComponent('campaign-config-form')
  const form = configurationHelpers.initialCampaignConfiguration(undefined, {}, 2026)
  const html = renderToStaticMarkup(React.createElement(CalendarStep, {form, update() {}}))
  t.false(html.includes('Le volume prélevé sera déduit de deux relevés successifs.'))
  t.notRegex(html, /débit/i)
  t.is((html.match(/aria-label="Dates des relevés"/g) || []).length, 1)
  t.true(html.includes('31 octobre 2025'))
  t.true(html.includes('aria-label="Dates des relevés"'))
  t.true(html.includes('aria-label="Périodes de besoins en eau"'))
  t.true(html.includes('aria-label="Saisie des réponses"'))
  t.true(html.indexOf('aria-label="Dates des relevés"') < html.indexOf('À quelles dates relever'))
  t.notRegex(html, /Sur quelles périodes calculer|Les volumes seront calculés automatiquement|Personnaliser les périodes de calcul|Ajouter une période de calcul|Relevé de départ|Relevé d’arrivée|Index du/)
  t.notRegex(html, /1 000 à 1 500|retirez-le d’abord/)
  t.true(html.includes('Pour quelles périodes demander les besoins en eau'))
  t.true(html.includes('Ajouter une période de besoins'))
  t.true(html.includes('Ajouter un relevé'))
  t.is((html.match(/aria-label="Retirer le relevé \d+"/g) || []).length, form.indexDates.length)
  t.notRegex(html, /aria-label="Retirer le relevé \d+" disabled/)
})

test('les deux dates minimales restent visibles et ne peuvent pas être retirées', t => {
  const {CalendarStep} = loadComponent('campaign-config-form')
  const form = configurationHelpers.initialCampaignConfiguration(undefined, {}, 2026)
  form.indexDates = ['2026-01-01', '2026-12-31']
  const html = renderToStaticMarkup(React.createElement(CalendarStep, {form, update() {}}))
  t.is((html.match(/aria-label="Retirer le relevé \d+" disabled=""/g) || []).length, 2)
  t.regex(html, /value="2026-01-01"/)
  t.regex(html, /value="2026-12-31"/)
  t.true(html.includes('Ajouter un relevé'))
})

test('les champs de relevé restent des dates natives bornées sans répéter leur valeur dans une aide', t => {
  const {CalendarStep: renderCalendar} = loadComponent('campaign-config-form')
  const form = {
    ...configurationHelpers.initialCampaignConfiguration(undefined, {}, 2026), indexDates: ['2026-03-01', '2026-03-15', '2026-03-31']
  }
  const changes = []
  const tree = renderCalendar({form, update: change => changes.push(change)})
  const fields = wizardNodes(tree).filter(node => node.props?.label?.startsWith('Relevé '))
  t.is(fields.length, 3)
  for (const [index, field] of fields.entries()) {
    const {type, value, min, max, hint, required} = field.props
    t.is(type, 'date')
    t.is(value, form.indexDates[index])
    t.is(min, [undefined, '2026-03-02', '2026-03-16'][index])
    t.is(max, ['2026-03-14', '2026-03-30', undefined][index])
    t.falsy(hint)
    t.true(required)
    const html = renderToStaticMarkup(field)
    t.true(html.includes('type="date"'))
    t.true(html.includes(`value="${value}"`))
    t.notRegex(html, /fr-hint-text|mars 2026/)
    if (min) {
      t.true(html.includes(`min="${min}"`))
    }

    if (max) {
      t.true(html.includes(`max="${max}"`))
    }
  }

  fields[1].props.onChange('2026-03-20')
  t.deepEqual([...changes[0].indexDates], ['2026-03-01', '2026-03-20', '2026-03-31'])
})

test('les périodes gardent leurs bornes natives et leur fin exclusive sans date longue au-dessus des champs', t => {
  const {CalendarStep: renderCalendar} = loadComponent('campaign-config-form')
  const period = {
    kind: 'NEEDS', position: 0, label: 'Besoins de février', startDate: '2028-02-01', endDate: '2028-03-01'
  }
  const form = {...configurationHelpers.initialCampaignConfiguration(undefined, {}, 2026), periods: [period]}
  const changes = []
  const tree = renderCalendar({form, update: change => changes.push(change)})
  const editor = wizardNodes(tree).find(node => node.props?.period === period)
  const fields = wizardNodes(editor.type(editor.props)).filter(node => node.props?.type === 'date')
  t.is(fields.length, 2)
  const [start, end] = fields
  t.is(start.props.value, '2028-02-01')
  t.is(start.props.max, '2028-02-29')
  t.is(end.props.value, '2028-02-29')
  t.is(end.props.min, '2028-02-01')
  for (const field of fields) {
    t.falsy(field.props.hint)
    t.true(field.props.required)
    const html = renderToStaticMarkup(field)
    t.true(html.includes('type="date"'))
    t.true(html.includes(`value="${field.props.value}"`))
    t.notRegex(html, /fr-hint-text|février 2028|mars 2028/)
  }

  start.props.onChange('2028-02-10')
  t.is(changes[0].periods[0].startDate, '2028-02-10')
  end.props.onChange('2028-02-29')
  t.is(changes[1].periods[0].endDate, '2028-03-01')
  end.props.onChange('')
  t.is(changes[2].periods[0].endDate, '')
})

test('l’édition conserve la position des champs de dates, même si elles sont temporairement inversées', t => {
  const {CalendarStep} = loadComponent('campaign-config-form')
  const form = configurationHelpers.initialCampaignConfiguration(undefined, {}, 2026)
  form.indexDates = ['2026-12-31', '2026-01-01', '2026-06-01']
  const html = renderToStaticMarkup(React.createElement(CalendarStep, {form, update() {}}))
  t.true(html.indexOf('value="2026-12-31"') < html.indexOf('value="2026-01-01"'))
  t.true(html.indexOf('value="2026-01-01"') < html.indexOf('value="2026-06-01"'))
})

test('une date temporairement vide ne permet pas de dépasser la limite des périodes', t => {
  const {CalendarStep} = loadComponent('campaign-config-form')
  const form = configurationHelpers.initialCampaignConfiguration(undefined, {}, 2026)
  form.indexDates = Array.from({length: 99}, () => '')
  form.periods = form.periods.filter(period => period.kind === 'NEEDS')
  const html = renderToStaticMarkup(React.createElement(CalendarStep, {form, update() {}}))
  t.regex(html, /<button[^>]*disabled=""[^>]*>Ajouter un relevé<\/button>/)
  t.regex(html, /<button[^>]*disabled=""[^>]*>Ajouter une période de besoins<\/button>/)
})

test('le calendrier rassemble les dates de réponse sans ajouter de récapitulatif des points ou de partage', t => {
  const {CalendarStep} = loadComponent('campaign-config-form')
  const form = configurationHelpers.initialCampaignConfiguration(undefined, {}, 2026)
  form.targets = [{exploitationId: 'exploitation', eligibilityConfirmed: true}]
  const html = renderToStaticMarkup(React.createElement(CalendarStep, {form, update() {}}))
  t.true(html.includes('Date limite de réponse'))
  t.true(html.includes('Dates des relevés'))
  t.true(html.includes('Besoins à estimer'))
  t.false(html.includes('Volumes prélevés'))
  t.notRegex(html, /Partager|partage|Autre collecteur|participation vérifiée|participation à vérifier|Je confirme|Voir les points sélectionnés|Organisation et points/)
})

test('le calendrier règle les deux bornes avant les relances, puis le message, avec un seul aperçu', t => {
  const {CalendarStep} = loadComponent('campaign-config-form')
  const form = {
    ...configurationHelpers.initialCampaignConfiguration(undefined, {}, 2026), opensAt: '2026-11-01T00:00', closesAt: '2026-11-30T23:59', reminderDays: [14, 3]
  }
  const html = renderToStaticMarkup(React.createElement(CalendarStep, {form, update() {}}))
  t.true(html.indexOf('Début de saisie au plus tôt') < html.indexOf('Relances automatiques'))
  t.true(html.indexOf('Date limite de réponse (facultatif)') < html.indexOf('Relances automatiques'))
  t.true(html.indexOf('Relances automatiques') < html.indexOf('Message aux préleveurs'))
  t.true(html.includes('16 novembre 2026'))
  t.true(html.includes('27 novembre 2026'))
  t.true(html.includes('30 novembre 2026'))
  t.false(html.includes('<details'))
  t.false(html.includes('—'))
  t.false(html.includes('Envoi et suivi'))
  t.is((html.match(/aria-label="Dates des relevés"/g) || []).length, 1)
  t.true(html.indexOf('aria-label="Dates des relevés"') < html.indexOf('Quand et comment demander les réponses'))
  for (const label of ['Dates des relevés', 'Périodes de besoins en eau', 'Saisie des réponses']) {
    t.true(html.includes(`aria-label="${label}"`))
  }
})

test('les réglages de réponse n’ajoutent pas d’aperçu et retirer la limite retire les relances dépendantes', t => {
  const {ResponseSettings: renderResponseSettings} = loadComponent('campaign-config-form')
  const form = {
    ...configurationHelpers.initialCampaignConfiguration(undefined, {}, 2026), opensAt: '2026-11-25T00:00', closesAt: '2026-11-30T23:59', reminderDays: [14]
  }
  const changes = []
  const tree = renderResponseSettings({form, update: change => changes.push(change)})
  const nodes = wizardNodes(tree)
  const deadline = nodes.find(node => node.props?.label === 'Date limite de réponse (facultatif)')
  t.is(deadline.props.min, '2026-11-25')
  deadline.props.onChange('')
  t.deepEqual(changes, [{closesAt: '', reminderDays: []}])
  const checkboxes = nodes.filter(node => node.type === 'input' && node.props.type === 'checkbox')
  t.true(checkboxes[0].props.checked)
  t.false(checkboxes[0].props.disabled)
  t.true(checkboxes[1].props.disabled)
  const html = renderToStaticMarkup(tree)
  t.false(html.includes('aria-label="Dates des relevés"'))
  t.false(html.includes('aria-label="Saisie des réponses"'))
  t.false(html.includes('Créer le brouillon'))
})

test('les aides des dates de réponse restent métier sans répéter les dates sélectionnées', t => {
  const {ResponseSettings: renderSettings} = loadComponent('campaign-config-form')
  const form = {
    ...configurationHelpers.initialCampaignConfiguration(undefined, {}, 2026), opensAt: '2026-05-01T00:00', closesAt: '2026-11-30T23:59'
  }
  const changes = []
  const fields = wizardNodes(renderSettings({form, update: change => changes.push(change)})).filter(node => node.props?.type === 'date')
  t.is(fields.length, 2)
  const [opening, deadline] = fields
  t.is(opening.props.value, '2026-05-01')
  t.is(opening.props.max, '2026-11-30')
  t.is(deadline.props.value, '2026-11-30')
  t.is(deadline.props.min, '2026-10-31')
  for (const field of fields) {
    t.is(typeof field.props.hint, 'string')
    t.true(field.props.hint.length > 0)
    t.notRegex(field.props.hint, /1 mai 2026|30 novembre 2026|2026-05-01|2026-11-30/)
    const html = renderToStaticMarkup(field)
    t.true(html.includes('type="date"'))
    t.true(html.includes(`value="${field.props.value}"`))
  }

  opening.props.onChange('2026-06-01')
  deadline.props.onChange('2026-12-10')
  t.deepEqual(changes, [{opensAt: '2026-06-01T00:00'}, {closesAt: '2026-12-10T23:59'}])
  const emptyFields = wizardNodes(renderSettings({form: {...form, opensAt: '', closesAt: ''}, update() {}})).filter(node => node.props?.type === 'date')
  t.true(emptyFields.every(field => field.props.value === '' && field.props.type === 'date'))
  t.is(emptyFields[0].props.max, undefined)
  t.is(emptyFields[1].props.min, '2026-10-31')
})

test('la frise distingue l’ouverture prévue des dates effectives sans inventer d’envoi', t => {
  const {CampaignGlobalTimeline} = loadComponent('campaign-timeline')
  const render = props => renderToStaticMarkup(React.createElement(CampaignGlobalTimeline, props))
  t.true(render({opensAt: '2026-11-01T00:00'}).includes('Ouverture au plus tôt'))
  const props = {
    status: 'OPEN', openedAt: '2026-11-10T10:00:00Z', closedAt: '2026-10-31T10:00:00Z', closesAt: '2026-11-30T23:00:00Z', reminderDays: [14, 3]
  }
  const opened = render(props)
  t.true(opened.includes('Ouverture effective'))
  t.true(opened.includes('10 novembre 2026'))
  t.false(opened.includes('Clôture effective'))
  t.true(opened.includes('Relances prévues si une réponse manque'))
  t.true(opened.includes('16 novembre 2026'))
  const closed = render({...props, status: 'CLOSED', closedAt: '2026-11-20T10:00:00Z'})
  t.true(closed.includes('Clôture effective'))
  t.true(closed.includes('20 novembre 2026'))
  t.true(closed.includes('Relances prévues si une réponse manque'))
  t.true(closed.includes('16 novembre 2026'))
  t.false(closed.includes('27 novembre 2026'))
})

test('les dates inversées sont signalées immédiatement et les relevés sont bornés par leurs voisins', t => {
  const {CalendarStep} = loadComponent('campaign-config-form')
  const form = configurationHelpers.initialCampaignConfiguration(undefined, {}, 2026)
  const render = value => renderToStaticMarkup(React.createElement(CalendarStep, {form: value, update() {}}))
  t.true(render(form).includes('min="2025-11-01"'))
  t.true(render(form).includes('max="2026-10-30"'))
  t.true(render({...form, indexDates: [...form.indexDates].reverse()}).includes('ordre chronologique'))
})

const wizardNodes = tree => Array.isArray(tree) ? tree.flatMap(node => wizardNodes(node)) : (tree && typeof tree === 'object' ? [tree, ...wizardNodes(tree.props?.children)] : [])
const wizardButton = (tree, label) => wizardNodes(tree).find(node => node.type === 'button' && node.props.children === label)
const nestedWizardHooks = {
  state: React.useState, ref: React.useRef, callback: React.useCallback, effect: React.useEffect
}
const wizardOptions = {
  zones: [{id: 'zone', name: 'Bassin de la rivière'}],
  collecteurs: [{userId: 'owner', label: 'Collecteur du bassin'}],
  exploitations: [{exploitationId: 'exploitation', pointPrelevementId: 'point', pointPrelevement: {id: 'point', name: 'Forage du moulin'}}]
}
const wizardCampaign = {
  id: 'campaign', name: 'Collecte 2026', year: 2026, status: 'DRAFT', version: 7,
  zoneId: 'zone', ownerCollecteurUserId: 'owner', timezone: 'Europe/Paris',
  ...configurationHelpers.defaultCampaignCalendar(2026),
  opensAt: '2026-11-01T08:00:00Z', closesAt: '2026-12-01T00:00:00Z', reminderDays: [7], openingMessage: 'Message conservé'
}

// Exercise the real wizard handlers with controlled hooks. Nested components
// keep real React hooks during SSR; no browser, network, or server write is used.
const wizardInteraction = ({campaign, saveResult, onSaved = false} = {}) => {
  const state = []
  const effects = []
  const pendingEffects = []
  const timers = new Map()
  const calls = []
  const routes = []
  const savedContexts = []
  let cursor = 0
  let effectCursor = 0
  let timerId = 0
  let renderingMarkup = false
  const saveCalls = () => calls.filter(call => call.type === 'save')
  const renderWizard = loadComponent('campaign-config-form', {
    react: {
      ...React,
      useState(initial) {
        if (renderingMarkup) {
          return nestedWizardHooks.state(initial)
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
          return nestedWizardHooks.ref(initial)
        }

        const index = cursor++
        state[index] ||= {current: initial}
        return state[index]
      },
      useCallback(callback, dependencies) {
        return renderingMarkup ? nestedWizardHooks.callback(callback, dependencies) : callback
      },
      useEffect(effect, dependencies) {
        if (renderingMarkup) {
          return nestedWizardHooks.effect(effect, dependencies)
        }

        const index = effectCursor++
        if (!effects[index] || dependencies.some((value, position) => !Object.is(value, effects[index].dependencies[position]))) {
          const previous = effects[index]
          effects[index] = {effect, dependencies}
          pendingEffects.push(() => {
            previous?.cleanup?.()
            effects[index].cleanup = effect()
          })
        }
      }
    },
    globals: {
      setTimeout(callback) {
        const id = ++timerId
        timers.set(id, callback)
        return id
      },
      clearTimeout(id) {
        timers.delete(id)
      }
    },
    'next/navigation': {useRouter: () => ({push: route => routes.push(route)})},
    '@/server/actions/campaigns.js': new Proxy({
      async getCampaignOptionsAction(params) {
        calls.push({type: 'options', params})
        return {success: true, data: wizardOptions}
      },
      async saveCampaignAction(id, payload) {
        calls.push({type: 'save', id, payload: structuredClone(payload)})
        return saveResult || {success: true, data: {campaign: {id: id || 'created-campaign'}}}
      }
    }, {
      get(actions, name) {
        return actions[name] || (() => {
          throw new Error(`Action non autorisée dans l’assistant : ${String(name)}`)
        })
      }
    })
  }).default
  return {
    calls, routes, savedContexts, saveCalls,
    render() {
      cursor = 0
      effectCursor = 0
      return renderWizard({
        context: campaign ? {campaign, targets: [{...wizardOptions.exploitations[0], eligibilityConfirmed: true}]} : undefined,
        initialOptions: wizardOptions,
        onSaved: onSaved ? saved => savedContexts.push(saved) : undefined
      })
    },
    child() {
      return wizardNodes(this.render()).find(node => node.props?.form && node.props?.update)
    },
    update(changes) {
      this.child().props.update(changes)
    },
    form() {
      return this.child().props.form
    },
    step() {
      return wizardNodes(this.render()).find(node => node.type === 'h2').props.children
    },
    submit() {
      return this.render().props.onSubmit({preventDefault() {}})
    },
    back() {
      wizardButton(this.render(), 'Étape précédente').props.onClick()
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
    async mount() {
      this.render()
      for (const effect of pendingEffects.splice(0)) {
        effect()
      }

      await Promise.all([...timers].map(async ([id, callback]) => {
        timers.delete(id)
        await callback()
      }))
    }
  }
}

test('les trois étapes ne créent le brouillon qu’après le choix des points, sans ouvrir ni envoyer', async t => {
  const flow = wizardInteraction()
  await flow.mount()
  flow.update({year: 2026, name: 'Collecte créée', ...configurationHelpers.defaultCampaignCalendar(2026)})
  t.is(flow.step(), 'Organisation')
  t.deepEqual(flow.saveCalls(), [])
  await flow.submit()
  t.is(flow.step(), 'Calendrier')
  flow.update({
    opensAt: '2026-11-01T00:00', closesAt: '2026-11-30T23:59', reminderDays: [7], openingMessage: 'Merci de répondre.'
  })
  await flow.submit()
  t.is(flow.step(), 'Points concernés')
  t.true(flow.html().includes('sans envoyer d’invitation'))
  t.truthy(wizardButton(flow.render(), 'Créer le brouillon'))
  t.falsy(wizardButton(flow.render(), 'Continuer'))
  t.deepEqual(flow.saveCalls(), [])
  t.deepEqual(flow.routes, [])
  flow.update({targets: [{exploitationId: 'exploitation', eligibilityConfirmed: false}]})
  await flow.submit()
  t.is(flow.saveCalls().length, 1)
  const [{id, payload}] = flow.saveCalls()
  t.is(id, undefined)
  t.is(payload.name, 'Collecte créée')
  t.deepEqual(payload.targets, [{exploitationId: 'exploitation', eligibilityConfirmed: true}])
  t.deepEqual(payload.reminderDays, [7])
  t.is(payload.openingMessage, 'Merci de répondre.')
  t.false(Object.hasOwn(payload, 'expectedVersion'))
  t.deepEqual(flow.routes, ['/campagnes/created-campaign'])
  t.true(flow.calls.every(call => ['options', 'save'].includes(call.type)))
})

test('revenir en arrière conserve le calendrier, les réponses attendues et les points choisis', async t => {
  const flow = wizardInteraction({campaign: wizardCampaign})
  await flow.submit()
  const changes = {
    ...configurationHelpers.replaceCampaignReadingDate(flow.form(), 1, '2026-06-02'),
    opensAt: '2026-11-02T00:00', closesAt: '2026-12-03T23:59', reminderDays: [14, 3], openingMessage: 'Consigne personnalisée'
  }
  flow.update(changes)
  await flow.submit()
  const before = structuredClone(flow.form())
  flow.back()
  t.is(flow.step(), 'Calendrier')
  t.deepEqual(flow.form(), before)
  flow.back()
  t.is(flow.step(), 'Organisation')
  flow.update({name: 'Nom corrigé'})
  await flow.submit()
  t.deepEqual(flow.form(), {...before, name: 'Nom corrigé'})
  await flow.submit()
  t.is(flow.step(), 'Points concernés')
  t.deepEqual(flow.form().targets, before.targets)
  t.deepEqual(flow.saveCalls(), [])
  t.deepEqual(flow.routes, [])
})

test('modifier l’année depuis Organisation renouvelle les relevés proposés sans enregistrer ni perdre le message', async t => {
  const flow = wizardInteraction()
  const nextYear = Number(flow.form().year) + 1
  await flow.submit()
  flow.update({openingMessage: 'Consigne à conserver'})
  flow.back()
  flow.child().props.onYearChange(String(nextYear))
  await flow.submit()
  t.is(flow.step(), 'Calendrier')
  t.deepEqual(flow.form().indexDates, configurationHelpers.defaultCampaignCalendar(nextYear).indexDates)
  t.is(flow.form().openingMessage, 'Consigne à conserver')
  t.deepEqual(flow.saveCalls(), [])
})

test('la mise à jour attend aussi la dernière étape et conserve la version attendue', async t => {
  const flow = wizardInteraction({campaign: wizardCampaign, onSaved: true})
  flow.update({name: 'Collecte modifiée'})
  await flow.submit()
  await flow.submit()
  t.truthy(wizardButton(flow.render(), 'Enregistrer les modifications'))
  t.deepEqual(flow.saveCalls(), [])
  await flow.submit()
  t.is(flow.saveCalls().length, 1)
  const [{id, payload}] = flow.saveCalls()
  t.is(id, wizardCampaign.id)
  t.is(payload.expectedVersion, wizardCampaign.version)
  t.is(payload.name, 'Collecte modifiée')
  t.is(payload.opensAt, wizardCampaign.opensAt.replace('Z', '.000Z'))
  t.is(payload.closesAt, wizardCampaign.closesAt.replace('Z', '.000Z'))
  t.deepEqual(flow.savedContexts, [{campaign: {id: wizardCampaign.id}}])
  t.deepEqual(flow.routes, [])
})

test('le brouillon peut être enregistré sans point mais jamais pendant une sélection en cours', async t => {
  const flow = wizardInteraction()
  await flow.submit()
  await flow.submit()
  t.is(flow.step(), 'Points concernés')
  flow.child().props.onBusyChange(true)
  t.true(wizardButton(flow.render(), 'Créer le brouillon').props.disabled)
  await flow.submit()
  t.deepEqual(flow.saveCalls(), [])
  flow.child().props.onBusyChange(false)
  t.false(wizardButton(flow.render(), 'Créer le brouillon').props.disabled)
  await flow.submit()
  t.is(flow.saveCalls().length, 1)
  t.deepEqual(flow.saveCalls()[0].payload.targets, [])
})

test('charger les résultats d’un filtre de points bloque la sauvegarde jusqu’à leur réception', async t => {
  const flow = wizardInteraction({campaign: wizardCampaign})
  await flow.mount()
  await flow.submit()
  await flow.submit()
  flow.child().props.setQuery('moulin')
  t.true(wizardButton(flow.render(), 'Enregistrer les modifications').props.disabled)
  await flow.submit()
  t.deepEqual(flow.saveCalls(), [])
  await flow.mount()
  t.false(wizardButton(flow.render(), 'Enregistrer les modifications').props.disabled)
  t.deepEqual(flow.saveCalls(), [])
  t.is(flow.calls.findLast(call => call.type === 'options').params.q, 'moulin')
})

test('une sauvegarde en cours interdit une deuxième soumission du brouillon', async t => {
  let finishSave
  const saveResult = new Promise(resolve => {
    finishSave = resolve
  })
  const flow = wizardInteraction({campaign: wizardCampaign, saveResult})
  await flow.submit()
  await flow.submit()
  const saving = flow.submit()
  t.true(wizardButton(flow.render(), 'Enregistrement…').props.disabled)
  await flow.submit()
  t.is(flow.saveCalls().length, 1)
  finishSave({success: true, data: {campaign: {id: wizardCampaign.id}}})
  await saving
  t.deepEqual(flow.routes, ['/campagnes/campaign'])
})

test('des dates incohérentes bloquent le calendrier avant de choisir les points', async t => {
  const flow = wizardInteraction({campaign: wizardCampaign})
  await flow.submit()
  flow.update({opensAt: '2026-12-02T00:00', closesAt: '2026-11-30T23:59'})
  await flow.submit()
  t.is(flow.step(), 'Calendrier')
  t.true(flow.html().includes('avant'))
  t.deepEqual(flow.saveCalls(), [])
  flow.update({opensAt: '2026-11-01T00:00', closesAt: '2026-11-30T23:59', indexDates: ['2026-10-31', '2026-06-01']})
  await flow.submit()
  t.is(flow.step(), 'Calendrier')
  t.true(flow.html().includes('ordre chronologique'))
  t.deepEqual(flow.saveCalls(), [])
})

test('la validation finale renvoie à la bonne étape et ne sauvegarde aucune configuration invalide', async t => {
  await Promise.all([[{name: ''}, 'Organisation'], [{closesAt: '2026-01-01T23:59'}, 'Calendrier']].map(async ([changes, expectedStep]) => {
    const flow = wizardInteraction({campaign: wizardCampaign})
    await flow.submit()
    await flow.submit()
    t.is(flow.step(), 'Points concernés')
    flow.update(changes)
    await flow.submit()
    t.is(flow.step(), expectedStep)
    t.deepEqual(flow.saveCalls(), [])
    t.deepEqual(flow.routes, [])
    t.deepEqual(flow.form().targets, [{exploitationId: 'exploitation', eligibilityConfirmed: true}])
  }))
})

test('deux exploitations d’un même point restent bloquées à la dernière étape sans création', async t => {
  const flow = wizardInteraction({campaign: wizardCampaign})
  await flow.submit()
  await flow.submit()
  flow.child().props.onTargetsLoaded([{...wizardOptions.exploitations[0], exploitationId: 'autre-exploitation'}])
  flow.update({targets: [{exploitationId: 'exploitation'}, {exploitationId: 'autre-exploitation'}]})
  await flow.submit()
  t.is(flow.step(), 'Points concernés')
  t.true(flow.html().includes('Un même point ne peut être sélectionné que pour une seule exploitation.'))
  t.deepEqual(flow.saveCalls(), [])
})

test('un conflit lors de l’enregistrement conserve la saisie sur la dernière étape', async t => {
  const flow = wizardInteraction({campaign: wizardCampaign, saveResult: {success: false, code: 409, error: 'Version dépassée'}})
  flow.update({name: 'Modifications à conserver'})
  await flow.submit()
  await flow.submit()
  await flow.submit()
  t.is(flow.step(), 'Points concernés')
  t.is(flow.form().name, 'Modifications à conserver')
  t.true(flow.html().includes('Conservez votre saisie et rechargez'))
  t.is(flow.saveCalls().length, 1)
  t.deepEqual(flow.routes, [])
  t.deepEqual(flow.savedContexts, [])
})

test('le gestionnaire en lecture seule ne peut ni configurer ni ouvrir ni associer un compteur', t => {
  const Component = loadComponent('campaign-management', {
    '@/components/campaigns/campaign-exports.js': {
      __esModule: true,
      default() {
        throw new Error('Les exports ne doivent pas être montés sans autorisation.')
      }
    }
  }).default
  const html = renderToStaticMarkup(React.createElement(Component, {initialContext: context()}))
  t.false(html.includes('Modifier le brouillon'))
  t.false(html.includes('Ouvrir la saisie</button>'))
  t.false(html.includes('Clôturer la saisie</button>'))
  t.false(html.includes('Ajouter un compteur'))
  t.false(html.includes('Relancer les réponses attendues'))
})

test('le récépissé affiche uniquement la version transmise, jamais le brouillon courant', t => {
  const Component = loadComponent('campaign-history').CampaignReceipt
  const initialContext = context()
  initialContext.responses.INDEX.draft = {
    comment: 'BROUILLON NON TRANSMIS', readings: [{
      targetId: 'a', compteurId: 'meter-a', readingDate: '2026-06-01', value: '999'
    }]
  }
  const submission = {
    id: 'submission', version: 2, submittedAt: '2026-09-01T08:30:00Z', createdBy: {label: 'Préleveur habilité'}, snapshot: {
      comment: 'TRANSMISSION VALIDÉE', readings: [{
        targetId: 'a', compteurId: 'meter-a', readingDate: '2026-06-01', value: '42'
      }]
    }, publication: {totals: [{targetId: 'a', periodId: 'p1', value: null}]}
  }
  const html = renderToStaticMarkup(React.createElement(Component, {submission, context: initialContext, kind: 'INDEX'}))
  t.true(html.includes('TRANSMISSION VALIDÉE'))
  t.false(html.includes('BROUILLON NON TRANSMIS'))
  t.false(html.includes('999'))
  t.true(html.includes('42 m³'))
  t.true(html.includes('Volume non calculable'))
  t.true(html.includes('Préleveur habilité'))
})
