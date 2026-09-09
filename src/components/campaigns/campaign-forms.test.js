import React from 'react'

import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {runInNewContext} from 'node:vm'

import test from 'ava'
import {transformSync} from 'next/dist/build/swc/index.js'
import {renderToStaticMarkup} from 'react-dom/server'

import * as configurationHelpers from '../../lib/campaign-configuration.js'
import * as draftQueue from '../../lib/campaign-draft.js'
import * as pointSelectionHelpers from '../../lib/campaign-point-selection.js'
import * as campaignHelpers from '../../lib/collection-campaigns.js'
import * as waterHelpers from '../../lib/water-uses.js'

const require = createRequire(import.meta.url)
const loaded = new Map()
const loadComponent = name => {
  if (loaded.has(name)) {
    return loaded.get(name)
  }

  const filename = new URL(`${name}.js`, import.meta.url)
  const {code} = transformSync(readFileSync(filename, 'utf8'), {filename: filename.pathname, jsc: {parser: {syntax: 'ecmascript', jsx: true}, transform: {react: {runtime: 'automatic'}}, target: 'es2022'}, module: {type: 'commonjs'}})
  const compiledModule = {exports: {}}
  const componentRequire = specifier => {
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
      return loadComponent(specifier.split('/').at(-1).replace('.js', ''))
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
    structuredClone, setTimeout, clearTimeout, URLSearchParams
  })(componentRequire, compiledModule, compiledModule.exports)
  loaded.set(name, compiledModule.exports)
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

test('rendu index en lecture seule : champs désactivés et aucune commande de mutation', t => {
  const Component = loadComponent('campaign-response-form').default
  const html = renderToStaticMarkup(React.createElement(Component, {initialContext: context(), kind: 'INDEX'}))
  t.true(html.includes('Relevés de compteurs'))
  t.true(html.includes('href="/mes-declarations#demandes"'))
  t.false(html.includes('href="/mes-index"'))
  t.regex(html, /<fieldset[^>]*disabled=""/)
  t.false(html.includes('Transmettre la réponse'))
  t.false(html.includes('Enregistrer le brouillon'))
  t.false(html.includes('Ajouter l’événement au brouillon'))
})

test('un collecteur partiel a un formulaire restreint, jamais un bouton de transmission', t => {
  const Component = loadComponent('campaign-response-form').default
  const html = renderToStaticMarkup(React.createElement(Component, {initialContext: context({canEdit: true, editableTargetIds: ['a']}), kind: 'INDEX'}))
  t.true(html.includes('Enregistrer le brouillon'))
  t.false(html.includes('Transmettre la réponse'))
  t.regex(html, /<fieldset[^>]*disabled=""><legend[^>]*>Compteur B/)
  t.notRegex(html, /<fieldset[^>]*disabled=""><legend[^>]*>Compteur A/)
})

test('la réponse rappelle l’organisme demandeur et la campagne sans ajouter de navigation globale', t => {
  const Component = loadComponent('campaign-response-form').default
  const initialContext = context()
  initialContext.campaign.owner = {label: 'Organisme de gestion des eaux'}
  const html = renderToStaticMarkup(React.createElement(Component, {initialContext, kind: 'INDEX'}))
  t.true(html.includes('Relevés de compteurs'))
  t.true(html.includes('Collecte de bassin — 2026'))
  t.true(html.includes('Demandé par <strong>Organisme de gestion des eaux</strong>'))
  t.true(html.includes('href="/mes-declarations#demandes">Mes déclarations</a>'))
  t.false(html.includes('href="/mes-index"'))
  t.false(html.includes('href="/mes-besoins"'))
  t.false(html.includes('Passer aux besoins en eau'))
})

test('après transmission, le lien vers les besoins conserve le préleveur représenté sans débloquer la saisie', t => {
  const Component = loadComponent('campaign-response-form').default
  const initialContext = context({status: 'SUBMITTED'})
  initialContext.preleveurUserId = 'mandat & autre'
  const html = renderToStaticMarkup(React.createElement(Component, {initialContext, kind: 'INDEX'}))
  t.true(html.includes('href="/mes-besoins/campaign?preleveurUserId=mandat+%26+autre"'))
  t.true(html.includes('Passer aux besoins en eau'))
  t.false(html.includes('Enregistrer le brouillon'))
  t.false(html.includes('Transmettre la réponse'))
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

test('le volet besoins présente deux unités explicites et la fin de période incluse', t => {
  const Component = loadComponent('campaign-response-form').default
  const html = renderToStaticMarkup(React.createElement(Component, {initialContext: context({canEdit: true, canSubmit: true, editableTargetIds: ['a', 'b']}), kind: 'NEEDS'}))
  t.true(html.includes('Débit demandé (m³/h)'))
  t.true(html.includes('Volume demandé (m³)'))
  t.true(html.includes('31/05/2027'))
  t.true(html.includes('Transmettre la réponse'))
  t.false(html.includes('Ajouter l’événement au brouillon'))
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
  t.true(html.includes('Vérifier'))
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

test('le calendrier ne présente que les dates de relevé et les besoins, sans second calendrier de calcul', t => {
  const {CalendarStep} = loadComponent('campaign-config-form')
  const form = configurationHelpers.initialCampaignConfiguration(undefined, {}, 2026)
  const html = renderToStaticMarkup(React.createElement(CalendarStep, {form, update() {}}))
  t.true(html.includes('Le volume prélevé sera déduit de deux relevés successifs.'))
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

test('le récapitulatif ne propose ni partage du suivi ni confirmation redondante des points', t => {
  const {ReviewStep} = loadComponent('campaign-config-form')
  const form = configurationHelpers.initialCampaignConfiguration(undefined, {}, 2026)
  form.targets = [{exploitationId: 'exploitation', eligibilityConfirmed: true}]
  const html = renderToStaticMarkup(React.createElement(ReviewStep, {
    form, options: {}, knownTargets: new Map([['exploitation', {pointPrelevement: {name: 'Forage du moulin'}}]]), update() {}, goToStep() {}
  }))
  t.true(html.includes('Forage du moulin'))
  t.true(html.includes('Date limite de réponse'))
  t.true(html.includes('Dates des relevés'))
  t.true(html.includes('Besoins en eau'))
  t.false(html.includes('Volumes prélevés'))
  t.notRegex(html, /Partager|partage|Autre collecteur|participation vérifiée|participation à vérifier|Je confirme/)
})

test('le gestionnaire en lecture seule ne peut ni configurer ni ouvrir ni associer un compteur', t => {
  const Component = loadComponent('campaign-management').default
  const html = renderToStaticMarkup(React.createElement(Component, {initialContext: context()}))
  t.false(html.includes('Modifier la configuration'))
  t.false(html.includes('Ouvrir la campagne</button>'))
  t.false(html.includes('Associer le compteur'))
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
