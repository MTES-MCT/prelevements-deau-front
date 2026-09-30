import test from 'ava'

import {
  campaignData, campaignDate, campaignExploitationLabel, campaignParticipation, campaignRequiresIrrigationDetails, campaignResponseHref, campaignState, campaignUsageOptions,
  emptyCampaignMeter, formatCampaignVolume, getCampaignField, initialCampaignAnswer, isCampaignRequester, setCampaignField, singleCampaignResponseHref, validateCampaignAnswer, validateCampaignIndices
} from './campaigns.js'

test('un code comptage distingue deux exploitations sur le même point', t => {
  t.is(campaignExploitationLabel({point: {name: 'Puits'}, countingCode: '001'}), 'Puits — Code compteur Agence de l’eau : 001')
  t.not(campaignExploitationLabel({point: {name: 'Puits'}, countingCode: '001'}), campaignExploitationLabel({point: {name: 'Puits'}, countingCode: '002'}))
})

test('aucun compteur documentaire : formulaire vide, sans identifiant inventé', t => {
  const data = initialCampaignAnswer(null, [])
  t.is(data.meters.length, 1)
  t.is(data.meters[0].compteurId, null)
  t.is(data.meters[0].serialNumber, '')
  t.is(data.needs.season.volume, '')
  t.deepEqual(data.meters[0].offSeason.crops, [])
  t.deepEqual(data.meters[0].season.crops, [])
  t.deepEqual(data.needs.season.crops, [])
  t.deepEqual(data.needs.offSeason.crops, [])
})

test('la reprise normalise les cultures de toutes les périodes sans perdre les anciens textes', t => {
  const original = {
    meters: [{compteurId: 'meter', offSeason: {crops: 'Maïs, sorgho (rotation)'}, season: {crops: ['cereales', 'ble']}}],
    needs: {season: {crops: ['Luzerne', 'Luzerne']}, offSeason: {crops: 'aucune'}}
  }
  const data = initialCampaignAnswer(original)
  t.deepEqual(data.meters[0].offSeason.crops, ['Maïs, sorgho (rotation)'])
  t.deepEqual(data.meters[0].season.crops, ['Céréales', 'Blé'])
  t.deepEqual(data.needs.season.crops, ['Luzerne'])
  t.deepEqual(data.needs.offSeason.crops, ['Aucune'])
  data.meters[0].season.crops.push('Maïs grain')
  t.deepEqual(original.meters[0].season.crops, ['cereales', 'ble'])
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
  data.meters = [{compteurId: null, serialNumber: 'M1', offSeason: {usageId: 'usage', indexStart: '0', indexEnd: 0, surface: '0', crops: ['Aucune']}, season: {usageId: 'usage', indexEnd: 0, surface: 0, crops: ['Aucune']}}]
  data.needs = {season: {flow: 0, volume: '0', surface: 0, usageId: 'usage', crops: ['Céréales', 'Blé']}, offSeason: {flow: 0, volume: '0', surface: 0, usageId: 'usage', crops: ['Aucune']}}
  t.deepEqual(validateCampaignAnswer(data), {})
  for (const serialNumber of ['', undefined, null]) {
    const withoutSerial = structuredClone(data)
    withoutSerial.meters[0].serialNumber = serialNumber
    t.deepEqual(validateCampaignAnswer(withoutSerial), {})
    t.is(withoutSerial.meters[0].serialNumber, serialNumber)
  }
  data.needs.season.volume = ''
  t.truthy(validateCampaignAnswer(data)['needs.season.volume'])
  data.needs.season.volume = '-1'
  t.truthy(validateCampaignAnswer(data)['needs.season.volume'])
})

test('une sélection de cultures vide bloque l’envoi ; un texte historique reste valide', t => {
  const data = initialCampaignAnswer(null)
  for (const crops of [[], [' ', ''], null]) {
    data.needs.season.crops = crops
    t.truthy(validateCampaignAnswer(data)['needs.season.crops'])
  }
  data.needs.season.crops = 'Mélange local : maïs / sorgho'
  t.falsy(validateCampaignAnswer(data)['needs.season.crops'])
})

