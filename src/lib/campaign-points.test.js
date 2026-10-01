import test from 'ava'

import {campaignMapPoints, campaignPointIdentity, campaignResponseForPoint, campaignResponsePoint, filterCampaignPointResponses, loadCampaignMapResponses} from './campaign-points.js'

const response = (id, pointId = id, coordinates = [0.25, 44.65]) => ({id, point: {id: pointId, coordinates}})

test('le nom du point, sa commune et son code compteur restent distincts', t => {
  t.deepEqual(campaignPointIdentity({point: {usageName: 'Forage du moulin', name: 'Nom du référentiel', communeName: 'Éymet', locationDescription: 'Parcelle 12'}, countingCode: '001'}), {
    name: 'Forage du moulin', referenceName: 'Nom du référentiel', location: 'Éymet · Parcelle 12', countingCode: '001'
  })
  t.deepEqual(campaignPointIdentity({exploitation: {pointPrelevement: {name: 'Forage', communeName: 'Eymet', locationDescription: 'Eymet'}, countingCode: '002'}}), {
    name: 'Forage', referenceName: null, location: 'Eymet', countingCode: '002'
  })
  t.deepEqual(campaignPointIdentity({point: {id: 'internal-id'}}), {
    name: 'Point de prélèvement', referenceName: null, location: '', countingCode: null
  })
})

test('la recherche locale trouve nom, commune et comptage sans fusionner les réponses', t => {
  const first = {...response('first', 'shared'), countingCode: '001', status: 'DRAFT', point: {id: 'shared', usageName: 'Forage', name: 'Source A', communeName: 'Éymet'}}
  const second = {...first, id: 'second', countingCode: '002', status: 'SUBMITTED'}
  const rows = [first, second]
  for (const q of ['FORAGE', ' eymet ', 'source a']) t.deepEqual(filterCampaignPointResponses(rows, {q}), rows)
  t.deepEqual(filterCampaignPointResponses(rows, {q: '002'}), [second])
  t.deepEqual(filterCampaignPointResponses(rows, {q: 'eymet', status: 'DRAFT'}), [first])
  t.deepEqual(filterCampaignPointResponses(rows, {q: 'inconnu'}), [])
  t.deepEqual(filterCampaignPointResponses(rows), rows)
})

test('les fiches restent distinctes mais un point partagé ne produit qu’un marqueur', t => {
  const rows = [response('first', 'point'), response('second', 'point'), response('missing', 'missing', null)]
  t.is(campaignMapPoints(rows).length, 1)
  t.deepEqual(campaignMapPoints(rows)[0].coordinates, {type: 'Point', coordinates: [0.25, 44.65]})
  t.is(campaignResponseForPoint(rows, 'point', 'second').id, 'second')
  t.is(campaignResponseForPoint(rows, 'point', 'other').id, 'first')
  t.is(campaignResponseForPoint(rows, 'unknown', 'first'), null)
  t.is(rows.length, 3)
})

test('la carte accepte les coordonnées GeoJSON et ignore les positions absentes ou invalides', t => {
  t.deepEqual(campaignResponsePoint(response('point', 'point', {type: 'Point', coordinates: [0, 0]})).coordinates.coordinates, [0, 0])
  for (const coordinates of [null, [], [null, null], ['', ''], [181, 40], [0, 91], [NaN, 0]]) {
    t.is(campaignResponsePoint(response('point', 'point', coordinates)), null)
  }
})

test('toutes les pages autorisées sont chargées en résumé sans données de formulaire', async t => {
  const rows = Array.from({length: 403}, (_, index) => response(String(index)))
  const requests = []
  const result = await loadCampaignMapResponses({items: rows.slice(0, 25), total: rows.length, page: 1}, async options => {
    requests.push(options)
    return {items: rows.slice((options.page - 1) * options.pageSize, options.page * options.pageSize), total: rows.length}
  })
  t.deepEqual(result, rows)
  t.deepEqual(requests, [1, 2, 3].map(page => ({page, pageSize: 200, view: 'summary'})))
})

test('une première page complète ne déclenche aucun chargement supplémentaire', async t => {
  const rows = [response('first'), response('second')]
  t.deepEqual(await loadCampaignMapResponses({items: rows, total: 2}, () => t.fail('Chargement inutile')), rows)
})

test('un échec de pagination remonte au formulaire au lieu de prétendre charger tous les points', async t => {
  await t.throwsAsync(loadCampaignMapResponses({items: [], total: 50}, async () => { throw new Error('Erreur API') }), {message: 'Erreur API'})
})
