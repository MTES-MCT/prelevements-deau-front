import React from 'react'

import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {runInNewContext} from 'node:vm'

import test from 'ava'
import {transformSync} from 'next/dist/build/swc/index.js'
import {renderToStaticMarkup} from 'react-dom/server'

import * as campaignCalendar from '../../lib/campaign-calendar.js'
import * as campaignTimeline from '../../lib/campaign-timeline.js'
import * as campaignHelpers from '../../lib/collection-campaigns.js'

const require = createRequire(import.meta.url)
const ResultsPlaceholder = ({actions}) => React.createElement('div', {'data-testid': 'campaign-results'}, actions, 'Suivi des réponses et résultats par préleveur')
const ExportsPlaceholder = () => React.createElement('div', {'data-testid': 'campaign-exports'}, 'Exports de la campagne')
const loadComponent = (name, overrides = {}, globals = {}) => {
  const filename = new URL(`${name}.js`, import.meta.url)
  const {code} = transformSync(readFileSync(filename, 'utf8'), {filename: filename.pathname, jsc: {parser: {syntax: 'ecmascript', jsx: true}, transform: {react: {runtime: 'automatic'}}, target: 'es2022'}, module: {type: 'commonjs'}})
  const compiledModule = {exports: {}}
  const componentRequire = specifier => {
    if (specifier in overrides) {
      return overrides[specifier]
    }

    if (specifier.endsWith('.module.css')) {
      return {}
    }

    if (specifier === '@/lib/campaign-calendar.js') {
      return campaignCalendar
    }

    if (specifier === '@/lib/campaign-timeline.js') {
      return campaignTimeline
    }

    if (specifier === '@/lib/collection-campaigns.js') {
      return campaignHelpers
    }

    if (specifier === '@/components/campaigns/campaign-config-form.js') {
      return {__esModule: true, default: () => React.createElement('div', null, 'Formulaire de configuration')}
    }

    if (specifier === '@/components/campaigns/campaign-results.js') {
      return {__esModule: true, default: ResultsPlaceholder}
    }

    if (specifier === '@/components/campaigns/campaign-exports.js') {
      return {__esModule: true, default: ExportsPlaceholder}
    }

    if (['campaign-ui', 'campaign-sharing', 'campaign-timeline', 'campaign-progress'].some(component => specifier === `@/components/campaigns/${component}.js`)) {
      return loadComponent(specifier.split('/').at(-1).replace('.js', ''), overrides, globals)
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

    if (specifier === 'next/navigation') {
      return {useRouter: () => ({replace() {}})}
    }

    return require(specifier)
  }

  runInNewContext('(function(require, module, exports) {' + code + '\n})', {
    setTimeout, clearTimeout, URLSearchParams, URL, ...globals
  })(componentRequire, compiledModule, compiledModule.exports)
  return compiledModule.exports
}

const {default: CampaignManagement, CampaignCalendar, CampaignConfigurationDetails, CampaignPointsSummary, campaignPreparationIssues, campaignOpeningIssue} = loadComponent('campaign-management')
const campaign = {
  id: 'campaign', name: 'Relevés 2026 et besoins 2027', year: 2026, status: 'DRAFT', version: 1, timezone: 'Europe/Paris', indexDates: ['2025-11-01', '2026-06-01', '2026-11-01'], zone: {name: 'Bassin de la rivière'}, owner: {userId: 'owner', label: 'Organisme du bassin'}
}
const fixedNow = '2026-09-10T10:00:00Z'
const responseSummary = {
  expectedCount: 2, receivedCount: 1, correctionCount: 0, scopeComplete: true,
  byKind: {INDEX: {expectedCount: 1, receivedCount: 1}, NEEDS: {expectedCount: 1, receivedCount: 0}}
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
} = {}) => renderToStaticMarkup(React.createElement(CampaignManagement, {initialContext: {campaign: {...campaign, status}, targets, permissions}, now: fixedNow}))

test('le brouillon ouvre le suivi des points avec résumé et calendrier, pas un nouvel assistant', t => {
  const html = render()
  t.true(html.includes('Vue d’ensemble'))
  t.true(html.includes('Bassin de la rivière'))
  t.true(html.includes('Organisme du bassin'))
  t.true(html.includes('Irrigation'))
  t.true(html.includes('>Suivi et résultats</button>'))
  t.true(html.includes('Modifier le brouillon'))
  t.true(html.includes('>Configuration</button>'))
  t.false(html.includes('>Partage</button>'))
  t.false(html.includes('>Actions</button>'))
  t.false(html.includes('>Exports</button>'))
  t.notRegex(html, /1\. Informations|2\. Vérifier|3\. Ouvrir|étape 2/)
  t.false(html.includes('Formulaire de configuration'))
  t.false(html.includes('Mes index de prélèvement'))
  t.false(html.includes('Préparer un export Excel'))
  t.false(html.includes('Journal des notifications'))
  t.false(html.includes('Fuseau horaire'))
  t.false(html.includes('Actualiser les points'))
  t.false(html.includes('Organisme responsable'))
  t.false(html.includes(' — '))
  t.true(html.includes('Collecteur'))
  t.false(html.includes('>Calendrier</button>'))
  t.true(html.includes('Calendrier de la campagne'))
  t.true(html.indexOf('Vue d’ensemble') < html.indexOf('Calendrier de la campagne'))
  t.true(html.indexOf('Calendrier de la campagne') < html.indexOf('Rubriques de la collecte'))
  t.false(html.includes('Ouvrir la saisie</button>'))
  t.true(html.includes('Préparer les points'))
})

test('sans point, la préparation explique comment débloquer l’ouverture', t => {
  const html = configurationFlow({targets: []}).html()
  t.true(html.includes('Aucun point sélectionné'))
  t.true(html.includes('pour ajouter les points concernés'))
  t.regex(html, /<button class="fr-btn" type="button" disabled="" aria-describedby="campaign-opening-help">/)
})

test('aucun compteur renseigné : le point est prêt sans formulaire technique imposé', t => {
  t.is(campaignPreparationIssues(campaign, {...target, meters: []}).length, 0)
  const html = configurationFlow({targets: [{...target, meters: []}]}).html()
  t.true(html.includes('Préparer l’ouverture'))
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
  const html = configurationFlow({targets: [ready]}).html()
  t.false(html.includes('Saisie manuelle'))
  t.regex(html, /<button class="fr-btn" type="button" aria-describedby="campaign-opening-help">Ouvrir la saisie<\/button>/)
  t.is(point.collectionMode, null)
})

