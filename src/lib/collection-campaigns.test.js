import test from 'ava'

import {
  campaignDeadlineLabel, campaignDraftErrors, campaignDraftForSave, campaignEditableTargets, campaignExclusiveEnd, campaignInclusiveEnd, campaignInitialDraft, campaignInstant, campaignPointChangeMailto, campaignReferenceReading, campaignWallTime, decimalInput, getCampaignCapabilities, isNonNegativeDecimal, meterAppliesOnDate, readingKey, replaceCampaignRow, unwrapCampaignResult
} from './collection-campaigns.js'

test('les nombres français conservent zéro et une précision décimale sans conversion flottante', t => {
  t.is(decimalInput('1 234,0001'), '1234.0001')
  t.true(isNonNegativeDecimal('0'))
  t.true(isNonNegativeDecimal('0,0001'))
  for (const value of ['', null, '1e3', '-1', '2.00001', '1,2,3', '12345678901234567']) {
    t.false(isNonNegativeDecimal(value))
  }
})

test('les périodes métier exclusives sont présentées avec leur dernier jour inclus, sans décalage local', t => {
  t.is(campaignInclusiveEnd('2026-06-01'), '2026-05-31')
  t.is(campaignExclusiveEnd('2026-05-31'), '2026-06-01')
  t.is(campaignInclusiveEnd('2028-03-01'), '2028-02-29')
  t.is(campaignExclusiveEnd(''), '')
})

test('les horaires de campagne sont indépendants du fuseau du serveur et de l’appareil', t => {
  t.is(campaignInstant('2026-07-01T09:30', 'Europe/Paris'), '2026-07-01T07:30:00.000Z')
  t.is(campaignInstant('2026-01-01T09:30', 'Europe/Paris'), '2026-01-01T08:30:00.000Z')
  t.is(campaignInstant('2026-07-01T09:30', 'Indian/Reunion'), '2026-07-01T05:30:00.000Z')
  t.is(campaignWallTime('2026-07-01T07:30:00Z', 'Europe/Paris'), '2026-07-01T09:30')
  t.throws(() => campaignInstant('2026-03-29T02:30', 'Europe/Paris'))
  t.throws(() => campaignInstant('2026-10-25T02:30', 'Europe/Paris'))
})

test('la date limite affiche le dernier jour inclus, sans confusion avec le minuit du lendemain', t => {
  t.is(campaignDeadlineLabel('2026-11-30T23:00:00Z'), '30 novembre 2026')
  t.is(campaignDeadlineLabel('2026-09-30T22:00:00Z'), '30 septembre 2026')
  t.is(campaignDeadlineLabel('2026-09-30T20:00:00Z', 'Indian/Reunion'), '30 septembre 2026')
  t.is(campaignDeadlineLabel('2026-09-30T15:00:00Z'), '30 septembre 2026 à 17:00')
  t.is(campaignDeadlineLabel(null), 'Aucune date limite définie')
})

test('un accès en lecture ne débloque aucune mutation, même avec un brouillon', t => {
  const caps = getCampaignCapabilities({campaign: {status: 'OPEN'}, permissions: {canRead: true, canExport: true}, responses: {INDEX: {status: 'DRAFT'}}}, 'INDEX')
  t.true(caps.canRead)
  t.true(caps.canExport)
  t.false(caps.canEdit)
  t.false(caps.canSubmit)
  t.false(caps.canManage)
  t.false(caps.canReopen)
})

test('les droits du volet priment, y compris correction transmise et réouverture après clôture', t => {
  const context = {campaign: {status: 'CLOSED'}, permissions: {canEdit: true, canSubmit: true}, responses: {INDEX: {status: 'SUBMITTED', permissions: {canEdit: false, canSubmit: false, canReopen: true}}, NEEDS: {permissions: {canEdit: true, canSubmit: true, canReopen: false}}}}
  t.false(getCampaignCapabilities(context, 'INDEX').canEdit)
  t.true(getCampaignCapabilities(context, 'INDEX').canReopen)
  t.true(getCampaignCapabilities(context, 'NEEDS').canEdit)
})

