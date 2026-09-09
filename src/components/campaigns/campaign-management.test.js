import React from 'react'

import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {runInNewContext} from 'node:vm'

import test from 'ava'
import {transformSync} from 'next/dist/build/swc/index.js'
import {renderToStaticMarkup} from 'react-dom/server'

import * as campaignHelpers from '../../lib/collection-campaigns.js'

const require = createRequire(import.meta.url)
const loadComponent = name => {
  const filename = new URL(`${name}.js`, import.meta.url)
  const {code} = transformSync(readFileSync(filename, 'utf8'), {filename: filename.pathname, jsc: {parser: {syntax: 'ecmascript', jsx: true}, transform: {react: {runtime: 'automatic'}}, target: 'es2022'}, module: {type: 'commonjs'}})
  const compiledModule = {exports: {}}
  const componentRequire = specifier => {
    if (specifier === '@/lib/collection-campaigns.js') {
      return campaignHelpers
    }

    if (specifier === '@/components/campaigns/campaign-config-form.js') {
      return {default: () => React.createElement('div', null, 'Formulaire de configuration')}
    }

    if (specifier === '@/components/campaigns/campaign-ui.js' || specifier === '@/components/campaigns/campaign-sharing.js') {
      return loadComponent(specifier.split('/').at(-1).replace('.js', ''))
    }

    if (specifier === '@/server/actions/campaigns.js') {
      return new Proxy({}, {
        get: () => () => {
          throw new Error('Aucun appel réseau pendant le rendu')
        }
      })
    }

    if (specifier === 'next/link') {
      return ({children, ...props}) => React.createElement('a', props, children)
    }

    if (specifier === 'next/navigation') {
      return {useRouter: () => ({replace() {}})}
    }

    return require(specifier)
  }

  runInNewContext('(function(require, module, exports) {' + code + '\n})', {setTimeout, clearTimeout, URLSearchParams})(componentRequire, compiledModule, compiledModule.exports)
  return compiledModule.exports
}

const {default: CampaignManagement, CampaignOverview, CampaignPointsSummary, campaignPreparationIssues} = loadComponent('campaign-management')
const campaign = {
  id: 'campaign', name: 'Relevés 2026 et besoins 2027', year: 2026, status: 'DRAFT', version: 1, timezone: 'Europe/Paris', indexDates: ['2025-11-01', '2026-06-01', '2026-11-01'], zone: {name: 'Bassin de la rivière'}, owner: {userId: 'owner', label: 'Organisme du bassin'}
}
const target = {
  id: 'target', exploitationId: 'exploitation', preleveurUserId: 'farmer', eligibilityConfirmed: true,
  pointPrelevement: {id: 'point', name: 'Forage du moulin', collectionMode: 'MANUAL'}, preleveur: {label: 'Ferme du moulin'}, usage: {id: 'usage', name: 'Irrigation'},
  meters: [{
    id: 'binding', associationId: 'binding', compteurId: 'meter', compteur: {serialNumber: '123456'}, startDate: '2025-01-01', endDate: null
  }]
}
const render = ({
  status = 'DRAFT', targets = [target], permissions = {
    canManage: true, canFollowup: true, canExport: true, canRemind: true
  }
} = {}) => renderToStaticMarkup(React.createElement(CampaignManagement, {initialContext: {campaign: {...campaign, status}, targets, permissions}}))

test('le brouillon ouvre une fiche permanente avec résumé et actions, pas un nouvel assistant', t => {
  const html = render()
  t.true(html.includes('Vue d’ensemble'))
  t.true(html.includes('Bassin de la rivière'))
  t.true(html.includes('Organisme du bassin'))
  t.true(html.includes('Irrigation'))
  t.true(html.includes('Points de prélèvement'))
  t.true(html.includes('Modifier le brouillon'))
  t.true(html.includes('Partage'))
  t.notRegex(html, /1\. Informations|2\. Vérifier|3\. Ouvrir|étape 2/)
  t.false(html.includes('Formulaire de configuration'))
  t.false(html.includes('Mes index de prélèvement'))
  t.false(html.includes('Préparer un export Excel'))
  t.false(html.includes('Journal des notifications'))
  t.false(html.includes('Fuseau horaire'))
  t.regex(html, /<button class="fr-btn" type="button" aria-describedby="campaign-opening-help">Ouvrir la saisie<\/button>/)
})

test('sans point, la préparation explique comment débloquer l’ouverture', t => {
  const html = render({targets: []})
  t.true(html.includes('Aucun point sélectionné'))
  t.true(html.includes('pour ajouter les points concernés'))
  t.regex(html, /<button class="fr-btn" type="button" disabled="" aria-describedby="campaign-opening-help">/)
})

