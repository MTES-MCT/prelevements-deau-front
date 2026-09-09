import test from 'ava'

import {createCampaignDraftQueue} from './campaign-draft.js'

test('les sauvegardes sont sérialisées et gardent la dernière saisie locale', async t => {
  let release
  const first = new Promise(resolve => {
    release = resolve
  })
  const writes = []
  const queue = createCampaignDraftQueue({
    revision: 2,
    async save(value, revision) {
      writes.push({value, revision})
      if (writes.length === 1) {
        await first
      }

      return {revision: revision + 1}
    }
  })
  queue.change({index: '10'})
  const saving = queue.flush()
  await Promise.resolve()
  queue.change({index: '11'})
  queue.change({index: '12'})
  release()
  t.is(await saving, 4)
  t.deepEqual(writes, [{value: {index: '10'}, revision: 2}, {value: {index: '12'}, revision: 3}])
  t.false(queue.getState().dirty)
})

test('une transmission peut attendre la sauvegarde déjà en cours sans doubler les écritures', async t => {
  let release
  const pending = new Promise(resolve => {
    release = resolve
  })
  let calls = 0
  const queue = createCampaignDraftQueue({
    revision: 0, async save() {
      calls++
      await pending
      return {revision: 1}
    }
  })
  queue.change({comment: 'Test'})
  const saving = queue.flush()
  const transmitting = queue.flush()
  release()
  t.deepEqual(await Promise.all([saving, transmitting]), [1, 1])
  t.is(calls, 1)
})

test('un conflit conserve le brouillon et interdit toute relance aveugle', async t => {
  let calls = 0
  const conflict = Object.assign(new Error('Modifié ailleurs'), {code: 409})
  const queue = createCampaignDraftQueue({
    revision: 3, async save() {
      calls++
      throw conflict
    }
  })
  queue.change({index: '7'})
  await t.throwsAsync(queue.flush(), {is: conflict})
  queue.change({index: '8'})
  await t.throwsAsync(queue.retry(), {is: conflict})
  t.true(queue.getState().dirty)
  t.is(queue.getState().revision, 3)
  t.is(calls, 1)
})

test('une panne réseau est réessayable avec les mêmes données et la même révision', async t => {
  const writes = []
  const queue = createCampaignDraftQueue({
    revision: 1, async save(value, revision) {
      writes.push({value, revision})
      if (writes.length === 1) {
        throw new Error('Réseau indisponible')
      }

      return {revision: 2}
    }
  })
  queue.change({index: '0'})
  await t.throwsAsync(queue.flush())
  t.is(await queue.retry(), 2)
  t.deepEqual(writes[0], writes[1])
})

test('la révision après transmission sert de base à la correction suivante', async t => {
  const queue = createCampaignDraftQueue({
    revision: 2, async save(value, revision) {
      t.is(revision, 3)
      return {revision: 4}
    }
  })
  queue.setRevision(3)
  queue.change({index: '12'})
  t.throws(() => queue.setRevision(4))
  t.is(await queue.flush(), 4)
  t.throws(() => queue.setRevision(3))
})
