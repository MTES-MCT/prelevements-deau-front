import test from 'ava'

import {
  createUserActivityTracker,
  getActivityActorId,
  getActivityMonth,
  observeUserActivity,
  sendUserActivity,
  shouldTrackUserActivity
} from './user-activity.js'

const success = (month = '2026-09') => ({success: true, data: {month}})
const settle = () => new Promise(resolve => setImmediate(resolve))

test('l’envoi isolé ne transmet ni identité ni date et refuse les redirections', async t => {
  const result = await sendUserActivity({
    fetchImpl: async (url, options) => {
      t.is(url, '/auth/activity')
      t.is(options.method, 'POST')
      t.is(options.credentials, 'same-origin')
      t.is(options.cache, 'no-store')
      t.is(options.redirect, 'error')
      t.deepEqual(options.headers, {'X-Activity-Signal': '1'})
      t.false(Object.hasOwn(options, 'body'))
      t.true(options.signal instanceof AbortSignal)
      return Response.json({month: '2026-09'})
    }
  })

  t.deepEqual(result, success())
})

test('une session expirée renvoie un échec sans navigation ni nouvelle connexion', async t => {
  const result = await sendUserActivity({
    fetchImpl: async () => Response.json({message: 'Activité non enregistrée.'}, {status: 401})
  })

  t.false(result.success)
})

function createFakeEventTarget() {
  const listeners = new Map()

  return {
    visibilityState: 'visible',
    addEventListener(type, listener) {
      if (!listeners.has(type)) {
        listeners.set(type, new Set())
      }

      listeners.get(type).add(listener)
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener)
    },
    emit(type, options = {}) {
      for (const listener of listeners.get(type) || []) {
        listener({type, isTrusted: true, ...options})
      }
    },
    listenerCount() {
      return [...listeners.values()].reduce((total, entries) => total + entries.size, 0)
    }
  }
}

function createHarness(send) {
  let currentDate = new Date('2026-09-14T09:00:00.000Z')
  let calls = 0
  const tracker = createUserActivityTracker({
    now: () => currentDate,
    sendActivity: (...args) => {
      calls += 1
      return send ? send(...args) : Promise.resolve(success(getActivityMonth(currentDate)))
    }
  })
  const documentTarget = createFakeEventTarget()
  const windowTarget = createFakeEventTarget()

  return {
    tracker,
    documentTarget,
    windowTarget,
    calls: () => calls,
    setDate: date => {
      currentDate = new Date(date)
    },
    observe: (actorId = 'user-1') => observeUserActivity({
      actorId,
      tracker,
      documentTarget,
      windowTarget
    })
  }
}

test('ne retient que les identités humaines authentifiées', t => {
  for (const role of ['ADMIN', 'INSTRUCTOR', 'DECLARANT']) {
    t.is(getActivityActorId({id: 'user-1', role}), 'user-1')
  }

  t.is(getActivityActorId(null), null)
  t.is(getActivityActorId({id: 'anonymous', role: 'DECLARANT'}), null)
  t.is(getActivityActorId({id: 'service-1', role: 'SERVICE_ACCOUNT'}), null)
  t.is(getActivityActorId({role: 'ADMIN'}), null)
})

test('identifie l’agent réel en impersonation, jamais le déclarant consulté', t => {
  const user = {
    id: 'target-1',
    role: 'DECLARANT',
    impersonation: {active: true, actor: {id: 'admin-1', role: 'ADMIN'}}
  }

  t.is(getActivityActorId(user), 'admin-1')
  t.is(getActivityActorId({...user, impersonation: {active: true}}), null)
  t.is(getActivityActorId({...user, impersonation: {active: false}}), 'target-1')
})