test('la sélection reste obligatoire et les points externes restent exclus', t => {
  const issues = campaignPreparationIssues(campaign, {...target, eligibilityConfirmed: false, pointPrelevement: {...target.pointPrelevement, collectionMode: null}})
  t.is(issues.map(issue => issue.code).join(','), 'eligibility')
  const flow = configurationFlow({targets: [{...target, pointPrelevement: {...target.pointPrelevement, collectionMode: 'EXTERNAL'}}]})
  t.true(button(flow.render(), 'Ouvrir la saisie').props.disabled)
  button(flow.render(), 'Suivi et résultats').props.onClick()
  const html = flow.html()
  t.true(html.includes('Ce point transmet déjà ses données par un autre outil.'))
  t.true(html.includes('Retirez-le de la sélection'))
  t.true(html.includes('href="/points-prelevement/point"'))
  t.false(html.includes('href="/points-prelevement/point/edit"'))
})

test('la vérification explique les dates de relevé non couvertes par un compteur', t => {
  const issues = campaignPreparationIssues(campaign, {...target, meters: [{...target.meters[0], endDate: '2026-05-31'}]})
  t.is(issues.length, 1)
  t.is(issues[0].code, 'dates')
  t.true(issues[0].message.includes(['2026-06-01', '2026-11-01'].map(date => campaignHelpers.campaignDate(date)).join(', ')))
  t.true(issues[0].message.includes('Corrigez les dates du compteur'))
})

test('un remplacement couvrant chaque relevé ne bloque pas la préparation', t => {
  const issues = campaignPreparationIssues(campaign, {...target, meters: [{...target.meters[0], endDate: '2026-06-01'}, {...target.meters[0], id: 'new-binding', startDate: '2026-06-01'}]})
  t.is(issues.length, 0)
})

test('la fiche ouverte sépare les rubriques et ne présente plus les formulaires de préparation', t => {
  const html = render({status: 'OPEN'})
  t.true(html.includes('Rubriques de la collecte'))
  t.true(html.includes('>Suivi et résultats</button>'))
  t.false(html.includes('>Réponses</button>'))
  t.false(html.includes('>Points</button>'))
  t.true(html.includes('Vue d’ensemble'))
  t.true(html.includes('>Configuration</button>'))
  t.true(html.includes('>Exports</button>'))
  t.true(html.includes('aria-label="Relances"'))
  t.false(html.includes('Chargement des réponses'))
  t.false(html.includes('Enregistrer ce compteur'))
  t.false(html.includes('Ouvrir la saisie</button>'))
  t.false(html.includes('Exports de la campagne'))
  t.false(html.includes('Clôturer la saisie'))
  t.true(html.includes('Relancer les réponses attendues'))
})

test('la lecture seule ne donne aucun contrôle de configuration, compteur, relance ou clôture', t => {
  const html = render({
    status: 'OPEN', permissions: {
      canRead: true, canManage: false, canFollowup: false, canExport: false, canRemind: false
    }
  })
  for (const label of ['Modifier le brouillon', 'Enregistrer ce compteur', 'Clôturer la saisie', 'Ouvrir la saisie</button>', 'aria-label="Relances"', '>Configuration</button>', '>Exports</button>']) {
    t.false(html.includes(label))
  }

  t.false(html.includes('Consulter mes relevés'))
  t.false(html.includes('Consulter mes besoins en eau'))
  t.regex(html, /href="\/points-prelevement\/point"[^>]*>Forage du moulin<\/a>/)
})

test('la fiche clôturée conserve le résumé et les rubriques sans ouvrir ni modifier le calendrier', t => {
  const html = render({status: 'CLOSED'})
  t.true(html.includes('Vue d’ensemble'))
  t.true(html.includes('Saisie terminée'))
  t.true(html.includes('>Configuration</button>'))
  t.true(html.includes('>Exports</button>'))
  t.false(html.includes('Modifier le brouillon'))
  t.false(html.includes('Clôturer la saisie'))
  t.false(html.includes('Ouvrir la saisie</button>'))
  t.false(html.includes('Relancer les réponses attendues'))
  t.false(html.includes('Réouvrir'))
  t.false(html.includes('Exports de la campagne'))
})

test('la configuration conserve les périodes exactes avec leurs bornes incluses sans fuseau technique', t => {
  const html = renderToStaticMarkup(React.createElement(CampaignConfigurationDetails, {
    campaign: {
      ...campaign, periods: [{
        id: 'period', kind: 'INDEX', label: 'Période de prélèvements', startDate: '2025-11-01', endDate: '2026-06-01'
      }]
    }, targets: [target]
  }))
  t.true(html.includes('Période de prélèvements'))
  t.true(html.includes(campaignHelpers.campaignDate('2026-05-31')))
  t.false(html.includes('Europe/Paris'))
})

test('les périodes qui suivent exactement les relevés ne répètent pas leurs dates dans la configuration', t => {
  const html = renderToStaticMarkup(React.createElement(CampaignConfigurationDetails, {
    campaign: {
      ...campaign, periods: [{
        id: 'period', kind: 'INDEX', label: 'Période 1', startDate: '2025-11-01', endDate: '2026-06-01', startReadingDate: '2025-11-01', endReadingDate: '2026-06-01'
      }]
    }, targets: [target]
  }))
  t.false(html.includes('Périodes de prélèvement particulières'))
  t.false(html.includes('Entre les relevés'))
  t.false(html.includes(campaignHelpers.campaignDate('2025-11-01')))
  t.false(html.includes(campaignHelpers.campaignDate('2026-06-01')))
  t.false(html.includes(campaignHelpers.campaignDate('2026-05-31')))
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
    const html = renderToStaticMarkup(React.createElement(CampaignConfigurationDetails, {campaign: initialContext.campaign}))
    t.true(html.includes(`du ${campaignHelpers.campaignDate('2025-11-01')} au ${campaignHelpers.campaignDate('2026-05-31')}`))
    t.false(html.includes(' inclus'))
    t.false(html.includes('Entre les relevés'))
    t.false(html.includes('Modifier le brouillon'))
    t.false(html.includes('Ouvrir la saisie</button>'))
    t.false(html.includes('Clôturer la saisie'))
    t.is(initialContext.campaign.periods[0].startReadingDate, '2025-10-31')
  }
})