test('l’édition d’un compteur ne change ni un autre compteur ni la réponse précédente', t => {
  const original = initialCampaignAnswer(null, [{id: 'first', serialNumber: 'M1'}, {id: 'second', serialNumber: 'M2'}])
  const next = setCampaignField(original, 'meters.1.offSeason.indexStart', '120')
  t.is(getCampaignField(next, 'meters.1.offSeason.indexStart'), '120')
  t.is(original.meters[1].offSeason.indexStart, '')
  t.is(next.meters[0].offSeason.indexStart, '')
  t.is(next.meters[1].compteurId, 'second')
})

test('les usages et sous-usages sont proposés sans doublons et gardent leur hiérarchie', t => {
  const options = campaignUsageOptions([{id: 'root', code: '2', label: 'Irrigation', children: [{id: 'sub', code: '2A', label: 'Aspersion'}]}, {id: 'root2', code: '4', kind: 'USAGE'}])
  t.is(options.length, 3)
  t.is(options[0].id, 'root')
  t.is(options[1].id, 'sub')
  t.is(options[1].parent.id, 'root')
  t.is(campaignUsageOptions([{id: 's', kind: 'SUB_USAGE'}])[0].id, 's')
  t.is(campaignUsageOptions([...options, options[1]]).length, 3)
})

const replenishmentUsages = [
  {id: 'irrigation', code: '2', children: [{id: 'aspersion', code: '2A'}]},
  {id: 'replenishment', code: '12', children: [{id: 'filling', code: '12E'}]},
  {id: 'industry', code: '4'}
]

test('les sous-usages d’irrigation et de réalimentation restent accessibles', t => {
  const options = campaignUsageOptions({items: replenishmentUsages})
  t.deepEqual(options.map(usage => usage.id), ['irrigation', 'aspersion', 'replenishment', 'filling', 'industry'])
  t.is(options.find(usage => usage.id === 'filling').parent.code, '12')
  for (const id of ['replenishment', 'filling']) t.false(campaignRequiresIrrigationDetails(id, replenishmentUsages))
  for (const id of ['irrigation', 'aspersion', 'industry', 'unknown', '']) t.true(campaignRequiresIrrigationDetails(id, replenishmentUsages))
  t.true(campaignRequiresIrrigationDetails('filling'))
})

test('surface et cultures sont facultatives en réalimentation pour les quatre périodes uniquement', t => {
  const data = initialCampaignAnswer({meters: [{serialNumber: 'M1', offSeason: {indexStart: '10', indexEnd: '20', usageId: 'filling'}, season: {indexEnd: '30', usageId: 'replenishment'}}], needs: {season: {flow: '2', volume: '10', usageId: 'filling'}, offSeason: {flow: '2', volume: '20', usageId: 'replenishment'}}})
  const original = structuredClone(data)
  t.deepEqual(validateCampaignAnswer(data, replenishmentUsages), {})
  t.deepEqual(data, original)
  for (const path of ['meters.0.offSeason', 'meters.0.season', 'needs.season', 'needs.offSeason']) {
    const irrigation = setCampaignField(data, `${path}.usageId`, 'aspersion')
    t.deepEqual(Object.keys(validateCampaignAnswer(irrigation, replenishmentUsages)), [`${path}.surface`, `${path}.crops`])
  }
})

test('la réalimentation garde les valeurs agricoles existantes et refuse une surface invalide', t => {
  const data = initialCampaignAnswer({needs: {offSeason: {usageId: 'filling', surface: '4.5', crops: ['Blé']}}})
  const original = structuredClone(data)
  t.falsy(validateCampaignAnswer(data, replenishmentUsages)['needs.offSeason.surface'])
  t.falsy(validateCampaignAnswer(data, replenishmentUsages)['needs.offSeason.crops'])
  t.deepEqual(data, original)
  for (const surface of ['-1', '12.34567', '1e3']) {
    t.truthy(validateCampaignAnswer(setCampaignField(data, 'needs.offSeason.surface', surface), replenishmentUsages)['needs.offSeason.surface'])
  }
  t.truthy(validateCampaignAnswer(data, replenishmentUsages)['needs.offSeason.flow'])
  t.truthy(validateCampaignAnswer(data, replenishmentUsages)['needs.offSeason.volume'])
})