test('ignore les pages publiques et les visiteurs anonymes', t => {
  for (const pathname of ['/', '/stats', '/login', '/auth/callback', '/validation-email', '/activation-mot-de-passe']) {
    t.false(shouldTrackUserActivity({actorId: 'user-1', pathname}))
  }

  t.false(shouldTrackUserActivity({actorId: null, pathname: '/tableau-de-bord'}))
  t.false(shouldTrackUserActivity({actorId: 'user-1', pathname: null}))
  t.true(shouldTrackUserActivity({actorId: 'user-1', pathname: '/tableau-de-bord'}))
  t.true(shouldTrackUserActivity({actorId: 'user-1', pathname: '/declarations/declaration-1'}))
})

test('utilise le mois Europe/Paris, en été et en hiver', t => {
  t.is(getActivityMonth(new Date('2026-08-31T21:59:59.999Z')), '2026-08')
  t.is(getActivityMonth(new Date('2026-08-31T22:00:00.000Z')), '2026-09')
  t.is(getActivityMonth(new Date('2026-01-31T22:59:59.999Z')), '2026-01')
  t.is(getActivityMonth(new Date('2026-01-31T23:00:00.000Z')), '2026-02')
})

test('déduplique les envois simultanés puis les événements du même mois', async t => {
  let finish
  const harness = createHarness(() => new Promise(resolve => {
    finish = resolve
  }))

  const first = harness.tracker.report('user-1')
  const second = harness.tracker.report('user-1')
  t.is(first, second)
  await settle()
  t.is(harness.calls(), 1)

  finish(success())
  t.true(await first)
  t.true(await harness.tracker.report('user-1'))
  t.is(harness.calls(), 1)
})

test('n’envoie ni identité ni date et confirme uniquement le mois reçu du serveur', async t => {
  let parameters
  const harness = createHarness((...args) => {
    parameters = args
    return success('2026-09')
  })

  t.true(await harness.tracker.report('user-1'))
  t.deepEqual(parameters, [])
  await harness.tracker.report('user-1')
  t.is(harness.calls(), 1)
})

test('une horloge cliente en avance ne bloque pas la collecte du mois serveur suivant', async t => {
  let serverMonth = '2026-08'
  const harness = createHarness(() => success(serverMonth))
  t.false(await harness.tracker.report('user-1'))
  t.false(await harness.tracker.report('user-1'))
  t.is(harness.calls(), 1)

  serverMonth = '2026-09'
  harness.setDate('2026-09-14T09:01:00.000Z')
  t.true(await harness.tracker.report('user-1'))
  await harness.tracker.report('user-1')
  t.is(harness.calls(), 2)
})

test('un changement d’utilisateur dispose de sa propre déduplication', async t => {
  const harness = createHarness()
  await harness.tracker.report('user-1')
  await harness.tracker.report('user-2')
  await harness.tracker.report('user-1')
  t.is(harness.calls(), 2)
})

test('la navigation, le remontage et l’impersonation ne recompteront pas le même acteur', async t => {
  const harness = createHarness()
  const stopFirstPage = harness.observe('admin-1')
  stopFirstPage()
  const stopSecondPage = harness.observe('admin-1')
  await settle()

  const actorId = getActivityActorId({
    id: 'target-1',
    role: 'DECLARANT',
    impersonation: {active: true, actor: {id: 'admin-1', role: 'ADMIN'}}
  })
  await harness.tracker.report(actorId)
  t.is(harness.calls(), 1)
  stopSecondPage()
})

test('ne compte pas un affichage caché, puis compte le retour dans l’onglet', async t => {
  const harness = createHarness()
  harness.documentTarget.visibilityState = 'hidden'
  const stop = harness.observe()
  harness.windowTarget.emit('focus')
  harness.documentTarget.emit('pointerdown')
  await settle()
  t.is(harness.calls(), 0)

  harness.documentTarget.visibilityState = 'visible'
  harness.documentTarget.emit('visibilitychange')
  await settle()
  t.is(harness.calls(), 1)
  stop()
})

