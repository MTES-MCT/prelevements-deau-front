import React from 'react'

import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {runInNewContext} from 'node:vm'

import test from 'ava'
import {transformSync} from 'next/dist/build/swc/index.js'
import {renderToStaticMarkup} from 'react-dom/server'

import * as campaignCalendar from '../../lib/campaign-calendar.js'
import * as draftQueue from '../../lib/campaign-draft.js'
import * as meterEventValidation from '../../lib/campaign-meter-event-validation.js'
import * as responseMapHelpers from '../../lib/campaign-response-map.js'
import * as responseReadingHelpers from '../../lib/campaign-response-readings.js'
import * as responseRecoveryHelpers from '../../lib/campaign-response-recovery.js'
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
    if (specifier === '@/contexts/auth-context.js') {
      return {useAuth: () => ({user: {id: 'fixture-viewer'}, isLoading: false})}
    }

    if (specifier === '@/lib/campaign-response-recovery.js') {
      return responseRecoveryHelpers
    }

    if (specifier.endsWith('.module.css')) {
      return {}
    }

    if (specifier === '@/lib/collection-campaigns.js') {
      return campaignHelpers
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

    if (specifier === '@/lib/campaign-draft.js') {
      return draftQueue
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
  preleveurUserId: 'preleveur', permissions: {canRead: true, canEdit, canSubmit: canEdit}, editableTargetIds,
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
  for (const date of ['1 novembre 2025', '1 juin 2026', '1 novembre 2026']) {
    t.true(html.includes(`Index au ${date} (m³)`))
  }

  t.notRegex(html, /Aucun compteur configuré|Contactez le gestionnaire|Date attendue|serveur|sources|Europe\/Paris/)
  t.true(html.includes('Déclarer un changement de compteur'))
  t.notRegex(html, /Aucun remplacement ni remise à zéro|J’ai indiqué tous les remplacements|Hors changements déclarés/)
})

test('le formulaire déclarant conserve la saisie des changements sur les points avec compteur, sans droit de gestion', t => {
  const initialContext = context()
  Object.assign(initialContext.permissions, {canManage: false, canRemind: false, canExport: false})
  initialContext.targets[0].meters = [{compteurId: 'meter-a', compteur: {serialNumber: 'Compteur A'}}]
  initialContext.targets.push({id: 'b', pointPrelevement: {name: 'Point B'}, meters: [{compteurId: 'meter-b', compteur: {serialNumber: 'Compteur B'}}]})
  const html = render(initialContext)
  t.is((html.match(/Déclarer un changement de compteur/g) || []).length, 1)
  t.regex(html, /Changements de compteur · Point A/)
  t.notRegex(html, /Changements de compteur · Point B|conservez votre brouillon|sans remplacement ni remise à zéro/)
})

for (const type of ['REPLACEMENT', 'RESET']) {
  test(`le formulaire déclarant conserve le ${type} en lecture seule sans action de gestion`, t => {
    const initialContext = context({canEdit: false, editableTargetIds: []})
    initialContext.targets[0].meters = [{compteurId: 'meter-a', compteur: {serialNumber: 'Compteur A'}}, {compteurId: 'meter-new', compteur: {serialNumber: 'Compteur B'}}]
    initialContext.responses.INDEX.draft.meterEvents = [{
      targetId: 'a', type, at: '2026-06-01', previousCompteurId: 'meter-a', nextCompteurId: type === 'RESET' ? 'meter-a' : 'meter-new',
      previousIndex: '42', nextIndex: '0', reason: 'Intervention déclarée par le préleveur'
    }]
    const html = render(initialContext)
    t.true(html.includes(type === 'RESET' ? 'Compteur remis à zéro' : 'Compteur remplacé'))
    t.true(html.includes('Intervention déclarée par le préleveur'))
    t.notRegex(html, /Déclarer un(?: autre)? changement de compteur|Retirer ce changement|conservez votre brouillon|sans remplacement ni remise à zéro/)
  })
}

test('les relevés saisis sans inventaire ne demandent plus de confirmation de continuité', t => {
  const initialContext = context({readings: [reading('a', '2025-11-01', '0'), reading('a', '2026-06-01', '12')]})
  const before = structuredClone(initialContext)
  const html = render(initialContext)
  t.notRegex(html, /Aucun remplacement ni remise à zéro|J’ai indiqué tous les remplacements|Hors changements déclarés|conservez votre brouillon/)
  t.notRegex(html, /type="checkbox"|Je confirme les informations|Tant que vous ne la transmettez pas/)
  t.regex(html, /<button[^>]*>Enregistrer le brouillon<\/button>.*<button[^>]*>Soumettre<\/button>/s)
  t.true(html.includes('Vous pourrez modifier votre réponse tant que la saisie est ouverte.'))
  t.true(html.includes('Déclarer un changement de compteur'))
  t.true(html.includes('value="0"'))
  t.true(html.includes('value="12"'))
  t.deepEqual(initialContext, before)
})

for (const type of ['RESET', 'REPLACEMENT']) {
  test(`un ${type} reste visible sans ajouter de confirmation de continuité`, t => {
    const initialContext = context({readings: [reading('a', '2025-11-01', '100')]})
    const event = {
      targetId: 'a', type, at: '2026-06-01', previousCompteurId: null,
      previousIndex: '150', nextIndex: '0', reason: 'Intervention',
      ...(type === 'RESET' ? {nextCompteurId: null} : {nextMeter: {serialNumber: 'Nouveau'}})
    }
    initialContext.responses.INDEX.draft.meterEvents = [event]
    const html = render(initialContext)
    t.notRegex(html, /type="checkbox"/)
    t.true(html.includes(type === 'RESET' ? 'Compteur remis à zéro' : 'Compteur remplacé'))
    t.notRegex(html, /Aucun remplacement ni remise à zéro|J’ai indiqué tous les remplacements|Hors changements déclarés/)
    initialContext.responses.INDEX.draft.meterEvents = []
    t.notRegex(render(initialContext), /type="checkbox"/)
  })
}

