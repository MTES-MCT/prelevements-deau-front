import test from 'ava'

import {
  campaignRecoveryEpoch, campaignRecoveryKey, clearCampaignRecoveries, readCampaignRecovery, removeCampaignRecovery, trackCampaignDeparture, waitCampaignDeparture, writeCampaignRecovery
} from './campaign-response-recovery.js'

const key = suffix => campaignRecoveryKey({
  userId: suffix, campaignId: 'campaign', preleveurUserId: 'represented', kind: 'INDEX'
})
const storage = () => {
  const values = {}
  Object.defineProperties(values, {
    getItem: {value: key => values[key] ?? null},
    setItem: {
      value(key, value) {
        values[key] = value
      }
    },
    removeItem: {
      value(key) {
        delete values[key]
      }
    }
  })
  return values
}

test('la clé isole utilisateur, campagne, préleveur et volet sans identité anonyme', t => {
  const identity = {
    userId: 'user', campaignId: 'campaign', preleveurUserId: 'represented', kind: 'INDEX'
  }
  const keys = Object.keys(identity).map(field => campaignRecoveryKey({...identity, [field]: 'other'}))
  t.is(new Set([campaignRecoveryKey(identity), ...keys]).size, 5)
  t.is(campaignRecoveryKey({...identity, userId: null}), null)
  t.is(campaignRecoveryKey({...identity, userId: 'anonymous'}), null)
})

test('le journal clone les valeurs et ne modifie jamais le brouillon courant', t => {
  const journal = storage()
  const value = {revision: 4, draft: {readings: [{value: '42'}]}}
  writeCampaignRecovery(key('clone'), value, journal)
  value.draft.readings[0].value = '99'
  const recovered = readCampaignRecovery(key('clone'), journal)
  t.is(recovered.draft.readings[0].value, '42')
  recovered.draft.readings[0].value = '101'
  t.is(readCampaignRecovery(key('clone'), journal).draft.readings[0].value, '42')
  removeCampaignRecovery(key('clone'), journal)
  t.is(readCampaignRecovery(key('clone'), journal), null)
})

test('un quota dépassé conserve le repli mémoire sans bloquer la saisie', t => {
  const unavailable = {
    getItem() {
      throw new Error('SecurityError')
    },
    setItem() {
      throw new Error('QuotaExceededError')
    },
    removeItem() {
      throw new Error('SecurityError')
    }
  }
  const identity = key('quota')
  t.notThrows(() => writeCampaignRecovery(identity, {draft: {comment: 'À conserver'}}, unavailable))
  t.is(readCampaignRecovery(identity, unavailable).draft.comment, 'À conserver')
  t.notThrows(() => removeCampaignRecovery(identity, unavailable))
  t.is(readCampaignRecovery(identity, unavailable), null)
})

test('un journal corrompu ou expiré ne déclenche aucune reprise', t => {
  const journal = storage()
  journal.setItem(key('corrupted'), '{broken')
  journal.setItem(key('expired'), JSON.stringify({updatedAt: 0, draft: {comment: 'ancien'}}))
  t.is(readCampaignRecovery(key('corrupted'), journal), null)
  t.is(readCampaignRecovery(key('expired'), journal), null)
})

test.serial('la déconnexion vide uniquement les reprises campagnes et invalide les callbacks antérieurs', t => {
  const journal = storage()
  const epoch = campaignRecoveryEpoch()
  journal.setItem('other-feature', 'conserver')
  writeCampaignRecovery(key('logout'), {draft: {comment: 'privé'}}, journal)
  clearCampaignRecoveries(journal)
  t.is(campaignRecoveryEpoch(), epoch + 1)
  t.is(journal.getItem('other-feature'), 'conserver')
  t.is(readCampaignRecovery(key('logout'), journal), null)
  t.deepEqual(Object.keys(journal), ['other-feature'])
})

test('la reprise attend le départ en vol même si celui-ci échoue', async t => {
  let finish
  let resolved = false
  const departing = new Promise((resolve, reject) => {
    finish = () => reject(new Error('503'))
  })
  trackCampaignDeparture(key('departure'), departing)
  const waiting = (async () => {
    await waitCampaignDeparture(key('departure'))
    resolved = true
  })()
  await Promise.resolve()
  t.false(resolved)
  finish()
  await waiting
  t.true(resolved)
})
