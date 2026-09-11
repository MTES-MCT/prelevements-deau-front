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

const loadComponent = (name, {user, actions = {}, pathname = '/tableau-de-bord'} = {}) => {
  const filename = new URL(`../${name}.js`, import.meta.url)
  const {code} = transformSync(readFileSync(filename, 'utf8'), {filename: filename.pathname, jsc: {parser: {syntax: 'ecmascript', jsx: true}, transform: {react: {runtime: 'automatic'}}, target: 'es2022'}, module: {type: 'commonjs'}})
  const compiledModule = {exports: {}}
  const componentRequire = specifier => {
    if (specifier === '@/lib/collection-campaigns.js') {
      return campaignHelpers
    }

    if (specifier === '@/lib/campaign-calendar.js') {
      return campaignCalendar
    }

    if (specifier === '@/lib/campaign-timeline.js') {
      return campaignTimeline
    }

    if (specifier === '@/contexts/auth-context.js') {
      return {useAuth: () => ({user, isLoading: false})}
    }

    if (['@/components/campaigns/campaign-ui.js', '@/components/campaigns/campaign-list.js', '@/components/campaigns/campaign-progress.js'].includes(specifier)) {
      return loadComponent(specifier.slice('@/components/'.length, -3), {user, actions, pathname})
    }

    if (specifier === '@/server/actions/campaigns.js') {
      return actions
    }

    if (specifier === 'next/navigation') {
      return {usePathname: () => pathname}
    }

    if (specifier === 'next/link') {
      return function Link({children, ...props}) {
        return React.createElement('a', props, children)
      }
    }

    if (specifier === 'next/dynamic') {
      return () => () => null
    }

    if (specifier === '@codegouvfr/react-dsfr/Header') {
      return {Header: ({navigation}) => React.createElement('nav', {}, navigation.map(item => React.createElement('a', {...item.linkProps, key: item.linkProps.href, 'aria-current': item.isActive ? 'page' : undefined}, item.text)))}
    }

    if (specifier === '@codegouvfr/react-dsfr/SegmentedControl') {
      return {SegmentedControl: () => null}
    }

    if (specifier === '@/components/zones/zone-icons.js') {
      return {ZONE_ICONS: {}}
    }

    if (specifier === '@/lib/urls.js') {
      return {getDeclarationsURL: () => '/declarations', getMyDeclarationsURL: () => '/mes-declarations', getPointsPrelevementURL: () => '/points-prelevement'}
    }

    if (specifier === '@/lib/water-uses.js') {
      return {isDashboardVisibleUsage: () => true}
    }

    if (specifier.startsWith('@/')) {
      return {__esModule: true, default: () => null, StartDsfrOnHydration: () => null}
    }

    return require(specifier)
  }

  runInNewContext('(function(require, module, exports) {' + code + '\n})', {})(componentRequire, compiledModule, compiledModule.exports)
  return compiledModule.exports
}

const renderList = props => renderToStaticMarkup(React.createElement(loadComponent('campaigns/campaign-list').default, props))

test('le menu principal n’ajoute aucun onglet Campagnes, Mes index ou Mes besoins', t => {
  for (const user of [{role: 'ADMIN'}, {role: 'INSTRUCTOR'}, {role: 'DECLARANT', declarantRole: 'COLLECTEUR'}, {role: 'DECLARANT', declarantRole: 'PRELEVEUR'}]) {
    const Component = loadComponent('header', {user}).default
    const html = renderToStaticMarkup(React.createElement(Component))
    t.false(html.includes('href="/campagnes"'))
    t.false(html.includes('href="/mes-index"'))
    t.false(html.includes('href="/mes-besoins"'))
  }
})

test('Mes déclarations reste actif pendant la réponse à une demande existante', t => {
  for (const pathname of ['/mes-declarations', '/mes-declarations/new', '/mes-index/campaign', '/mes-besoins/campaign']) {
    const Component = loadComponent('header', {user: {role: 'DECLARANT', declarantRole: 'PRELEVEUR'}, pathname}).default
    const html = renderToStaticMarkup(React.createElement(Component))
    t.regex(html, /href="\/mes-declarations"[^>]*aria-current="page"/)
  }
})