test('un mandataire partiel peut saisir sans obtenir un droit de transmission', t => {
  const context = {permissions: {canEdit: true, canSubmit: false}, editableTargetIds: ['a'], targets: [{id: 'a'}, {id: 'b'}]}
  t.true(getCampaignCapabilities(context, 'INDEX').canEdit)
  t.false(getCampaignCapabilities(context, 'INDEX').canSubmit)
  t.deepEqual(campaignEditableTargets(context, 'INDEX'), ['a'])
  const source = {comment: 'Commentaire partagé non modifiable', readings: [{targetId: 'a', value: '10'}, {targetId: 'b', value: '90'}], meterEvents: [{targetId: 'b'}]}
  t.deepEqual(campaignDraftForSave(context, 'INDEX', source), {readings: [{targetId: 'a', value: '10'}], meterEvents: []})
  t.is(source.readings.length, 2)
})

test('une permission de saisie sans liste de points éditables échoue fermée', t => {
  t.deepEqual(campaignDraftForSave({permissions: {canEdit: true}, targets: [{id: 'a'}]}, 'INDEX', {readings: [{targetId: 'a'}], comment: 'non autorisé'}), {readings: []})
})

test('les références historiques ne renvoient que les champs autorisés du contrat', t => {
  const source = {
    targetId: 'a', compteurId: null, readingDate: '2026-06-01T00:00:00Z', value: '0', sourceChunkValueId: 'value-id', sourceValueUpdatedAt: '2026-01-01T00:00:00Z', requiresMeterConfirmation: true, secret: 'not forwarded', chunk: {unknown: 'read only'}
  }
  t.deepEqual(campaignReferenceReading(source, 'confirmed-meter'), {
    targetId: 'a', compteurId: 'confirmed-meter', readingDate: '2026-06-01', value: '0', sourceChunkValueId: 'value-id', sourceValueUpdatedAt: '2026-01-01T00:00:00Z', meterConfirmed: true
  })
})

test('le préremplissage ne tranche jamais entre plusieurs sources ni un compteur inconnu', t => {
  const row = {
    targetId: 'a', compteurId: 'meter', readingDate: '2026-06-01', value: '0', sourceChunkValueId: 'v1', sourceValueUpdatedAt: '2026-01-01T00:00:00Z'
  }
  t.is(campaignInitialDraft({existingReadings: [row]}, 'INDEX').readings.length, 1)
  t.deepEqual(campaignInitialDraft({existingReadings: [row, {...row, sourceChunkValueId: 'v2'}]}, 'INDEX').readings, [])
  t.deepEqual(campaignInitialDraft({existingReadings: [{...row, compteurId: null, requiresMeterConfirmation: true}]}, 'INDEX').readings, [])
})

test('un brouillon enregistré n’est pas remplacé par des sources plus récentes', t => {
  const stored = {readings: [{targetId: 'a', value: '42'}], meterEvents: []}
  const initial = campaignInitialDraft({responses: {INDEX: {id: 'r', draft: stored}}, existingReadings: [{value: '99'}]}, 'INDEX')
  t.deepEqual(initial, {comment: '', ...stored})
  initial.readings[0].value = '43'
  t.is(stored.readings[0].value, '42')
})

test('les compteurs restent distincts pour un même point et une date', t => {
  const first = {
    targetId: 'a', compteurId: 'm1', readingDate: '2026-06-01', value: '10'
  }
  const second = {...first, compteurId: 'm2', value: '20'}
  t.deepEqual(replaceCampaignRow([first, second], {...first, value: '11'}, readingKey), [second, {...first, value: '11'}])
  t.true(meterAppliesOnDate({startDate: '2026-01-01', endDate: '2026-06-01'}, '2026-06-01'))
  t.false(meterAppliesOnDate({endDate: '2026-06-01'}, '2026-06-02'))
})

test('une absence de relevé reste distincte de zéro et un événement invalide est détecté', t => {
  t.deepEqual(campaignDraftErrors({readings: [{value: null, missingReason: 'Accès impossible'}, {value: '0'}]}, 'INDEX'), [])
  t.true(campaignDraftErrors({meterEvents: [{previousIndex: '-1', nextIndex: '0', reason: ''}]}, 'INDEX').length > 0)
})

