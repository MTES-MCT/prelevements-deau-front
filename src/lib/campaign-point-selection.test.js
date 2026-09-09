import test from 'ava'

import {
  campaignPointScopeKey, campaignPointSelectionState, campaignPointUsageLabel, campaignPreleveurLabel, campaignSelectedPointCount,
  loadCampaignPointResults, selectCampaignPointResults, toggleCampaignPoint
} from './campaign-point-selection.js'

const exploitation = (id, pointId = id, extra = {}) => ({
  id, pointPrelevementId: pointId, pointPrelevement: {id: pointId, name: `Point ${pointId}`, collectionMode: 'MANUAL'}, ...extra
})
const selected = (exploitationId, eligibilityConfirmed = true) => ({exploitationId, eligibilityConfirmed})
const known = rows => new Map(rows.map(row => [row.id, row]))

test('inclure un point confirme sa participation sans changer son mode de collecte', t => {
  const row = exploitation('a', 'p', {pointPrelevement: {id: 'p', collectionMode: null}})
  t.deepEqual(toggleCampaignPoint([], row, known([row]), true), [selected('a')])
  t.is(row.pointPrelevement.collectionMode, null)
  t.deepEqual(toggleCampaignPoint([selected('a', false)], row, known([row]), true), [selected('a')])
  t.deepEqual(toggleCampaignPoint([selected('a')], row, known([row]), false), [])
})

test('le libellé d’usage et le préleveur sont lisibles', t => {
  t.is(campaignPointUsageLabel({usage: {id: 'u', name: 'Irrigation'}}), 'Irrigation')
  t.is(campaignPointUsageLabel({}), 'Usage non renseigné')
  t.is(campaignPreleveurLabel({preleveur: {socialReason: 'EARL des prés'}}), 'EARL des prés')
  t.is(campaignPreleveurLabel({preleveur: {firstName: 'Sam', lastName: 'Martin'}}), 'Sam Martin')
})

test('la sélection groupée conserve et ne confirme pas les points hors filtre', t => {
  const rows = [exploitation('a'), exploitation('b'), exploitation('outside')]
  const result = selectCampaignPointResults([selected('outside', false), selected('a', false)], rows.slice(0, 2), known(rows))
  t.deepEqual(result.targets, [selected('outside', false), selected('a'), selected('b')])
  t.deepEqual(selectCampaignPointResults(result.targets, rows.slice(0, 2), known(rows), false).targets, [selected('outside', false)])
})

test('la sélection groupée ne choisit jamais entre plusieurs exploitations du même point', t => {
  const rows = [exploitation('a', 'shared'), exploitation('b', 'shared'), exploitation('c')]
  const result = selectCampaignPointResults([], rows, known(rows))
  t.deepEqual(result.targets, [selected('c')])
  t.is(result.skippedAmbiguous, 1)
  t.deepEqual(toggleCampaignPoint([], rows[1], known(rows), true), [selected('b')])
  t.deepEqual(toggleCampaignPoint([selected('b')], rows[0], known(rows), true), [selected('b')])
  t.is(campaignSelectedPointCount([selected('a'), selected('b'), selected('c')], known(rows)), 2)
})

test('une ambiguïté hors filtre ou une sélection hors filtre empêche un choix groupé implicite', t => {
  const rows = [exploitation('a', 'shared', {ambiguousPoint: true}), exploitation('b', 'shared'), exploitation('c')]
  t.deepEqual(selectCampaignPointResults([], [rows[0]], known(rows)).targets, [])
  const result = selectCampaignPointResults([selected('b')], [exploitation('a', 'shared'), rows[2]], known(rows))
  t.deepEqual(result.targets, [selected('b'), selected('c')])
  t.true(campaignPointSelectionState(rows[0], [selected('b')], known(rows)).duplicate)
  t.deepEqual(selectCampaignPointResults([selected('a', false)], [rows[0]], known(rows)).targets, [selected('a')])
})