test('les besoins conservent leur date de fin incluse même si leurs dates correspondent aux relevés', t => {
  const html = renderToStaticMarkup(React.createElement(CampaignCalendar, {
    campaign: {
      ...campaign, periods: [{
        id: 'period', kind: 'NEEDS', label: 'Besoins', startDate: '2025-11-01', endDate: '2026-06-01', startReadingDate: '2025-11-01', endReadingDate: '2026-06-01'
      }]
    }, targets: [target]
  }))
  const text = html.replaceAll(/<[^<>]+>/g, ' ').replaceAll(/\s+/g, ' ')
  t.true(text.includes(`${campaignHelpers.campaignDate('2025-11-01')} au ${campaignHelpers.campaignDate('2026-05-31')}`))
  t.false(text.includes(' inclus'))
  t.false(html.includes('Entre les relevés'))
})

test('la frise du détail accepte les dates ISO des périodes renvoyées par l’API', t => {
  const html = renderToStaticMarkup(React.createElement(CampaignCalendar, {
    campaign: {
      ...campaign, periods: [{
        id: 'period', kind: 'NEEDS', label: 'Été 2027', startDate: '2027-06-01T00:00:00.000Z', endDate: '2027-11-01T00:00:00.000Z'
      }]
    }
  }))
  t.true(html.includes('Été 2027'))
  t.true(html.includes('1 juin 2027'))
  t.true(html.includes('31 octobre 2027'))
  t.false(html.includes('Dates de la période à préciser ou à corriger'))
})

test('le suivi ouvre les fiches par leur nom sans formulaire de compteur ni lien de réponse', t => {
  const html = renderToStaticMarkup(React.createElement(CampaignPointsSummary, {targets: [target], canAddMeter: true, showOwnResponses: true}))
  t.regex(html, /href="\/points-prelevement\/point"[^>]*>Forage du moulin<\/a>/)
  for (const text of ['Un compteur a été remplacé', 'Enregistrer ce compteur', 'Enregistrer les dates', 'Voir le point', 'Consulter mes relevés', 'Consulter mes besoins', 'Ouvrir la réponse']) {
    t.false(html.includes(text))
  }
})

test('un point sans identifiant garde un nom simple et aucun lien incomplet', t => {
  const html = renderToStaticMarkup(React.createElement(CampaignPointsSummary, {targets: [{...target, pointPrelevement: {name: 'Point sans identifiant'}}]}))
  t.true(html.includes('Point sans identifiant'))
  t.notRegex(html, /href=|<form|<button/)
})

test('un point ouvert sans inventaire conserve la saisie directe sans gestion technique', t => {
  const html = renderToStaticMarkup(React.createElement(CampaignPointsSummary, {campaign: {...campaign, status: 'OPEN'}, targets: [{...target, meters: []}], canAddMeter: true}))
  t.true(html.includes('Forage du moulin'))
  t.false(html.includes('Aucun compteur'))
  t.false(html.includes('Un compteur a été remplacé'))
  t.false(html.includes('Numéro de série du compteur'))
})

const nodes = tree => Array.isArray(tree) ? tree.flatMap(node => nodes(node)) : (tree && typeof tree === 'object' ? [tree, ...nodes(tree.props?.children)] : [])
const button = (tree, label) => nodes(tree).find(node => node.type === 'button' && node.props.children === label)
// Keep real React state for nested SSR children; only the directly invoked
// management component uses the controlled interaction state below.
const nestedHooks = {state: React.useState, effect: React.useEffect}
const interaction = ({
  status = 'DRAFT', confirmed = true, targets = [target], operationError, component = 'management', campaignOverrides = {},
  summaryResults = [], summary = responseSummary, exportItems = [], notifications = [], reminderProps = {},
  downloadUrl = 'https://documents.example.test/export.xlsx', actionOverrides = {}, now = fixedNow, permissions = {
    canManage: true, canManageSharing: true, canFollowup: true, canExport: true, canRemind: true
  }
} = {}) => {
  const state = []
  const calls = []
  const confirmations = []
  const effects = new Map()
  const pendingEffects = new Set()
  const listeners = new Map()
  const intervals = new Map()
  const timeouts = new Map()
  const downloads = []
  const routes = []
  let cursor = 0
  let timerId = 0
  let renderingMarkup = false
  let currentCampaign = {...campaign, status, ...campaignOverrides}
  const globals = {
    Date: class extends Date {
      constructor(...args) {
        super(...(args.length > 0 ? args : [now]))
      }

      static now() {
        return Date.parse(now)
      }
    },
    setInterval(callback) {
      const id = ++timerId
      intervals.set(id, callback)
      return id
    },
    clearInterval(id) {
      intervals.delete(id)
    },
    setTimeout(callback) {
      const id = ++timerId
      timeouts.set(id, callback)
      return id
    },
    clearTimeout(id) {
      timeouts.delete(id)
    },
    window: {
      addEventListener(event, listener) {
        listeners.set(event, listener)
      },
      removeEventListener(event, listener) {
        if (listeners.get(event) === listener) {
          listeners.delete(event)
        }
      },
      location: {assign: url => downloads.push(url)}
    }
  }
  const renderManagement = loadComponent('campaign-management', {
    react: {
      ...React,
      useEffect(effect, dependencies) {
        if (renderingMarkup) {
          return nestedHooks.effect(effect, dependencies)
        }

        const index = cursor++
        const previous = effects.get(index)
        if (!previous || !dependencies || dependencies.some((value, index) => value !== previous.dependencies?.[index])) {
          effects.set(index, {effect, dependencies, cleanup: previous?.cleanup})
          pendingEffects.add(index)
        }
      },
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
      }
    },
    'next/navigation': {useRouter: () => ({replace: href => routes.push(href)})},
    '@/lib/collection-campaigns.js': {
      ...campaignHelpers, confirmCampaignAction(message) {
        confirmations.push(message)
        return confirmed
      }
    },
    '@/server/actions/campaigns.js': {
      async setCampaignOpenAction(id, open, version) {
        calls.push({id, open, version})
        if (operationError) {
          return operationError
        }

        currentCampaign = {...currentCampaign, status: open ? 'OPEN' : 'CLOSED', version: version + 1}
        return {success: true, data: currentCampaign}
      },
      async getCampaignAction(id) {
        calls.push({reload: id})
        return {success: true, data: {campaign: currentCampaign, targets, permissions}}
      },
      async getCampaignResponseSummaryAction(id) {
        calls.push({summary: id})
        return summaryResults.shift() ?? {success: true, data: summary}
      },
      async createCampaignExportAction(id) {
        calls.push({export: id})
        return {success: true, data: {id: 'new-export', status: 'PENDING', createdAt: now}}
      },
      async getCampaignExportAction(id, exportId) {
        calls.push({download: id, exportId})
        return {success: true, data: {downloadUrl}}
      },
      async remindCampaignAction(id) {
        calls.push({remind: id})
        return {success: true, data: {queuedCount: 2}}
      },
      async listCampaignExportsAction(id) {
        calls.push({exports: id})
        return {success: true, data: exportItems}
      },
      async listCampaignNotificationsAction(id) {
        calls.push({notifications: id})
        return {success: true, data: notifications}
      },
      ...actionOverrides
    }
  }, globals)[component === 'reminders' ? 'CampaignReminders' : 'default']
  return {
    calls,
    confirmations,
    downloads,
    routes,
    listeners,
    intervals,
    timeouts,
    render() {
      cursor = 0
      return renderManagement(component === 'reminders'
        ? {
          campaignId: campaign.id, timezone: campaign.timezone, permissions, ...reminderProps
        }
        : {initialContext: {campaign: currentCampaign, targets, permissions}, now})
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
    async flushEffects() {
      for (const index of pendingEffects) {
        const effect = effects.get(index)
        effect.cleanup?.()
        effect.cleanup = effect.effect()
      }

      pendingEffects.clear()
      await new Promise(resolve => {
        setImmediate(resolve)
      })
    },
    focus() {
      listeners.get('focus')?.()
    },
    unmount() {
      for (const effect of effects.values()) {
        effect.cleanup?.()
      }

      pendingEffects.clear()
    }
  }
}