test('la navigation avec une session persistante compte le nouveau mois', async t => {
  const harness = createHarness()
  const stopFirstPage = harness.observe()
  await settle()
  stopFirstPage()
  harness.setDate('2026-09-30T22:00:00.000Z')
  const stopSecondPage = harness.observe()
  await settle()

  t.is(harness.calls(), 2)
  stopSecondPage()
})

test('un onglet laissé ouvert ne crée aucune activité automatique au changement de mois', async t => {
  const harness = createHarness()
  const stop = harness.observe()
  await settle()
  t.is(harness.calls(), 1)

  harness.setDate('2026-09-30T22:00:00.000Z')
  await settle()
  t.is(harness.calls(), 1)

  harness.documentTarget.emit('pointerdown', {isTrusted: false})
  await settle()
  t.is(harness.calls(), 1)

  harness.documentTarget.emit('pointerdown')
  harness.documentTarget.emit('keydown')
  harness.documentTarget.emit('wheel')
  await settle()
  t.is(harness.calls(), 2)
  stop()
})

for (const eventName of ['keydown', 'wheel']) {
  test(`la première interaction ${eventName} d’un nouveau mois suffit`, async t => {
    const harness = createHarness()
    const stop = harness.observe()
    await settle()
    harness.setDate('2026-10-01T00:00:00.000Z')
    harness.documentTarget.emit(eventName)
    await settle()
    t.is(harness.calls(), 2)
    stop()
  })
}

test('reprend sur un retour de fenêtre visible sans attendre une nouvelle connexion', async t => {
  const harness = createHarness()
  const stop = harness.observe()
  await settle()
  harness.setDate('2026-10-01T00:00:00.000Z')
  harness.windowTarget.emit('focus')
  await settle()
  t.is(harness.calls(), 2)
  stop()
})

test('un échec reste silencieux, sans rafale ni relance automatique', async t => {
  let shouldFail = true
  const harness = createHarness(() => {
    if (shouldFail) {
      throw new Error('Network unavailable')
    }

    return success()
  })
  const stop = harness.observe()
  await settle()
  t.is(harness.calls(), 1)

  harness.documentTarget.emit('pointerdown')
  harness.documentTarget.emit('keydown')
  harness.windowTarget.emit('focus')
  harness.setDate('2026-09-14T09:00:59.999Z')
  harness.documentTarget.emit('wheel')
  await settle()
  t.is(harness.calls(), 1)

  harness.setDate('2026-09-14T09:01:00.000Z')
  await settle()
  t.is(harness.calls(), 1)
  shouldFail = false
  harness.documentTarget.emit('keydown')
  harness.documentTarget.emit('pointerdown')
  await settle()
  t.is(harness.calls(), 2)

  harness.documentTarget.emit('wheel')
  await settle()
  t.is(harness.calls(), 2)
  stop()
})

for (const result of [{success: false, code: 401}, {success: false, code: 403}, {success: false, code: 503}, {success: true}, success('invalid')]) {
  test(`une réponse non confirmée ${JSON.stringify(result)} reste réessayable`, async t => {
    const harness = createHarness(() => result)
    t.false(await harness.tracker.report('user-1'))
    t.false(await harness.tracker.report('user-1'))
    t.is(harness.calls(), 1)
    harness.setDate('2026-09-14T09:01:00.000Z')
    t.false(await harness.tracker.report('user-1'))
    t.is(harness.calls(), 2)
  })
}

test('supprime tous les écouteurs à la sortie de l’espace authentifié', async t => {
  const harness = createHarness()
  const stop = harness.observe()
  await settle()
  stop()
  t.is(harness.documentTarget.listenerCount(), 0)
  t.is(harness.windowTarget.listenerCount(), 0)

  harness.setDate('2026-10-01T00:00:00.000Z')
  harness.windowTarget.emit('focus')
  harness.documentTarget.emit('keydown')
  harness.documentTarget.emit('visibilitychange')
  await settle()
  t.is(harness.calls(), 1)
})
