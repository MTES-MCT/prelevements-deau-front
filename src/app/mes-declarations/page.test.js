import React from 'react'

import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {runInNewContext} from 'node:vm'

import test from 'ava'
import {transformSync} from 'next/dist/build/swc/index.js'
import {renderToStaticMarkup} from 'react-dom/server'

const require = createRequire(import.meta.url)
const successfulFeed = {success: true, data: {success: true, data: [{id: 'declaration'}], meta: {total: 1, canCreateDeclaration: true}}}

function compile(filename, componentRequire) {
  const {code} = transformSync(readFileSync(filename, 'utf8'), {filename: filename.pathname, jsc: {parser: {syntax: 'ecmascript', jsx: true}, transform: {react: {runtime: 'automatic'}}, target: 'es2022'}, module: {type: 'commonjs'}})
  const compiledModule = {exports: {}}
  runInNewContext('(function(require, module, exports) {' + code + '\n})', {})(componentRequire, compiledModule, compiledModule.exports)
  return compiledModule.exports
}

function harness({feed = successfulFeed, pending = false} = {}) {
  const calls = []
  const neverResolved = new Promise(() => {})
  const componentRequire = specifier => {
    if (specifier === '@/components/campaigns/campaign-requests-section.js') {
      return {
        __esModule: true, default() {
          if (pending) {
            throw neverResolved
          }

          return React.createElement('section', {id: 'demandes'}, 'Vos demandes')
        }
      }
    }

    if (specifier === '@/components/declarations/my-declarations-list.js') {
      return {__esModule: true, default: () => React.createElement('div', null, 'Liste des déclarations existantes')}
    }

    if (specifier === '@/server/actions/declarations.js') {
      return {
        async getMyDeclarationFeedAction(options) {
          calls.push(options)
          return feed
        }
      }
    }

    if (specifier === '@codegouvfr/react-dsfr/Button') {
      return {Button: ({children, linkProps}) => React.createElement('a', linkProps, children)}
    }

    if (specifier === '@codegouvfr/react-dsfr/Alert') {
      return {Alert: ({title, description}) => React.createElement('div', {role: 'alert'}, title, description)}
    }

    if (specifier === '@/dsfr-bootstrap/index.js') {
      return {StartDsfrOnHydration: () => null}
    }

    return require(specifier)
  }

  return {calls, page: compile(new URL('page.js', import.meta.url), componentRequire).default}
}

test('Mes déclarations place une seule section demandes avant la création et le fil existants', async t => {
  const flow = harness()
  const html = renderToStaticMarkup(await flow.page())
  t.is((html.match(/id="demandes"/g) || []).length, 1)
  t.true(html.indexOf('id="demandes"') < html.indexOf('Nouvelle déclaration'))
  t.true(html.includes('Liste des déclarations existantes'))
  t.deepEqual(structuredClone(flow.calls), [{limit: 20}])
})

test('une demande encore en chargement ne masque ni ne bloque les déclarations existantes', async t => {
  const flow = harness({pending: true})
  const html = renderToStaticMarkup(await flow.page())
  t.true(html.includes('Liste des déclarations existantes'))
  t.true(html.includes('Nouvelle déclaration'))
  t.false(html.includes('Vos demandes'))
  t.false(html.includes('Chargement des demandes'))
})

test('les demandes restent une section indépendante si le chargement du fil échoue', async t => {
  const flow = harness({feed: {success: false}})
  const html = renderToStaticMarkup(await flow.page())
  t.true(html.includes('Vos demandes'))
  t.true(html.includes('Déclarations indisponibles'))
  t.true(html.includes('Réessayer'))
})

test('les anciennes pages de liste redirigent vers la même section sans nouvelle requête', t => {
  for (const path of ['mes-index', 'mes-besoins']) {
    const redirectTarget = []
    const page = compile(new URL(`../${path}/page.js`, import.meta.url), specifier => {
      if (specifier === 'next/navigation') {
        return {redirect: location => redirectTarget.push(location)}
      }

      throw new Error(`Import inattendu : ${specifier}`)
    }).default
    page()
    t.deepEqual(redirectTarget, ['/mes-declarations#demandes'])
    const detail = readFileSync(new URL(`../${path}/[id]/page.js`, import.meta.url), 'utf8')
    t.true(detail.includes('CampaignDetailPage'))
    t.false(detail.includes('redirect('))
  }
})

test('le tableau de bord ne charge pas les demandes', t => {
  const source = readFileSync(new URL('../../components/dashboard/dashboard-page.js', import.meta.url), 'utf8')
  t.notRegex(source, /CampaignResponseCard|CampaignRequestsSection|listCampaignsAction|getCampaignContextAction/)
})