const configurationFlow = options => {
  const flow = interaction(options)
  button(flow.render(), 'Configuration').props.onClick()
  return flow
}

test('la configuration présente le partage avant la clôture, avec des cartes et titres identiques', t => {
  const flow = configurationFlow({status: 'OPEN'})
  const markup = flow.html()
  const sharing = markup.indexOf('>Partage de la campagne</h2>')
  const closing = markup.indexOf('>Terminer la campagne</h2>')
  t.true(sharing > 0)
  t.true(closing > sharing)
  t.true(markup.includes('<h2 class="fr-h5 fr-mb-0">Partage de la campagne</h2>'))
  t.true(markup.includes('<h2 class="fr-h5 fr-mb-0">Terminer la campagne</h2>'))
  t.deepEqual(flow.calls, [])
})

test('les rubriques conservent leur sélection sans recharger les points ni appeler le serveur', t => {
  const flow = interaction({status: 'OPEN'})
  t.true(button(flow.render(), 'Suivi et résultats').props['aria-pressed'])
  button(flow.render(), 'Exports').props.onClick()
  t.true(button(flow.render(), 'Exports').props['aria-pressed'])
  t.false(button(flow.render(), 'Suivi et résultats').props['aria-pressed'])
  button(flow.render(), 'Configuration').props.onClick()
  t.true(button(flow.render(), 'Configuration').props['aria-pressed'])
  t.deepEqual(flow.calls, [])
})

test('le résumé et le calendrier restent centraux quelle que soit la rubrique ou les droits', t => {
  for (const permissions of [{canRead: true, canManage: true, canFollowup: true}, {canRead: true}]) {
    const flow = interaction({status: 'OPEN', permissions})
    t.falsy(button(flow.render(), 'Calendrier'))
    const html = flow.html()
    t.true(html.includes('Vue d’ensemble'))
    t.true(html.includes('Calendrier de la campagne'))
    t.is((html.match(/Calendrier de la campagne/g) || []).length, 1)
    t.false(html.includes('>Le calendrier de la campagne<'))
    t.false(html.includes('Envoi des invitations et réponses'))
    t.false(html.includes('Chargement des réponses'))
    button(flow.render(), 'Suivi et résultats').props.onClick()
    t.true(flow.html().includes('Calendrier de la campagne'))
    t.deepEqual(flow.calls, [])
  }
})

test('modifier le brouillon masque le calendrier enregistré jusqu’à l’annulation ou la sauvegarde', async t => {
  const flow = configurationFlow()
  t.true(flow.html().includes('Calendrier de la campagne'))
  button(flow.render(), 'Modifier le brouillon').props.onClick()
  t.true(flow.html().includes('Formulaire de configuration'))
  t.false(flow.html().includes('Calendrier de la campagne'))
  t.false(flow.html().includes('aria-label="Dates des relevés"'))
  t.true(flow.html().includes('Vue d’ensemble'))
  button(flow.render(), 'Annuler les modifications').props.onClick()
  t.true(flow.html().includes('Calendrier de la campagne'))
  t.false(flow.html().includes('Formulaire de configuration'))
  t.deepEqual(flow.calls, [])
  button(flow.render(), 'Modifier le brouillon').props.onClick()
  const configuration = nodes(flow.render()).find(node => node.props?.context && node.props?.onSaved)
  await configuration.props.onSaved()
  t.true(flow.html().includes('Calendrier de la campagne'))
  t.false(flow.html().includes('Formulaire de configuration'))
  t.true(button(flow.render(), 'Configuration').props['aria-pressed'])
  t.deepEqual(flow.calls, [{reload: campaign.id}])
})

test('quitter Configuration avec un partage modifié nécessite toujours une confirmation', t => {
  const flow = configurationFlow({status: 'OPEN', confirmed: false})
  const sharing = nodes(flow.render()).find(node => node.props?.onDirtyChange)
  sharing.props.onDirtyChange(true)
  button(flow.render(), 'Suivi et résultats').props.onClick()
  t.true(button(flow.render(), 'Configuration').props['aria-pressed'])
  t.true(button(flow.render(), 'Clôturer la saisie').props.disabled)
  t.deepEqual(flow.calls, [])
  t.deepEqual(flow.confirmations, ['Quitter la configuration sans enregistrer les modifications de partage ?'])
})

test('l’ouverture reste confirmée, versionnée puis recharge automatiquement la campagne', async t => {
  const cancelled = configurationFlow({confirmed: false})
  await button(cancelled.render(), 'Ouvrir la saisie').props.onClick()
  t.deepEqual(cancelled.calls, [])
  const flow = configurationFlow()
  await button(flow.render(), 'Ouvrir la saisie').props.onClick()
  t.deepEqual(flow.calls, [{id: campaign.id, open: true, version: campaign.version}, {reload: campaign.id}])
  t.true(flow.confirmations[0].includes('envoyer les invitations'))
  t.true(button(flow.render(), 'Suivi et résultats').props['aria-pressed'])
  t.falsy(button(flow.render(), 'Ouvrir la saisie'))
})