test('aucun compteur renseigné : le point est prêt sans formulaire technique imposé', t => {
  t.is(campaignPreparationIssues(campaign, {...target, meters: []}).length, 0)
  const html = render({targets: [{...target, meters: []}]})
  t.true(html.includes('Renseigner un compteur (facultatif)'))
  t.false(html.includes('Ajoutez le compteur utilisé sur ce point'))
  t.false(html.includes('Numéro de série du compteur'))
  t.false(html.includes('Date de mise en service sur ce point'))
  t.false(html.includes('Aucun compteur'))
  t.regex(html, /<button class="fr-btn" type="button" aria-describedby="campaign-opening-help">Ouvrir la saisie<\/button>/)
})

test('un point sans mode renseigné est prêt sans devoir modifier sa fiche', t => {
  const point = {...target.pointPrelevement, collectionMode: null}
  const ready = {...target, pointPrelevement: point, meters: []}
  t.is(campaignPreparationIssues(campaign, ready).length, 0)
  const html = render({targets: [ready]})
  t.false(html.includes('Saisie manuelle'))
  t.regex(html, /<button class="fr-btn" type="button" aria-describedby="campaign-opening-help">Ouvrir la saisie<\/button>/)
  t.is(point.collectionMode, null)
})

test('la sélection reste obligatoire et les points externes restent exclus', t => {
  const issues = campaignPreparationIssues(campaign, {...target, eligibilityConfirmed: false, pointPrelevement: {...target.pointPrelevement, collectionMode: null}})
  t.is(issues.map(issue => issue.code).join(','), 'eligibility')
  const html = render({targets: [{...target, pointPrelevement: {...target.pointPrelevement, collectionMode: 'EXTERNAL'}}]})
  t.true(html.includes('Ce point transmet déjà ses données par un autre outil.'))
  t.true(html.includes('Retirez-le de la sélection'))
  t.regex(html, /<button class="fr-btn" type="button" disabled="" aria-describedby="campaign-opening-help">/)
  t.true(html.includes('href="/points-prelevement/point"'))
  t.false(html.includes('href="/points-prelevement/point/edit"'))
})

test('la vérification explique les dates de relevé non couvertes par un compteur', t => {
  const issues = campaignPreparationIssues(campaign, {...target, meters: [{...target.meters[0], endDate: '2026-05-31'}]})
  t.is(issues.length, 1)
  t.is(issues[0].code, 'dates')
  t.true(issues[0].message.includes('01/06/2026, 01/11/2026'))
  t.true(issues[0].message.includes('Corrigez les dates du compteur'))
})

test('un remplacement couvrant chaque relevé ne bloque pas la préparation', t => {
  const issues = campaignPreparationIssues(campaign, {...target, meters: [{...target.meters[0], endDate: '2026-06-01'}, {...target.meters[0], id: 'new-binding', startDate: '2026-06-01'}]})
  t.is(issues.length, 0)
})

test('la fiche ouverte sépare les rubriques et ne présente plus les formulaires de préparation', t => {
  const html = render({status: 'OPEN'})
  t.true(html.includes('Rubriques de la collecte'))
  t.true(html.includes('Suivi des réponses'))
  t.true(html.includes('Points de prélèvement'))
  t.true(html.includes('Vue d’ensemble'))
  t.true(html.includes('Partage'))
  t.true(html.includes('Exports et relances'))
  t.true(html.includes('Chargement des réponses'))
  t.false(html.includes('Enregistrer ce compteur'))
  t.false(html.includes('Ouvrir la saisie</button>'))
  t.false(html.includes('Préparer un export Excel'))
})

test('la lecture seule ne donne aucun contrôle de configuration, compteur, relance ou clôture', t => {
  const html = render({
    status: 'OPEN', permissions: {
      canRead: true, canManage: false, canFollowup: false, canExport: false, canRemind: false
    }
  })
  for (const label of ['Modifier le brouillon', 'Enregistrer ce compteur', 'Clôturer la saisie', 'Ouvrir la saisie</button>', 'Exports et relances', 'Partage']) {
    t.false(html.includes(label))
  }

  t.true(html.includes('Consulter mes index'))
  t.true(html.includes('Consulter mes besoins'))
})

test('la fiche clôturée conserve le résumé et les rubriques sans ouvrir ni modifier le calendrier', t => {
  const html = render({status: 'CLOSED'})
  t.true(html.includes('Vue d’ensemble'))
  t.true(html.includes('Saisie terminée'))
  t.true(html.includes('Partage'))
  t.false(html.includes('Modifier le brouillon'))
  t.false(html.includes('Clôturer la saisie'))
  t.false(html.includes('Ouvrir la saisie</button>'))
})