test('sans compteur, la lecture seule et le mandat partiel ne débloquent pas la saisie', t => {
  const html = render(context({canEdit: false, editableTargetIds: [], readings: [reading('a', '2025-11-01', '0')]}))
  t.regex(html, /<fieldset[^>]*disabled=""/)
  t.notRegex(html, /Aucun remplacement ni remise à zéro|J’ai indiqué tous les remplacements|Hors changements déclarés/)
  t.false(html.includes('Enregistrer le brouillon'))
  t.notRegex(html, /Soumettre|Vous pourrez modifier votre réponse tant que la saisie est ouverte\.|type="checkbox"/)
  t.notRegex(html, /Déclarer un(?: autre)? changement de compteur/)
  t.regex(render(context({editableTargetIds: []})), /<fieldset[^>]*disabled=""/)
})

test('modifier un relevé ne confirme aucun compteur implicitement et préserve les autres valeurs', t => {
  const first = reading('a', '2025-11-01', '0')
  const second = reading('b', '2025-11-01', '5')
  const known = reading('a', '2025-11-01', '6', {compteurId: 'known', meterConfirmed: true, sourceChunkValueId: 'source'})
  const draft = {readings: [first, second, known]}
  const updated = campaignHelpers.campaignUpdateReading(draft, {...first, value: '7'})
  t.deepEqual(updated.readings, [second, known, {...first, value: '7'}])
  t.false(Object.hasOwn(updated.readings.at(-1), 'meterConfirmed'))
  t.deepEqual(draft.readings, [first, second, known])
})

test('la grille sans case de continuité conserve les callbacks limités au mandat', t => {
  const initialContext = context({readings: [reading('a', '2025-11-01', '0'), reading('b', '2025-11-01', '5')]})
  initialContext.targets.push({id: 'b', pointPrelevement: {name: 'Point B'}, meters: []})
  const changes = []
  const {IndexRows: renderIndexRows} = loadComponent('campaign-response-entries')
  const tree = renderIndexRows({
    context: initialContext, draft: initialContext.responses.INDEX.draft, disabled: false, onChange: draft => changes.push(draft)
  })
  const nodes = value => Array.isArray(value) ? value.flatMap(item => nodes(item)) : (value && typeof value === 'object' ? [value, ...nodes(value.props?.children)] : [])
  t.false(nodes(tree).some(node => node.type === 'input' && node.props.type === 'checkbox'))
  const entries = nodes(tree).filter(node => node.props?.value?.readingDate && node.props?.onChange)
  const editable = entries.find(node => node.props.target.id === 'a')
  const restricted = entries.find(node => node.props.target.id === 'b')
  t.false(editable.props.disabled)
  t.true(restricted.props.disabled)
  editable.props.onChange({...editable.props.value, value: '12'})
  t.is(changes.length, 1)
  t.deepEqual(changes[0].readings.map(item => item.value), ['5', '12'])
  t.true(changes[0].readings.every(item => !Object.hasOwn(item, 'meterConfirmed')))
  restricted.props.onChange({...restricted.props.value, value: '99'})
  t.is(changes.length, 1)
})

test('ajouter un index ne modifie aucun ancien indicateur ou relevé historique', t => {
  const first = reading('a', '2025-11-01', '0', {meterConfirmed: false})
  const other = reading('b', '2025-11-01', '1', {meterConfirmed: true})
  const draft = {readings: [first, other]}
  const updated = campaignHelpers.campaignUpdateReading(draft, reading('a', '2026-06-01', '10'))
  t.deepEqual(updated.readings, [first, other, reading('a', '2026-06-01', '10')])
  t.deepEqual(draft.readings, [first, other])
  t.false(Object.hasOwn(updated.readings.at(-1), 'meterConfirmed'))
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

test('les calculs restent disponibles sans afficher leur détail ni leurs codes techniques dans la saisie', t => {
  t.is(campaignHelpers.campaignCalculationIssue({code: 'AMBIGUOUS_HISTORICAL_METER'}), 'Confirmez le compteur concerné par le relevé repris.')
  t.is(campaignHelpers.campaignCalculationIssue({code: 'UNKNOWN_INTERNAL_CODE'}), 'Ce relevé doit être vérifié avant de calculer le volume.')
  const initialContext = context()
  initialContext.calculation.totals = [{
    targetId: 'a', periodId: 'p1', status: 'CONFLICT', conflicts: [{code: 'AMBIGUOUS_HISTORICAL_METER'}]
  }]
  const html = render(initialContext)
  t.notRegex(html, /Voir les volumes calculés|Volumes prélevés|AMBIGUOUS_HISTORICAL_METER/)
  t.is(initialContext.calculation.totals[0].conflicts[0].code, 'AMBIGUOUS_HISTORICAL_METER')
})

test('la confirmation transmise sans compteur ne présente ni compteur inventé ni fuseau horaire', t => {
  const initialContext = context()
  delete initialContext.targets[0].meters
  const html = renderToStaticMarkup(React.createElement(loadComponent('campaign-history').CampaignReceipt, {
    context: initialContext, kind: 'INDEX', submission: {
      id: 'submission', version: 1, submittedAt: '2026-09-01T08:00:00Z', snapshot: {readings: [reading('a', '2026-06-01', '42')]}
    }
  }))
  t.true(html.includes('Point A, 1 juin 2026 : 42 m³'))
  t.notRegex(html, /Compteur|Europe\/Paris|référencé|brouillon ultérieur/)
})
