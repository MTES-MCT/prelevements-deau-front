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

function harness({feed = successfulFeed} = {}) {
  const calls = []
  const componentRequire = specifier => {
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

test('Mes déclarations conserve la création et le fil, sans demandes de campagne', async t => {
  const flow = harness()
  const html = renderToStaticMarkup(await flow.page())
  t.false(html.includes('id="demandes"'))
  t.true(html.includes('Nouvelle déclaration'))
  t.true(html.includes('Saisissez vos index, volumes prélevés ou volumes rejetés'))
  t.true(html.includes('Liste des déclarations existantes'))
  t.deepEqual(structuredClone(flow.calls), [{limit: 20}])
})

test('les déclarations existantes ne nécessitent aucun chargement de campagnes', async t => {
  const flow = harness()
  const html = renderToStaticMarkup(await flow.page())
  t.true(html.includes('Liste des déclarations existantes'))
  t.true(html.includes('Nouvelle déclaration'))
  t.false(html.includes('Vos demandes'))
  t.false(html.includes('Chargement des demandes'))
})

test('un échec de chargement du fil propose de réessayer', async t => {
  const flow = harness({feed: {success: false}})
  const html = renderToStaticMarkup(await flow.page())
  t.false(html.includes('Vos demandes'))
  t.true(html.includes('Déclarations indisponibles'))
  t.true(html.includes('Réessayer'))
})

test('le tableau de bord ne charge pas les demandes', t => {
  const source = readFileSync(new URL('../../components/dashboard/dashboard-page.js', import.meta.url), 'utf8')
  t.notRegex(source, /CampaignResponseCard|CampaignRequestsSection|listCampaignsAction|getCampaignContextAction/)
})
