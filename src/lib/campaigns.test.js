import test from 'ava'

import {
  campaignData, campaignDate, campaignExploitationLabel, campaignState, campaignUsageOptions,
  emptyCampaignMeter, formatCampaignVolume, getCampaignField, initialCampaignAnswer, setCampaignField, validateCampaignAnswer
} from './campaigns.js'

test('un code comptage distingue deux exploitations sur le même point', t => {
  t.is(campaignExploitationLabel({point: {name: 'Puits'}, countingCode: '001'}), 'Puits — Code comptage : 001')
  t.not(campaignExploitationLabel({point: {name: 'Puits'}, countingCode: '001'}), campaignExploitationLabel({point: {name: 'Puits'}, countingCode: '002'}))
})

test('aucun compteur documentaire : formulaire vide, sans identifiant inventé', t => {
  const data = initialCampaignAnswer(null, [])
  t.is(data.meters.length, 1)
  t.is(data.meters[0].compteurId, null)
  t.is(data.meters[0].serialNumber, '')
  t.is(data.needs.season.volume, '')
})

test('les périodes incomplètes restent des brouillons éditables sans fausse valeur zéro', t => {
  const data = initialCampaignAnswer({meters: [{compteurId: 'meter', serialNumber: 'M001', offSeason: {indexStart: '0'}, season: {}}]}, [])
  t.is(data.meters[0].offSeason.indexStart, '0')
  t.is(data.meters[0].offSeason.indexEnd, '')
  t.is(data.meters[0].season.indexEnd, '')
  t.true(Object.keys(validateCampaignAnswer(data)).length > 0)
})

test('toutes les valeurs zéro sont valides ; les champs vides ne le sont pas', t => {
  const data = initialCampaignAnswer(null)
  data.meters = [{compteurId: null, serialNumber: 'M1', offSeason: {usageId: 'usage', indexStart: '0', indexEnd: 0, surface: '0', crops: 'aucune'}, season: {usageId: 'usage', indexEnd: 0, surface: 0, crops: 'aucune'}}]
  data.needs = {season: {flow: 0, volume: '0', surface: 0, usageId: 'usage', crops: 'aucune'}, offSeason: {flow: 0, volume: '0', surface: 0, usageId: 'usage', crops: 'aucune'}}
  t.deepEqual(validateCampaignAnswer(data), {})
  data.needs.season.volume = ''
  t.truthy(validateCampaignAnswer(data)['needs.season.volume'])
  data.needs.season.volume = '-1'
  t.truthy(validateCampaignAnswer(data)['needs.season.volume'])
})

test('l’édition d’un compteur ne change ni un autre compteur ni la réponse précédente', t => {
  const original = initialCampaignAnswer(null, [{id: 'first', serialNumber: 'M1'}, {id: 'second', serialNumber: 'M2'}])
  const next = setCampaignField(original, 'meters.1.offSeason.indexStart', '120')
  t.is(getCampaignField(next, 'meters.1.offSeason.indexStart'), '120')
  t.is(original.meters[1].offSeason.indexStart, '')
  t.is(next.meters[0].offSeason.indexStart, '')
  t.is(next.meters[1].compteurId, 'second')
})

test('les usages proposés sont les sous-usages et gardent leur parent', t => {
  const options = campaignUsageOptions([{id: 'root', code: '2', label: 'Irrigation', children: [{id: 'sub', code: '2A', label: 'Aspersion'}]}, {id: 'root2', code: '4', kind: 'USAGE'}])
  t.is(options.length, 1)
  t.is(options[0].id, 'sub')
  t.is(options[0].parent.id, 'root')
  t.is(campaignUsageOptions([{id: 's', kind: 'SUB_USAGE'}])[0].id, 's')
})

test('une campagne fermée explicitement n’est pas affichée ouverte', t => {
  t.is(campaignState({status: 'OPEN', closedAt: '2026-09-24'}), 'CLOSED')
  t.is(campaignState({status: 'DRAFT'}), 'DRAFT')
  t.is(campaignState({status: 'ARCHIVED', closedAt: '2026-09-24'}), 'ARCHIVED')
  t.is(campaignDate('2026-10-31T00:00:00Z'), '31/10/2026')
})

test('une erreur n’est jamais présentée comme une liste vide', t => {
  t.throws(() => campaignData({success: false, error: 'Indisponible'}), {message: 'Indisponible'})
  t.deepEqual(campaignData({success: true, data: {success: true, data: {items: []}}}), {items: []})
  t.is(emptyCampaignMeter({id: 'm', serialNumber: '123'}).compteurId, 'm')
})

test('volume zéro publié et volume non publié sont visiblement distincts', t => {
  t.is(formatCampaignVolume(0), '0 m³')
  t.is(formatCampaignVolume(null), 'En attente de publication')
  t.is(formatCampaignVolume(undefined), 'En attente de publication')
})
