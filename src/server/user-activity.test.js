import test from 'ava'

import {isMiddlewarePublicPath} from '../lib/public-paths.js'
import {
  createUserActivityHandler,
  isSameOriginActivityRequest
} from './user-activity.js'

function activityRequest({url = 'https://app.example.test/auth/activity', headers = {}, body} = {}) {
  return new Request(url, {
    method: 'POST',
    headers: {
      origin: 'https://app.example.test',
      'x-activity-signal': '1',
      'sec-fetch-site': 'same-origin',
      ...headers
    },
    ...(body === undefined ? {} : {body, duplex: 'half'})
  })
}

test('la route d’activité échappe à la redirection de page du middleware', t => {
  t.true(isMiddlewarePublicPath('/auth/activity'))
})

test('accepte uniquement un signal navigateur de même origine', t => {
  t.true(isSameOriginActivityRequest(activityRequest()))

  for (const headers of [
    {origin: 'https://attacker.example'},
    {origin: 'https://other.app.example.test'},
    {origin: 'http://app.example.test'},
    {origin: 'null'},
    {origin: ''},
    {'x-activity-signal': ''},
    {'x-activity-signal': '2'},
    {'sec-fetch-site': 'cross-site'},
    {'sec-fetch-site': 'same-site'},
    {'sec-fetch-site': 'none'}
  ]) {
    t.false(isSameOriginActivityRequest(activityRequest({headers})))
  }
})

test('vérifie l’origine publique derrière le reverse proxy, sans changer la configuration', t => {
  const request = activityRequest({
    url: 'http://0.0.0.0:3000/auth/activity',
    headers: {
      host: '0.0.0.0:3000',
      'x-forwarded-host': 'app.example.test',
      'x-forwarded-proto': 'https'
    }
  })
  t.true(isSameOriginActivityRequest(request))

  t.true(isSameOriginActivityRequest(activityRequest({
    url: 'http://localhost:3000/auth/activity',
    headers: {origin: 'http://localhost:3000'}
  })))
})

test('n’exige pas Fetch Metadata sur les navigateurs qui ne l’envoient pas', t => {
  const request = activityRequest()
  request.headers.delete('sec-fetch-site')
  t.true(isSameOriginActivityRequest(request))
  request.headers.delete('origin')
  t.false(isSameOriginActivityRequest(request))
})

test('rejette le CSRF avant toute requête authentifiée', async t => {
  const handler = createUserActivityHandler({
    requestActivity: () => t.fail('La collecte API ne doit pas être appelée')
  })
  const response = await handler(activityRequest({headers: {origin: 'https://attacker.example'}}))
  t.is(response.status, 403)
  t.is(response.headers.get('location'), null)
})

test('refuse le corps fourni par le client, notamment une identité ou un mois', async t => {
  const handler = createUserActivityHandler({
    requestActivity: () => t.fail('Aucune donnée client ne doit atteindre l’API')
  })
  const response = await handler(activityRequest({body: JSON.stringify({userId: 'another-user', month: '2026-01'})}))
  t.is(response.status, 400)
})

test('accepte le flux de corps vide produit par Next pour un POST sans payload', async t => {
  let calls = 0
  const handler = createUserActivityHandler({
    requestActivity: async () => {
      calls += 1
      return Response.json({month: '2026-09'})
    }
  })
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array())
      controller.close()
    }
  })
  const response = await handler(activityRequest({body}))
  t.is(response.status, 200)
  t.is(calls, 1)
})

test('rejette le premier morceau non vide sans lire un gros corps en entier', async t => {
  let cancelled = false
  const handler = createUserActivityHandler({
    requestActivity: () => t.fail('Le payload doit être refusé avant l’appel API')
  })
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('{"userId":"not-me"}'))
    },
    cancel() {
      cancelled = true
    }
  })
  const response = await handler(activityRequest({body}))
  t.is(response.status, 400)
  t.true(cancelled)
})

test('ne reste pas bloqué sur un client qui ne termine pas son corps de requête', async t => {
  let cancelled = false
  const handler = createUserActivityHandler({
    requestActivity: () => t.fail('Un corps incomplet ne doit pas être accepté')
  })
  const body = new ReadableStream({
    cancel() {
      cancelled = true
    }
  })
  const response = await handler(activityRequest({body}))
  t.is(response.status, 400)
  t.true(cancelled)
})

test('transmet seulement un POST sans corps et ne renvoie que le mois serveur', async t => {
  const handler = createUserActivityHandler({
    requestActivity: async options => {
      t.is(options.method, 'POST')
      t.false(Object.hasOwn(options, 'body'))
      t.false(Object.hasOwn(options, 'headers'))
      t.true(options.signal instanceof AbortSignal)
      return Response.json({month: '2026-09', userId: 'private-user', secret: 'not-for-the-client'})
    }
  })
  const response = await handler(activityRequest())
  t.is(response.status, 200)
  t.deepEqual(await response.json(), {month: '2026-09'})
  t.is(response.headers.get('cache-control'), 'private, no-store')
})

for (const status of [401, 403]) {
  test(`une erreur API ${status} ne redirige pas et ne divulgue pas les détails`, async t => {
    const handler = createUserActivityHandler({
      requestActivity: async () => Response.json({message: 'private detail'}, {status}),
      logError: () => t.fail('Une expiration de session ne doit pas remplir les logs')
    })
    const response = await handler(activityRequest())
    t.is(response.status, status)
    t.is(response.headers.get('location'), null)
    t.deepEqual(await response.json(), {message: 'Activité non enregistrée.'})
  })

  test(`une erreur du wrapper ${status} reste un JSON sans redirection`, async t => {
    const handler = createUserActivityHandler({
      requestActivity: () => {
        throw Object.assign(new Error('UNAUTHORIZED'), {code: status})
      }
    })
    const response = await handler(activityRequest())
    t.is(response.status, status)
    t.is(response.headers.get('location'), null)
  })
}

test('une panne ne divulgue aucun détail et les logs sont limités à un par minute', async t => {
  let timestamp = 0
  const logs = []
  const handler = createUserActivityHandler({
    requestActivity: () => {
      throw new Error('Private connection details')
    },
    logError: (...args) => logs.push(args),
    now: () => timestamp
  })

  const response = await handler(activityRequest())
  t.is(response.status, 503)
  t.deepEqual(await response.json(), {message: 'Activité non enregistrée.'})
  await handler(activityRequest())
  timestamp = 59_999
  await handler(activityRequest())
  t.is(logs.length, 1)
  t.deepEqual(logs[0], ['[User activity] Collecte indisponible', {status: 503}])

  timestamp = 60_000
  await handler(activityRequest())
  t.is(logs.length, 2)
})

for (const [label, makeResponse] of [
  ['mois invalide', () => Response.json({month: 'invalid'})],
  ['mois absent', () => Response.json({})],
  ['JSON invalide', () => new Response('not json')],
  ['erreur serveur', () => Response.json({error: 'Private connection details'}, {status: 500})],
  ['route absente', () => Response.json({message: 'Wrong version'}, {status: 404})]
]) {
  test(`une réponse API inexploitable (${label}) reste une collecte indisponible`, async t => {
    const handler = createUserActivityHandler({
      requestActivity: async () => makeResponse(),
      logError: () => {}
    })
    const response = await handler(activityRequest())
    t.is(response.status, 503)
    t.deepEqual(await response.json(), {message: 'Activité non enregistrée.'})
  })
}