test('les propositions restent éditables sans transformer l’absence d’autorisation en réponse', t => {
  const source = {meters: [{serialNumber: 'M1', offSeason: {indexStart: '123'}}], needs: {season: {volume: '4500'}, offSeason: {}}}
  const data = initialCampaignAnswer(source)
  t.is(data.meters[0].offSeason.indexEnd, '')
  t.is(data.needs.offSeason.usageId, '')
  t.is(data.needs.offSeason.volume, '')
  t.is(setCampaignField(data, 'needs.season.volume', '4600').needs.season.volume, '4600')
  t.is(source.needs.season.volume, '4500')
})

test('un index proposé sans compteur rattaché conserve sa valeur et son absence d’identifiant', t => {
  const source = {meters: [{compteurId: null, serialNumber: null, offSeason: {indexStart: '144413'}, season: {}}]}
  const data = initialCampaignAnswer(source, [])
  t.is(data.meters.length, 1)
  t.is(data.meters[0].compteurId, null)
  t.is(data.meters[0].serialNumber, null)
  t.is(data.meters[0].offSeason.indexStart, '144413')
  t.is(data.meters[0].offSeason.indexEnd, '')
  t.is(data.meters[0].season.indexEnd, '')
  t.is(setCampaignField(data, 'meters.0.offSeason.indexStart', '144414').meters[0].offSeason.indexStart, '144414')
  t.is(source.meters[0].offSeason.indexStart, '144413')
  const numberedSource = structuredClone(source)
  numberedSource.meters[0].serialNumber = 'SYNTH-SOURCE-001'
  const numberedData = initialCampaignAnswer(numberedSource, [])
  t.is(numberedData.meters[0].compteurId, null)
  t.is(numberedData.meters[0].serialNumber, 'SYNTH-SOURCE-001')
  t.is(numberedData.meters[0].offSeason.indexStart, '144413')
  const edited = setCampaignField(numberedData, 'meters.0.serialNumber', 'SYNTH-CORRECTED-001')
  t.is(edited.meters[0].compteurId, null)
  t.is(edited.meters[0].serialNumber, 'SYNTH-CORRECTED-001')
  t.is(numberedSource.meters[0].serialNumber, 'SYNTH-SOURCE-001')
})

test('les trois index doivent croître pour chaque compteur, sans comparaison entre compteurs', t => {
  const data = initialCampaignAnswer(null, [{id: 'first'}, {id: 'second'}])
  Object.assign(data.meters[0].offSeason, {indexStart: '20', indexEnd: '10'})
  data.meters[0].season.indexEnd = '5'
  Object.assign(data.meters[1].offSeason, {indexStart: '1', indexEnd: '1'})
  data.meters[1].season.indexEnd = '2'
  const errors = validateCampaignIndices(data)
  t.deepEqual(Object.keys(errors), ['meters.0.offSeason.indexEnd', 'meters.0.season.indexEnd'])
  t.true(errors['meters.0.offSeason.indexEnd'].includes('01/11/2025'))
  t.true(errors['meters.0.season.indexEnd'].includes('31/05/2026'))
  t.is(validateCampaignAnswer(data)['meters.0.season.indexEnd'], errors['meters.0.season.indexEnd'])
})

test('un index égal est valide et les gros index conservent leur précision', t => {
  const data = initialCampaignAnswer(null)
  Object.assign(data.meters[0].offSeason, {indexStart: '999999999999.9998', indexEnd: '999999999999.9999'})
  data.meters[0].season.indexEnd = '999999999999.9998'
  t.deepEqual(Object.keys(validateCampaignIndices(data)), ['meters.0.season.indexEnd'])
  data.meters[0].season.indexEnd = '999999999999.9999'
  t.deepEqual(validateCampaignIndices(data), {})
})

test('un brouillon incomplet compare seulement les index effectivement renseignés', t => {
  const data = initialCampaignAnswer(null)
  data.meters[0].offSeason.indexStart = '12'
  t.deepEqual(validateCampaignIndices(data), {})
  data.meters[0].season.indexEnd = '0'
  t.true(validateCampaignIndices(data)['meters.0.season.indexEnd'].includes('01/11/2025'))
  data.meters[0].offSeason.indexEnd = '0'
  t.deepEqual(Object.keys(validateCampaignIndices(data)), ['meters.0.offSeason.indexEnd'])
})