test('les rubriques et actions indisponibles restent absentes en lecture seule', t => {
  const flow = interaction({status: 'OPEN', permissions: {canRead: true}})
  for (const label of ['Actions', 'Réponses', 'Exports', 'Configuration', 'Partage', 'Accès', 'Clôturer la saisie']) {
    t.falsy(button(flow.render(), label))
  }

  t.true(button(flow.render(), 'Suivi et résultats').props['aria-pressed'])
  t.deepEqual(flow.calls, [])
})

test('les trois rubriques séparent suivi, exports et configuration sans dupliquer les commandes', t => {
  const flow = interaction({status: 'OPEN'})
  const nav = nodes(flow.render()).find(node => node.type === 'nav')
  t.deepEqual(nodes(nav).filter(node => node.type === 'button').map(node => node.props.children), ['Suivi et résultats', 'Exports', 'Configuration'])
  t.is((flow.html().match(/>Relancer les réponses attendues<\/button>/g) || []).length, 1)
  t.false(flow.html().includes('Clôturer la saisie'))
  t.false(flow.html().includes('Exports de la campagne'))
  t.false(flow.html().includes('Gérer les accès'))
  button(flow.render(), 'Exports').props.onClick()
  t.true(flow.html().includes('Exports de la campagne'))
  t.false(flow.html().includes('Relancer les réponses attendues'))
  t.false(flow.html().includes('Clôturer la saisie'))
  button(flow.render(), 'Configuration').props.onClick()
  t.is((flow.html().match(/>Clôturer la saisie<\/button>/g) || []).length, 1)
  t.true(flow.html().includes('aria-label="Clôture de la saisie"'))
  t.false(flow.html().includes('Relancer les réponses attendues'))
  t.false(flow.html().includes('Exports de la campagne'))
  t.true(flow.html().includes('Calendrier de la campagne'))
  t.deepEqual(flow.calls, [])
})

test('le suivi est affiché au montage, les exports ne sont montés que dans leur onglet', async t => {
  const flow = interaction({status: 'OPEN'})
  t.true(nodes(flow.render()).some(node => node.type === ResultsPlaceholder))
  t.false(nodes(flow.render()).some(node => node.type === ExportsPlaceholder))
  await flow.flushEffects()
  t.deepEqual(flow.calls, [{summary: campaign.id}])
  t.is((flow.html().match(/role="img"/g) || []).length, 2)
  button(flow.render(), 'Configuration').props.onClick()
  t.false(nodes(flow.render()).some(node => node.type === ResultsPlaceholder || node.type === ExportsPlaceholder))
  button(flow.render(), 'Exports').props.onClick()
  t.true(nodes(flow.render()).some(node => node.type === ExportsPlaceholder))
  t.false(nodes(flow.render()).some(node => node.type === ResultsPlaceholder))
  await flow.flushEffects()
  t.deepEqual(flow.calls, [{summary: campaign.id}])
  button(flow.render(), 'Suivi et résultats').props.onClick()
  t.true(flow.html().includes('Suivi des réponses'))
  t.false(nodes(flow.render()).some(node => node.type === ExportsPlaceholder))
  flow.unmount()
})

test('les relances restent explicites, avec confirmation obligatoire des courriels', async t => {
  const cancelled = interaction({component: 'reminders', confirmed: false})
  await button(cancelled.render(), 'Relancer les réponses attendues').props.onClick()
  t.deepEqual(cancelled.calls, [])
  const flow = interaction({component: 'reminders'})
  await button(flow.render(), 'Relancer les réponses attendues').props.onClick()
  t.deepEqual(flow.calls, [{remind: campaign.id}])
  t.true(flow.confirmations[0].includes('Envoyer un rappel'))
})

test('un droit d’export seul ne donne pas accès aux relances, à la configuration ou aux courriels', async t => {
  const permissions = {canRead: true, canExport: true}
  const flow = interaction({status: 'OPEN', permissions})
  const html = flow.html()
  t.true(button(flow.render(), 'Suivi et résultats').props['aria-pressed'])
  t.truthy(button(flow.render(), 'Exports'))
  t.falsy(button(flow.render(), 'Configuration'))
  t.false(html.includes('Exports de la campagne'))
  for (const command of ['Clôturer la saisie', 'Modifier le brouillon', 'Relancer les réponses attendues', 'Gérer les accès', 'Gérer les compteurs', 'Historique des courriels']) {
    t.false(html.includes(command))
  }

  button(flow.render(), 'Exports').props.onClick()
  t.true(nodes(flow.render()).some(node => node.type === ExportsPlaceholder))
  const reminders = interaction({component: 'reminders', permissions})
  t.is(reminders.render(), null)
  await reminders.flushEffects()
  t.deepEqual(reminders.calls, [])
  reminders.unmount()
})

test('un conflit de version laisse le brouillon intact et propose le rechargement contrôlé', async t => {
  const flow = configurationFlow({operationError: {success: false, code: 409, error: 'La campagne a été modifiée ailleurs.'}})
  await button(flow.render(), 'Ouvrir la saisie').props.onClick()
  t.deepEqual(flow.calls, [{id: campaign.id, open: true, version: campaign.version}])
  t.true(flow.html().includes('La campagne a été modifiée ailleurs.'))
  t.true(flow.html().includes('Actualiser les informations enregistrées'))
  t.false(flow.html().includes('La collecte est ouverte.'))
  t.truthy(button(flow.render(), 'Modifier le brouillon'))
  await button(flow.render(), 'Actualiser les informations enregistrées').props.onClick()
  t.true(button(flow.render(), 'Suivi et résultats').props['aria-pressed'])
  t.deepEqual(flow.calls, [{id: campaign.id, open: true, version: campaign.version}, {reload: campaign.id}])
})

test('la perte des droits de gestion revient à une rubrique encore autorisée', async t => {
  const flow = configurationFlow()
  const sharing = nodes(flow.render()).find(node => node.props?.onDirtyChange)
  await sharing.props.onSaved({campaign, targets: [target], permissions: {canRead: true, canFollowup: true}})
  t.falsy(button(flow.render(), 'Configuration'))
  t.true(button(flow.render(), 'Suivi et résultats').props['aria-pressed'])
  t.false(flow.html().includes('Chargement des réponses'))
  t.true(flow.html().includes('Forage du moulin'))
  t.false(flow.html().includes('Enregistrer ce compteur'))
})