test('le résumé conserve les périodes exactes et affiche les bornes incluses sans fuseau technique', t => {
  const html = renderToStaticMarkup(React.createElement(CampaignOverview, {
    campaign: {
      ...campaign, periods: [{
        id: 'period', kind: 'INDEX', label: 'Période de prélèvements', startDate: '2025-11-01', endDate: '2026-06-01'
      }]
    }, targets: [target]
  }))
  t.true(html.includes('Période de prélèvements'))
  t.true(html.includes('31/05/2026'))
  t.false(html.includes('Europe/Paris'))
})

test('une période dérivée affiche les deux dates de relevé, sans retrancher un jour au second relevé', t => {
  const html = renderToStaticMarkup(React.createElement(CampaignOverview, {
    campaign: {
      ...campaign, periods: [{
        id: 'period', kind: 'INDEX', label: 'Période 1', startDate: '2025-11-01', endDate: '2026-06-01', startReadingDate: '2025-11-01', endReadingDate: '2026-06-01'
      }]
    }, targets: [target]
  }))
  t.true(html.includes('Entre les relevés du 01/11/2025 et du 01/06/2026'))
  t.false(html.includes('31/05/2026'))
})

test('les anciennes périodes ouvertes ou clôturées conservent leurs bornes distinctes des relevés', t => {
  for (const status of ['OPEN', 'CLOSED']) {
    const initialContext = {
      campaign: {
        ...campaign, status, periods: [{
          id: 'period', kind: 'INDEX', label: 'Période historique', startDate: '2025-11-01', endDate: '2026-06-01', startReadingDate: '2025-10-31', endReadingDate: '2026-06-01'
        }]
      }, targets: [target], permissions: {
        canManage: false, canFollowup: false, canExport: false, canRemind: false
      }
    }
    const html = renderToStaticMarkup(React.createElement(CampaignManagement, {initialContext}))
    t.true(html.includes('du 01/11/2025 au 31/05/2026 inclus'))
    t.false(html.includes('Entre les relevés'))
    t.false(html.includes('Modifier le brouillon'))
    t.false(html.includes('Ouvrir la saisie</button>'))
    t.false(html.includes('Clôturer la saisie'))
    t.is(initialContext.campaign.periods[0].startReadingDate, '2025-10-31')
  }
})

test('les besoins conservent leur date de fin incluse même si leurs dates correspondent aux relevés', t => {
  const html = renderToStaticMarkup(React.createElement(CampaignOverview, {
    campaign: {
      ...campaign, periods: [{
        id: 'period', kind: 'NEEDS', label: 'Besoins', startDate: '2025-11-01', endDate: '2026-06-01', startReadingDate: '2025-11-01', endReadingDate: '2026-06-01'
      }]
    }, targets: [target]
  }))
  t.true(html.includes('du 01/11/2025 au 31/05/2026 inclus'))
  t.false(html.includes('Entre les relevés'))
})

test('le gestionnaire peut ajouter un compteur remplacé en cours de collecte, pas modifier les anciens', t => {
  const html = renderToStaticMarkup(React.createElement(CampaignPointsSummary, {campaign: {...campaign, status: 'OPEN'}, targets: [target], canAddMeter: true}))
  t.true(html.includes('Un compteur a été remplacé sur ce point'))
  t.true(html.includes('Enregistrer ce compteur'))
  t.true(html.includes('devra ensuite renseigner le remplacement dans sa réponse'))
  t.true(html.includes('min="2025-11-01"'))
  t.true(html.includes('max="2026-11-01"'))
  t.false(html.includes('Enregistrer les dates'))
})

test('aucun ajout de compteur en lecture seule ni après clôture', t => {
  const summary = (status, canAddMeter) => renderToStaticMarkup(React.createElement(CampaignPointsSummary, {campaign: {...campaign, status}, targets: [target], canAddMeter}))
  t.false(summary('OPEN', false).includes('Enregistrer ce compteur'))
  t.false(summary('CLOSED', true).includes('Enregistrer ce compteur'))
})

test('un point ouvert sans inventaire conserve la saisie directe sans gestion technique', t => {
  const html = renderToStaticMarkup(React.createElement(CampaignPointsSummary, {campaign: {...campaign, status: 'OPEN'}, targets: [{...target, meters: []}], canAddMeter: true}))
  t.true(html.includes('Forage du moulin'))
  t.false(html.includes('Aucun compteur'))
  t.false(html.includes('Un compteur a été remplacé'))
  t.false(html.includes('Numéro de série du compteur'))
})