test('un besoin peut être enregistré avec un volume seul, sans débit ni zéro ajouté', t => {
  const context = {editableTargetIds: ['a'], targets: [{id: 'a'}]}
  const draft = {comment: '', needs: [{targetId: 'a', periodId: 'period', requestedVolume: '1234.0001'}]}
  t.deepEqual(campaignDraftErrors(draft, 'NEEDS'), [])
  t.deepEqual(campaignDraftForSave(context, 'NEEDS', draft), draft)
  t.false(Object.hasOwn(campaignDraftForSave(context, 'NEEDS', draft).needs[0], 'requestedFlow'))
  t.deepEqual(campaignDraftErrors({needs: [{requestedVolume: '0'}, {requestedVolume: ''}, {requestedVolume: null}]}, 'NEEDS'), [])
  for (const requestedVolume of ['-1', '1e3', '1.00001']) {
    t.deepEqual(campaignDraftErrors({needs: [{requestedVolume}]}, 'NEEDS'), ['Les volumes demandés doivent être positifs ou nuls.'])
  }
})

test('les anciens débits restent intacts et seuls les besoins autorisés sont enregistrés', t => {
  const context = {
    editableTargetIds: ['a'], targets: [{id: 'a'}, {id: 'b'}], responses: {
      NEEDS: {
        id: 'response', draft: {
          comment: '', needs: [
            {
              targetId: 'a', periodId: 'period', requestedFlow: '12.5', requestedVolume: '400'
            },
            {
              targetId: 'b', periodId: 'period', requestedFlow: '9', requestedVolume: '90'
            }
          ]
        }
      }
    }
  }
  const draft = campaignInitialDraft(context, 'NEEDS')
  draft.needs[0].requestedVolume = '450'
  t.deepEqual(campaignDraftForSave(context, 'NEEDS', draft), {
    needs: [{
      targetId: 'a', periodId: 'period', requestedFlow: '12.5', requestedVolume: '450'
    }]
  })
  t.is(context.responses.NEEDS.draft.needs[0].requestedVolume, '400')
  t.is(context.responses.NEEDS.draft.needs[0].requestedFlow, '12.5')
})

test('les enveloppes API imbriquées et les conflits sont conservés', t => {
  t.deepEqual(unwrapCampaignResult({success: true, data: {success: true, data: {id: 'a'}}}), {id: 'a'})
  t.is(t.throws(() => unwrapCampaignResult({success: false, code: 409, error: 'Conflit'})).code, 409)
})

test('le signalement de point utilise uniquement le contact réel du collecteur et encode son contexte', t => {
  const campaign = {name: 'Collecte & besoins', year: 2026, ownerContact: {email: 'ougc@example.invalid'}}
  const href = campaignPointChangeMailto({campaign, target: {pointPrelevement: {name: 'Point & source'}}, message: 'Ajouter ce point ?'})
  t.true(href.startsWith('mailto:ougc%40example.invalid?'))
  t.true(href.includes(encodeURIComponent('Point & source')))
  t.is(campaignPointChangeMailto({campaign: {...campaign, ownerContact: null}, message: 'Demande'}), null)
  t.is(campaignPointChangeMailto({campaign: {...campaign, ownerContact: {email: 'a@example.invalid?bcc=b@example.invalid'}}, message: 'Demande'}), null)
  t.is(campaignPointChangeMailto({campaign, message: ''}), null)
})

test('des index de transition inconnus sont explicites et ne deviennent jamais zéro', t => {
  t.deepEqual(campaignDraftErrors({meterEvents: [{previousIndex: null, nextIndex: '0', reason: 'Ancien compteur illisible'}]}, 'INDEX'), [])
  t.true(campaignDraftErrors({meterEvents: [{previousIndex: null, nextIndex: null, reason: ''}]}, 'INDEX').length > 0)
})

test('un volet synthétique non commencé permet le préremplissage historique', t => {
  const row = {
    targetId: 'a', compteurId: 'meter', readingDate: '2026-06-01', value: '0', sourceChunkValueId: 'v1', sourceValueUpdatedAt: '2026-01-01T00:00:00Z'
  }
  t.is(campaignInitialDraft({responses: {INDEX: {version: 0, draft: {}}}, existingReadings: [row]}, 'INDEX').readings.length, 1)
})