test('un brouillon en lecture seule conserve ses points visibles même avec un droit de suivi', async t => {
  const flow = interaction({permissions: {canRead: true, canFollowup: true}})
  t.true(button(flow.render(), 'Suivi et résultats').props['aria-pressed'])
  await flow.flushEffects()
  const html = flow.html()
  t.true(html.includes('Forage du moulin'))
  t.true(html.includes('Ferme du moulin'))
  t.true(html.includes('Compteur'))
  for (const label of ['Modifier le brouillon', 'Ouvrir la saisie</button>', 'Enregistrer ce compteur', 'Consulter mes relevés', 'Chargement de la progression']) {
    t.false(html.includes(label))
  }

  t.false(nodes(flow.render()).some(node => node.type === ResultsPlaceholder))
  t.deepEqual(flow.calls, [])
  flow.unmount()
})

test('la date d’ouverture et la date limite expliquent précisément le blocage du brouillon', t => {
  const dates = {opensAt: '2026-11-01T08:00:00Z', closesAt: '2026-12-01T00:00:00Z'}
  const now = '2026-10-01T10:00:00Z'
  t.true(campaignOpeningIssue({...campaign, ...dates}, now).startsWith('Ouverture possible à partir du 1 novembre 2026'))
  t.is(campaignOpeningIssue({...campaign, ...dates}, dates.opensAt), '')
  t.true(campaignOpeningIssue({...campaign, ...dates}, dates.closesAt).startsWith('Date limite dépassée'))
  for (const checkedAt of [now, dates.closesAt]) {
    const html = configurationFlow({campaignOverrides: dates, permissions: {canManage: true}, now: checkedAt}).html()
    t.regex(html, /<button class="fr-btn" type="button" disabled="" aria-describedby="campaign-opening-help">Ouvrir la saisie/)
    t.false(html.includes('Prête à ouvrir'))
    t.true(html.includes('Modifier le brouillon'))
  }
})

const progressNode = tree => nodes(tree).find(node => node.props?.progress)?.props.progress
const history = tree => nodes(tree).find(node => node.type === 'details' && node.props.onToggle)

test('la progression n’est jamais demandée en brouillon ou sans droit de suivi', async t => {
  await Promise.all([{}, {status: 'OPEN', permissions: {canRead: true}}, {status: 'OPEN', permissions: {canRead: true, canExport: true}}].map(async options => {
    const flow = interaction(options)
    flow.render()
    await flow.flushEffects()
    t.false(flow.calls.some(call => call.summary))
    t.false(flow.html().includes('Chargement de la progression'))
    button(flow.render(), 'Suivi et résultats').props.onClick()
    t.false(nodes(flow.render()).some(node => node.type === ResultsPlaceholder))
    await flow.flushEffects()
    t.false(flow.calls.some(call => call.summary))
    flow.unmount()
  }))
})

test('la progression reste accessible dans chaque onglet sans recharger les résultats détaillés', async t => {
  const flow = interaction({status: 'OPEN'})
  flow.render()
  await flow.flushEffects()
  for (const label of ['Configuration', 'Exports', 'Suivi et résultats']) {
    button(flow.render(), label).props.onClick()
    flow.render()
    // Les onglets sont parcourus successivement sur la même fiche montée.

    await flow.flushEffects()
    t.is((flow.html().match(/role="img"/g) || []).length, 2)
    t.true(flow.html().includes('Besoins en eau'))
    t.true(flow.html().includes('Relevés de compteurs'))
    t.true(flow.html().includes('Reçues'))
    t.true(flow.html().includes('Attendues'))
    t.false(flow.html().includes('Correction à transmettre'))
  }

  t.deepEqual(flow.calls, [{summary: campaign.id}])
  flow.unmount()
})

test('le retour sur la page et les changements de version rafraîchissent le résumé, pas le calendrier enregistré', async t => {
  const flow = interaction({status: 'OPEN'})
  flow.render()
  await flow.flushEffects()
  t.is(flow.intervals.size, 1)
  t.true(flow.listeners.has('focus'))
  flow.focus()
  flow.render()
  await flow.flushEffects()
  t.deepEqual(flow.calls, [{summary: campaign.id}, {summary: campaign.id}])
  button(flow.render(), 'Configuration').props.onClick()
  await button(flow.render(), 'Clôturer la saisie').props.onClick()
  flow.render()
  await flow.flushEffects()
  t.deepEqual(flow.calls, [
    {summary: campaign.id}, {summary: campaign.id}, {id: campaign.id, open: false, version: campaign.version}, {reload: campaign.id}, {summary: campaign.id}
  ])
  t.true(flow.html().includes('Saisie terminée'))
  t.true(button(flow.render(), 'Configuration').props['aria-pressed'])
  t.is(flow.intervals.size, 1)
  flow.unmount()
  t.is(flow.intervals.size, 0)
  t.false(flow.listeners.has('focus'))
})

test('la progression en erreur peut être réessayée sans faire disparaître le reste de la fiche', async t => {
  const flow = interaction({status: 'OPEN', summaryResults: [{success: false, error: 'Le résumé est indisponible.'}]})
  flow.render()
  await flow.flushEffects()
  t.true(flow.html().includes('La progression n’a pas pu être chargée.'))
  t.true(flow.html().includes('Calendrier de la campagne'))
  t.false(flow.html().includes('role="img"'))
  progressNode(flow.render()).props.onRetry()
  flow.render()
  await flow.flushEffects()
  t.deepEqual(flow.calls, [{summary: campaign.id}, {summary: campaign.id}])
  t.is((flow.html().match(/role="img"/g) || []).length, 2)
  t.false(flow.html().includes('La progression n’a pas pu être chargée.'))
  flow.unmount()
})

test('une réponse tardive du résumé est ignorée après démontage', async t => {
  let resolveSummary
  const pending = new Promise(resolve => {
    resolveSummary = resolve
  })
  const flow = interaction({status: 'OPEN', actionOverrides: {getCampaignResponseSummaryAction: () => pending}})
  flow.render()
  await flow.flushEffects()
  flow.unmount()
  resolveSummary({success: true, data: responseSummary})
  await new Promise(resolve => {
    setImmediate(resolve)
  })
  t.true(flow.html().includes('Chargement de la progression'))
  t.false(flow.html().includes('role="img"'))
  t.is(flow.intervals.size, 0)
})