test('la validation refuse chiffres incomplets, notation exponentielle et précision excessive', t => {
  const data = initialCampaignAnswer(null)
  for (const value of [' ', '1e3', '-1', '1234567890123', '1.23456', '12,', '0x20']) {
    data.needs.season.volume = value
    t.truthy(validateCampaignAnswer(data)['needs.season.volume'], value)
  }
  for (const value of ['0', '123456789012', '1.2345', '1,2345']) {
    data.needs.season.volume = value
    t.falsy(validateCampaignAnswer(data)['needs.season.volume'], value)
  }
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

test('le reçu renvoie à la campagne selon le rôle et ne propose aucun lien aux instructeurs', t => {
  const source = {metadata: {collectionCampaignId: 'campaign', collectionResponseId: 'response'}}
  t.is(campaignResponseHref(source, 'ADMIN'), '/administration/campagnes/campaign/reponses/response')
  t.is(campaignResponseHref(source, 'DECLARANT'), '/campagnes/campaign/reponses/response')
  t.is(campaignResponseHref(source, 'INSTRUCTOR'), null)
  t.is(campaignResponseHref(source, null), null)
  t.is(campaignResponseHref({}, 'ADMIN'), null)
})

test('le demandeur voit une réponse à compléter, un brouillon ou un envoi sans terme exploitation', t => {
  const campaign = {status: 'OPEN', progress: {total: 1, submitted: 0, drafts: 0}}
  t.deepEqual(campaignParticipation(campaign), {complete: false, label: '0 point déclaré sur 1', action: 'Commencer ma déclaration'})
  t.deepEqual(campaignParticipation({...campaign, progress: {...campaign.progress, drafts: 1}}), {complete: false, label: '0 point déclaré sur 1', action: 'Reprendre ma déclaration'})
  t.deepEqual(campaignParticipation({...campaign, progress: {...campaign.progress, submitted: 1}}), {complete: true, label: '1 point déclaré sur 1', action: 'Consulter ma déclaration'})
})

test('plusieurs codes comptage conservent un suivi de toutes les réponses ; une collecte close se consulte', t => {
  t.deepEqual(campaignParticipation({status: 'OPEN', progress: {total: 3, submitted: 1, drafts: 1}}), {complete: false, label: '1 point déclaré sur 3', action: 'Reprendre ma déclaration'})
  t.deepEqual(campaignParticipation({status: 'OPEN', progress: {total: 3, submitted: 1, drafts: 0}}), {complete: false, label: '1 point déclaré sur 3', action: 'Reprendre ma déclaration'})
  t.deepEqual(campaignParticipation({status: 'OPEN', progress: {total: 3, submitted: 2, drafts: 0}}), {complete: false, label: '2 points déclarés sur 3', action: 'Reprendre ma déclaration'})
  t.is(campaignParticipation({status: 'CLOSED', progress: {total: 1, submitted: 0}}).action, 'Consulter ma déclaration')
  t.is(campaignParticipation({status: 'CLOSED', progress: {total: 1, submitted: 0}}).label, '0 point déclaré sur 1')
  t.is(campaignParticipation({status: 'ARCHIVED', progress: {total: 1, submitted: 0, drafts: 1}}).label, '0 point déclaré sur 1')
  t.is(campaignParticipation({status: 'CLOSED', progress: {total: 1, submitted: 1}}).label, '1 point déclaré sur 1')
  t.is(campaignParticipation({status: 'OPEN', permissions: {canRespond: false}, progress: {total: 1}}).action, 'Consulter ma déclaration')
})

test('le formulaire unique est direct uniquement pour le demandeur et un résultat complet', t => {
  const permissions = {canManage: false, canReadResults: false, canRespond: false}
  const responses = {items: [{id: 'response'}], total: 1}
  t.true(isCampaignRequester(permissions))
  t.false(isCampaignRequester({canManage: false, canReadResults: true}))
  t.false(isCampaignRequester())
  t.is(singleCampaignResponseHref('campaign', permissions, responses), '/campagnes/campaign/reponses/response')
  t.is(singleCampaignResponseHref('campaign', {canManage: true, canReadResults: true}, responses), null)
  t.is(singleCampaignResponseHref('campaign', {canManage: false, canReadResults: true}, responses), null)
  t.is(singleCampaignResponseHref('campaign', permissions, {...responses, total: 2}), null)
  t.is(singleCampaignResponseHref('campaign', permissions, {...responses, items: []}), null)
  t.is(singleCampaignResponseHref('campaign', permissions, undefined), null)
})