test('aucune sélection individuelle ou groupée ne peut inclure un point externe', t => {
  const external = exploitation('external', 'p', {pointPrelevement: {id: 'p', collectionMode: 'EXTERNAL'}})
  const rows = [external, exploitation('a')]
  t.deepEqual(toggleCampaignPoint([], external, known(rows), true), [])
  t.deepEqual(toggleCampaignPoint([selected('external', false)], external, known(rows), true), [selected('external', false)])
  const result = selectCampaignPointResults([], rows, known(rows))
  t.deepEqual(result.targets, [selected('a')])
  t.is(result.skippedExternal, 1)
})

test('la limite de 5000 refuse la sélection entière au lieu de choisir les premiers arbitrairement', t => {
  const rows = Array.from({length: 5001}, (_, index) => exploitation(String(index)))
  const existing = rows.slice(0, 5000).map(row => selected(row.id))
  t.throws(() => selectCampaignPointResults([], rows, known(rows)), {message: /5 000/})
  t.throws(() => toggleCampaignPoint(existing, rows.at(-1), known(rows), true), {message: /5 000/})
  t.is(existing.length, 5000)
  t.is(selectCampaignPointResults([], rows.slice(0, 5000), known(rows)).targets.length, 5000)
})

test('tous les résultats parcourent les pages en conservant territoire, organisme, recherche et usage', async t => {
  const params = {
    zoneId: 'zone', ownerCollecteurUserId: 'owner', q: 'Dupont', usageId: 'irrigation'
  }
  const calls = []
  const rows = await loadCampaignPointResults({
    params, async fetchPage(input) {
      calls.push(input)
      return input.cursor ? {exploitations: [exploitation('b')], pagination: {total: 2, hasMore: false}}
        : {exploitations: [exploitation('a')], pagination: {total: 2, hasMore: true, nextCursor: 'cursor'}}
    }
  })
  t.deepEqual(rows.map(row => row.id), ['a', 'b'])
  t.deepEqual(calls, [{...params, limit: 500}, {...params, limit: 500, cursor: 'cursor'}])
})

test('la sélection groupée inclut aussi les points après les 500 premiers résultats', async t => {
  const firstPage = Array.from({length: 500}, (_, index) => exploitation(String(index)))
  const last = exploitation('last')
  const rows = await loadCampaignPointResults({
    params: {}, fetchPage: async ({cursor}) => cursor
      ? {exploitations: [last], pagination: {total: 501, hasMore: false}}
      : {exploitations: firstPage, pagination: {total: 501, hasMore: true, nextCursor: 'last-page'}}
  })
  const result = selectCampaignPointResults([], rows, new Map())
  t.is(result.targets.length, 501)
  t.deepEqual(result.targets.at(-1), selected('last'))
})

test('une réponse asynchrone périmée ne peut ni terminer la liste ni poursuivre sa pagination', async t => {
  let current = true
  let resolvePage
  let calls = 0
  const pending = loadCampaignPointResults({
    params: {}, isCurrent: () => current, fetchPage() {
      calls++
      return new Promise(resolve => {
        resolvePage = resolve
      })
    }
  })
  current = false
  resolvePage({exploitations: [exploitation('wrong-scope')], pagination: {total: 2, hasMore: true, nextCursor: 'next'}})
  t.is(await pending, null)
  t.is(calls, 1)
  t.not(campaignPointScopeKey({usageId: 'old'}), campaignPointScopeKey({usageId: 'new'}))
  t.not(campaignPointScopeKey({q: 'old'}), campaignPointScopeKey({q: 'new'}))
})

test('une pagination incohérente échoue sans renvoyer une sélection partielle', async t => {
  await t.throwsAsync(loadCampaignPointResults({params: {}, fetchPage: async () => ({exploitations: [exploitation('a')], pagination: {total: 3, hasMore: false}})}), {message: /changé/})
  await t.throwsAsync(loadCampaignPointResults({params: {}, fetchPage: async () => ({exploitations: [exploitation('a')], pagination: {total: 3, hasMore: true, nextCursor: 'same'}})}), {message: /charger tous/})
  await t.throwsAsync(loadCampaignPointResults({
    params: {}, fetchPage: async ({cursor}) => cursor
      ? {exploitations: [exploitation('b')], pagination: {total: 3, hasMore: false}}
      : {exploitations: [exploitation('a')], pagination: {total: 2, hasMore: true, nextCursor: 'next'}}
  }), {message: /changé/})
})