test('une ancienne requête de progression ne remplace pas le résumé rafraîchi au retour sur la page', async t => {
  let resolvePrevious
  const previous = new Promise(resolve => {
    resolvePrevious = resolve
  })
  const flow = interaction({status: 'OPEN', summaryResults: [previous]})
  flow.render()
  await flow.flushEffects()
  flow.focus()
  flow.render()
  await flow.flushEffects()
  t.true(flow.html().includes('Besoins en eau : 0 reçue'))
  resolvePrevious({success: true, data: {...responseSummary, receivedCount: 2, byKind: {...responseSummary.byKind, NEEDS: {expectedCount: 1, receivedCount: 1}}}})
  await new Promise(resolve => {
    setImmediate(resolve)
  })
  t.true(flow.html().includes('Besoins en eau : 0 reçue'))
  t.false(flow.html().includes('Besoins en eau : 1 reçue'))
  t.deepEqual(flow.calls, [{summary: campaign.id}, {summary: campaign.id}])
  flow.unmount()
})

test('la perte du droit de suivi retire immédiatement la progression et les résultats', async t => {
  const flow = interaction({status: 'OPEN'})
  flow.render()
  await flow.flushEffects()
  button(flow.render(), 'Configuration').props.onClick()
  const sharing = nodes(flow.render()).find(node => node.props?.onDirtyChange)
  await sharing.props.onSaved({campaign: {...campaign, status: 'OPEN'}, targets: [target], permissions: {canRead: true}})
  flow.render()
  await flow.flushEffects()
  t.true(button(flow.render(), 'Suivi et résultats').props['aria-pressed'])
  t.false(flow.html().includes('role="img"'))
  t.false(nodes(flow.render()).some(node => node.type === ResultsPlaceholder))
  t.false(flow.html().includes('Consulter mes relevés'))
  t.regex(flow.html(), /href="\/points-prelevement\/point"[^>]*>Forage du moulin<\/a>/)
  t.deepEqual(flow.calls, [{summary: campaign.id}])
  flow.unmount()
})

test('la révocation complète des accès redirige sans charger une campagne devenue interdite', async t => {
  const flow = interaction({status: 'OPEN'})
  button(flow.render(), 'Configuration').props.onClick()
  const sharing = nodes(flow.render()).find(node => node.props?.onDirtyChange)
  await sharing.props.onSaved({accessRevoked: true})
  t.deepEqual(flow.routes, ['/campagnes'])
  t.deepEqual(flow.calls, [])
})

test('toutes les réponses reçues retirent la relance même avec une modification non transmise', async t => {
  const summary = {
    ...responseSummary, receivedCount: 2, correctionCount: 1, byKind: {INDEX: {expectedCount: 1, receivedCount: 1}, NEEDS: {expectedCount: 1, receivedCount: 1, correctionCount: 1}}
  }
  const flow = interaction({status: 'OPEN', summary})
  flow.render()
  await flow.flushEffects()
  const html = flow.html()
  t.true(html.includes('Relevés de compteurs : 1 reçue'))
  t.true(html.includes('Besoins en eau : 1 reçue · 0 attendue'))
  t.false(html.includes('correction à transmettre'))
  t.true(html.includes('Toutes les réponses attendues ont été reçues.'))
  t.false(html.includes('Relancer les réponses attendues'))
  t.false(html.includes('Clôturer la saisie'))
  t.truthy(button(flow.render(), 'Exports'))
  button(flow.render(), 'Configuration').props.onClick()
  t.truthy(button(flow.render(), 'Clôturer la saisie'))
  flow.unmount()
})

test('les dates effectives bloquent les relances avant ouverture et après échéance, sans prétendre clôturer', t => {
  for (const campaignOverrides of [{opensAt: '2026-09-11T10:00:00Z'}, {closesAt: fixedNow}]) {
    const flow = interaction({status: 'OPEN', campaignOverrides})
    const html = flow.html()
    t.false(html.includes('Relancer les réponses attendues'))
    t.false(html.includes('Clôturer la saisie'))
    t.truthy(button(flow.render(), 'Exports'))
    button(flow.render(), 'Configuration').props.onClick()
    t.truthy(button(flow.render(), 'Clôturer la saisie'))
    t.false(html.includes('fr-badge--success'))
    if (campaignOverrides.closesAt) {
      t.true(html.includes('Date limite dépassée'))
    }
  }
})

test('la clôture annulée ne modifie rien, même après chargement du résumé', async t => {
  const flow = configurationFlow({status: 'OPEN', confirmed: false})
  flow.render()
  await flow.flushEffects()
  await button(flow.render(), 'Clôturer la saisie').props.onClick()
  t.deepEqual(flow.calls, [{summary: campaign.id}])
  t.regex(flow.confirmations[0], /ne pourront plus modifier/)
  t.true(flow.html().includes('Saisie ouverte'))
  flow.unmount()
})

test('les courriels ne sont chargés qu’au dépliage de leur historique', async t => {
  const flow = interaction({
    component: 'reminders', notifications: [{
      id: 'notification', kind: 'REMINDER', status: 'FAILED', createdAt: fixedNow
    }]
  })
  flow.render()
  await flow.flushEffects()
  t.deepEqual(flow.calls, [])
  t.false(flow.html().includes('Rappel : Échec'))
  history(flow.render()).props.onToggle({currentTarget: {open: true}})
  flow.render()
  await flow.flushEffects()
  t.deepEqual(flow.calls, [{notifications: campaign.id}])
  t.true(flow.html().includes('Rappel : Échec'))
  t.true(flow.html().includes('Une réponse reçue reste valide'))
  history(flow.render()).props.onToggle({currentTarget: {open: false}})
  flow.render()
  await flow.flushEffects()
  t.is(flow.calls.filter(call => call.notifications).length, 1)
  flow.unmount()
})

test('le droit d’export seul ne donne ni relance ni historique de courriels', async t => {
  await Promise.all([{canExport: true}, {canRemind: true}].map(async permissions => {
    const flow = interaction({component: 'reminders', permissions})
    flow.render()
    await flow.flushEffects()
    t.deepEqual(flow.calls, [])
    const historyControl = history(flow.render())
    t.is(Boolean(historyControl), Boolean(permissions.canRemind))
    historyControl?.props.onToggle({currentTarget: {open: true}})
    flow.render()
    await flow.flushEffects()
    const html = flow.html()
    t.is(flow.calls.some(call => call.notifications), Boolean(permissions.canRemind))
    t.false(flow.calls.some(call => call.exports))
    t.is(html.includes('Historique des courriels'), Boolean(permissions.canRemind))
    t.false(html.includes('Exports précédents'))
    flow.unmount()
  }))
})

