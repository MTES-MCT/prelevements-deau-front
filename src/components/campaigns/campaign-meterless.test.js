import React from 'react'

import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {runInNewContext} from 'node:vm'

import test from 'ava'
import {transformSync} from 'next/dist/build/swc/index.js'
import {renderToStaticMarkup} from 'react-dom/server'

import * as draftQueue from '../../lib/campaign-draft.js'
import * as campaignHelpers from '../../lib/collection-campaigns.js'

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

const reading = (targetId, readingDate, value, extra = {}) => ({
  targetId, compteurId: null, readingDate, value, ...extra
})
const context = ({readings = [], canEdit = true, editableTargetIds = ['a']} = {}) => ({
  campaign: {
    id: 'campaign', name: 'Collecte annuelle', year: 2026, status: 'OPEN', indexDates: ['2025-11-01', '2026-06-01', '2026-11-01'], periods: [{
      id: 'p1', kind: 'INDEX', label: 'Première période', startDate: '2025-11-01', endDate: '2026-06-01'
    }]
  },
  preleveurUserId: 'preleveur', permissions: {canRead: true, canEdit, canSubmit: true}, editableTargetIds,
  targets: [{id: 'a', pointPrelevement: {name: 'Point A'}, meters: []}],
  responses: {
    INDEX: {
      id: 'response', version: 1, status: 'DRAFT', draft: {readings, meterEvents: []}
    }
  },
  existingReadings: [], calculation: {totals: []}
})

const render = initialContext => renderToStaticMarkup(React.createElement(loadComponent('campaign-response-form').default, {initialContext, kind: 'INDEX'}))

test('sans inventaire, tous les index sont directement accessibles par point et date', t => {
  const html = render(context())
  for (const date of ['01/11/2025', '01/06/2026', '01/11/2026']) {
    t.true(html.includes(`Index au ${date} (m³)`))
  }

  t.notRegex(html, /Aucun compteur configuré|Contactez le gestionnaire|Date attendue|serveur|sources|Europe\/Paris/)
  t.false(html.includes('Changement de compteur'))
  t.false(html.includes('Ces relevés concernent le même compteur'))
})

test('la confirmation de continuité apparaît après la saisie et n’est jamais précochée', t => {
  const html = render(context({readings: [reading('a', '2025-11-01', '0'), reading('a', '2026-06-01', '12')]}))
  t.true(html.includes('Ces relevés concernent le même compteur, sans remplacement ni remise à zéro.'))
  t.regex(html, /<input type="checkbox"\/>Ces relevés concernent/)
  t.regex(render(context({readings: [reading('a', '2025-11-01', '0', {meterConfirmed: true})]})), /<input type="checkbox" checked=""\/>Ces relevés concernent/)
})

test('sans compteur, la lecture seule et le mandat partiel ne débloquent pas la saisie', t => {
  const html = render(context({canEdit: false, editableTargetIds: [], readings: [reading('a', '2025-11-01', '0')]}))
  t.regex(html, /<fieldset[^>]*disabled=""/)
  t.regex(html, /<fieldset[^>]*disabled=""[^>]*><label[^>]*><input type="checkbox"\/>Ces relevés concernent/)
  t.false(html.includes('Enregistrer le brouillon'))
  t.regex(render(context({editableTargetIds: []})), /<fieldset[^>]*disabled=""/)
})

test('la confirmation est ciblée et ne change aucun compteur connu ni aucune valeur', t => {
  const first = reading('a', '2025-11-01', '0')
  const second = reading('b', '2025-11-01', '5')
  const known = reading('a', '2025-11-01', '6', {compteurId: 'known'})
  const draft = {readings: [first, second, known]}
  const confirmed = campaignHelpers.campaignConfirmPointMeter(draft, 'a', true)
  t.true(campaignHelpers.campaignPointMeterConfirmed(confirmed, 'a'))
  t.false(campaignHelpers.campaignPointMeterConfirmed(confirmed, 'b'))
  t.is(confirmed.readings[0].value, '0')
  t.is(confirmed.readings[0].compteurId, null)
  t.deepEqual(confirmed.readings.slice(1), [second, known])
  t.false(campaignHelpers.campaignPointMeterConfirmed(draft, 'a'))
})

test('un index modifié ou ajouté exige de confirmer à nouveau la continuité', t => {
  const first = reading('a', '2025-11-01', '0', {meterConfirmed: true})
  const other = reading('b', '2025-11-01', '1', {meterConfirmed: true})
  const draft = {readings: [first, other]}
  const updated = campaignHelpers.campaignUpdateReading(draft, reading('a', '2026-06-01', '10'))
  t.false(campaignHelpers.campaignPointMeterConfirmed(updated, 'a'))
  t.true(campaignHelpers.campaignPointMeterConfirmed(updated, 'b'))
  t.true(campaignHelpers.campaignPointMeterConfirmed(draft, 'a'))
  t.false(campaignHelpers.campaignPointMeterConfirmed({readings: [reading('a', '2026-06-01', null, {missingReason: 'Illisible'})]}, 'a'))
})

test('reprendre une source sans compteur ne déclare pas automatiquement sa continuité', t => {
  const source = reading('a', '2026-06-01T00:00:00Z', '42', {sourceChunkValueId: 'source', sourceValueUpdatedAt: '2026-06-02T00:00:00Z', requiresMeterConfirmation: true})
  const value = campaignHelpers.campaignReferenceReading(source, null)
  t.is(value.compteurId, null)
  t.is(value.sourceChunkValueId, 'source')
  t.not(value.meterConfirmed, true)
  t.deepEqual(campaignHelpers.campaignInitialDraft({existingReadings: [source]}, 'INDEX').readings, [])
  t.is(campaignHelpers.readingKey(source), campaignHelpers.readingKey(value))
})

test('les alertes de calcul ne montrent pas de codes techniques', t => {
  t.is(campaignHelpers.campaignCalculationIssue({code: 'METER_CONTINUITY_CONFIRMATION_REQUIRED'}), 'Confirmez que les relevés concernent le même compteur.')
  t.is(campaignHelpers.campaignCalculationIssue({code: 'UNKNOWN_INTERNAL_CODE'}), 'Ce relevé doit être vérifié avant de calculer le volume.')
  const initialContext = context()
  initialContext.calculation.totals = [{
    targetId: 'a', periodId: 'p1', status: 'CONFLICT', conflicts: [{code: 'METER_CONTINUITY_CONFIRMATION_REQUIRED'}]
  }]
  const html = render(initialContext)
  t.true(html.includes('Confirmez que les relevés concernent le même compteur.'))
  t.false(html.includes('METER_CONTINUITY_CONFIRMATION_REQUIRED'))
})

test('la confirmation transmise sans compteur ne présente ni compteur inventé ni fuseau horaire', t => {
  const initialContext = context()
  delete initialContext.targets[0].meters
  const html = renderToStaticMarkup(React.createElement(loadComponent('campaign-history').CampaignReceipt, {
    context: initialContext, kind: 'INDEX', submission: {
      id: 'submission', version: 1, submittedAt: '2026-09-01T08:00:00Z', snapshot: {readings: [reading('a', '2026-06-01', '42', {meterConfirmed: true})]}
    }
  }))
  t.true(html.includes('Point A, 01/06/2026 : 42 m³'))
  t.notRegex(html, /Compteur|Europe\/Paris|référencé|brouillon ultérieur/)
})