test('le tableau de bord ne propose ni campagne ni widget de demandes, quel que soit le rôle', t => {
  const Component = loadComponent('dashboard/dashboard-page').default
  const render = user => renderToStaticMarkup(React.createElement(Component, {user, initialDashboard: {}}))
  for (const user of [{role: 'ADMIN'}, {role: 'INSTRUCTOR'}, {role: 'DECLARANT', declarantRole: 'COLLECTEUR'}, {role: 'DECLARANT', declarantRole: 'PRELEVEUR'}]) {
    const html = render(user)
    t.false(html.includes('Organiser ou suivre une collecte'))
    t.false(html.includes('href="/campagnes"'))
    t.false(html.includes('href="/campagnes/nouvelle"'))
    t.false(html.includes('href="/mes-index"'))
    t.false(html.includes('href="/mes-besoins"'))
    t.false(html.includes('Mes index et mes besoins en eau'))
  }
})

test('la liste intégrée dans l’administration ne duplique ni le titre principal ni le retour au tableau de bord', t => {
  const html = renderList({embedded: true, data: {items: [], permissions: {canCreate: true}}})
  t.false(html.includes('<h1'))
  t.false(html.includes('href="/tableau-de-bord"'))
  t.true(html.includes('href="/campagnes/nouvelle"'))
})

test('la liste vide explique la préparation et l’ouverture sans ajouter de phrase technique sous la création', t => {
  const html = renderList({data: {items: [], permissions: {canCreate: true}}})
  t.true(html.includes('Créer une campagne de collecte'))
  t.false(html.includes('La création enregistre un brouillon'))
  t.true(html.includes('saisir leurs relevés et leurs besoins.'))
  t.false(html.includes('vérifié les points et leurs compteurs'))
  t.true(html.includes('Ouvrez la saisie.'))
})

test('une liste en lecture seule ou en erreur ne propose aucune création', t => {
  for (const props of [{data: {items: [], permissions: {canCreate: false}}}, {data: {items: [], permissions: {canCreate: true}}, error: 'Indisponible'}, {kind: 'INDEX', data: {items: [], permissions: {canCreate: true}}}]) {
    t.false(renderList(props).includes('href="/campagnes/nouvelle"'))
  }
})

test('le lien de consultation ne se confond pas avec l’ouverture de la saisie', t => {
  const html = renderList({
    data: {
      items: [{
        campaign: {
          id: 'draft', name: 'Collecte à préparer', year: 2026, status: 'DRAFT'
        }, permissions: {canManage: true}
      }, {
        campaign: {
          id: 'open', name: 'Collecte en cours', year: 2026, status: 'OPEN'
        }
      }]
    }
  })
  t.true(html.includes('Préparer la campagne'))
  t.true(html.includes('Consulter le suivi'))
  t.true(html.includes('Campagne ouverte'))
  t.false(html.includes('Ouvrir la campagne'))
})

test('les pages de réponse ne montrent pas les campagnes encore en préparation', t => {
  const html = renderList({
    kind: 'INDEX', data: {
      items: [{
        campaign: {
          id: 'draft', name: 'Brouillon caché', year: 2026, status: 'DRAFT'
        }
      }, {
        campaign: {
          id: 'closed', name: 'Collecte terminée', year: 2026, status: 'CLOSED'
        }
      }]
    }
  })
  t.false(html.includes('Brouillon caché'))
  t.true(html.includes('Consulter mes réponses'))
})

test('un compte non habilité reçoit une explication et des liens de réponse, sans options de création', async t => {
  let optionsRequested = false
  const {CampaignCreatePage: renderCreatePage} = loadComponent('campaigns/campaign-pages', {
    actions: {
      listCampaignsAction: async () => ({success: true, data: {permissions: {canCreate: false}}}),
      async getCampaignOptionsAction() {
        optionsRequested = true
      }
    }
  })
  const html = renderToStaticMarkup(await renderCreatePage())
  t.false(optionsRequested)
  t.true(html.includes('Votre compte ne permet pas de créer une campagne.'))
  t.true(html.includes('href="/mes-declarations#demandes"'))
  t.false(html.includes('href="/mes-index"'))
  t.false(html.includes('href="/mes-besoins"'))
})