test('les relances désactivées bloquent aussi leur callback sans demander confirmation', async t => {
  const flow = interaction({component: 'reminders', reminderProps: {disabled: true}})
  const control = button(flow.render(), 'Relancer les réponses attendues')
  t.true(control.props.disabled)
  await control.props.onClick()
  t.deepEqual(flow.calls, [])
  t.deepEqual(flow.confirmations, [])
  t.deepEqual(flow.downloads, [])
})

test('la relance rafraîchit le résumé après succès sans demander d’export', async t => {
  const flow = interaction({status: 'OPEN'})
  flow.render()
  await flow.flushEffects()
  const results = nodes(flow.render()).find(node => node.type === ResultsPlaceholder)
  results.props.actions.props.onReminded()
  flow.render()
  await flow.flushEffects()
  t.deepEqual(flow.calls, [{summary: campaign.id}, {summary: campaign.id}])
  t.true(button(flow.render(), 'Suivi et résultats').props['aria-pressed'])
  flow.unmount()
})

test('la prochaine relance automatique est affichée sans demander de données ni envoyer de courriel', async t => {
  const flow = interaction({component: 'reminders', reminderProps: {nextReminderDate: '2026-09-25'}})
  const html = flow.html()
  t.true(html.includes('Prochaine relance automatique : 25 septembre 2026'))
  t.true(html.includes('si une réponse manque.'))
  await flow.flushEffects()
  t.deepEqual(flow.calls, [])
  flow.unmount()
})

test('une erreur de relance reste explicite et ne rafraîchit pas le résumé comme un succès', async t => {
  let refreshed = false
  const flow = interaction({
    component: 'reminders', reminderProps: {
      onReminded() {
        refreshed = true
      }
    }, actionOverrides: {
      async remindCampaignAction() {
        return {success: false, error: 'Relance refusée.'}
      }
    }
  })
  await button(flow.render(), 'Relancer les réponses attendues').props.onClick()
  t.true(flow.html().includes('Relance refusée.'))
  t.false(refreshed)
  t.false(button(flow.render(), 'Relancer les réponses attendues').props.disabled)
})

test('le partage sans droit de modification reste consultable dans Configuration, sans ouverture ni clôture', t => {
  const flow = configurationFlow({status: 'OPEN', campaignOverrides: {managers: []}, permissions: {canRead: true, canFollowup: true, canManageSharing: false}})
  t.true(button(flow.render(), 'Configuration').props['aria-pressed'])
  const sharing = nodes(flow.render()).find(node => node.props?.onDirtyChange)
  t.false(sharing.props.canManageSharing)
  t.falsy(button(flow.render(), 'Clôturer la saisie'))
  t.falsy(button(flow.render(), 'Ouvrir la saisie'))
  t.falsy(button(flow.render(), 'Exports'))
})

test('le droit de partage seul ne donne pas la gestion, l’export ou la relance de la campagne', t => {
  const flow = configurationFlow({status: 'OPEN', permissions: {canRead: true, canManageSharing: true}})
  const sharing = nodes(flow.render()).find(node => node.props?.onDirtyChange)
  t.true(sharing.props.canManageSharing)
  for (const label of ['Clôturer la saisie', 'Ouvrir la saisie', 'Modifier le brouillon', 'Exports', 'Relancer les réponses attendues']) {
    t.falsy(button(flow.render(), label))
  }

  t.false(flow.html().includes('Historique des courriels'))
})

test('la gestion sans droit de partage conserve la clôture mais aucun formulaire de partage modifiable', t => {
  const flow = configurationFlow({status: 'OPEN', permissions: {canRead: true, canManage: true, canManageSharing: false}})
  const sharing = nodes(flow.render()).find(node => node.props?.onDirtyChange)
  t.false(sharing.props.canManageSharing)
  t.truthy(button(flow.render(), 'Clôturer la saisie'))
  t.falsy(button(flow.render(), 'Exports'))
})

test('le retour de sauvegarde de partage conserve Configuration tant que le droit de partage existe', async t => {
  const flow = configurationFlow({status: 'OPEN'})
  const sharing = nodes(flow.render()).find(node => node.props?.onDirtyChange)
  await sharing.props.onSaved({campaign: {...campaign, status: 'OPEN'}, targets: [target], permissions: {canRead: true, canManageSharing: true}})
  t.true(button(flow.render(), 'Configuration').props['aria-pressed'])
  t.falsy(button(flow.render(), 'Clôturer la saisie'))
  t.true(flow.html().includes('Les accès sont enregistrés.'))
  t.deepEqual(flow.calls, [])
})

test('un échec de chargement des courriels ne devient pas un faux historique vide', async t => {
  const flow = interaction({
    component: 'reminders', actionOverrides: {
      async listCampaignNotificationsAction() {
        return {success: false, error: 'Historique indisponible.'}
      }
    }
  })
  history(flow.render()).props.onToggle({currentTarget: {open: true}})
  flow.render()
  await flow.flushEffects()
  const html = flow.html()
  t.true(html.includes('Historique indisponible.'))
  t.false(html.includes('Aucun courriel.'))
  t.truthy(button(flow.render(), 'Actualiser l’historique'))
  flow.unmount()
})

test('les informations historiques restent dans Configuration et ne sont plus répétées sous le calendrier', t => {
  const openingMessage = 'Merci de renseigner les deux volets.'
  const periods = [{
    id: 'old', kind: 'INDEX', label: 'Période historique', startDate: '2025-11-01', endDate: '2026-06-01', startReadingDate: '2025-10-31', endReadingDate: '2026-06-01'
  }]
  const flow = interaction({status: 'CLOSED', campaignOverrides: {openingMessage, periods}, permissions: {canRead: true}})
  t.false(flow.html().includes(openingMessage))
  t.false(flow.html().includes('Périodes couvertes par les volumes prélevés'))
  button(flow.render(), 'Configuration').props.onClick()
  const html = flow.html()
  t.true(html.includes(openingMessage))
  t.true(html.includes('Périodes couvertes par les volumes prélevés'))
  t.true(html.includes(`du ${campaignHelpers.campaignDate('2025-11-01')} au ${campaignHelpers.campaignDate('2026-05-31')}`))
  t.false(html.includes(' inclus'))
  t.is((html.match(/Message aux préleveurs/g) || []).length, 1)
  t.falsy(button(flow.render(), 'Clôturer la saisie'))
  t.false(html.includes('Enregistrer les accès'))
})
