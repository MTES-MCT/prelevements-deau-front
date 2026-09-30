import test from 'ava'

import {getDashboardResponse} from './dashboard-response.js'

const session = {user: {token: 'server-only-token', apiExpiresAt: '2999-01-01T00:00:00.000Z'}}
const request = () => new Request('https://app.example.test/api/dashboard/territory?zones=DEP-33&sections=volumesByUsage&includePoints=true&token=untrusted')

for (const [label, invalidSession] of [['absente', null], ['sans jeton', {user: {}}], ['API expirée', {user: {...session.user, apiExpiresAt: '2000-01-01'}}], ['expiration invalide', {user: {...session.user, apiExpiresAt: 'invalid'}}]]) {
  test(`session ${label} : 401 sans appel API`, async t => {
    const response = await getDashboardResponse(request(), {path: 'territory', session: invalidSession, fetchUpstream: () => t.fail('Ne doit pas appeler l’API')})
    t.is(response.status, 401)
    t.is(response.headers.get('Cache-Control'), 'private, no-store')
  })
}

for (const status of [200, 403, 422, 503]) {
  test(`transmet signal, sections, erreurs métier ${status} et mesures sans exposer cookies ni secrets`, async t => {
    const incoming = request()
    const response = await getDashboardResponse(incoming, {path: 'territory', session, fetchUpstream: async (path, options) => {
      t.is(path, 'api/dashboard/territory?zones=DEP-33&sections=volumesByUsage&includePoints=false')
      t.is(options.signal, incoming.signal)
      t.is(options.cache, 'no-store')
      return Response.json({value: 0}, {status, headers: {'Server-Timing': 'sql;dur=12', 'X-Request-Id': 'test-request', 'Set-Cookie': 'private=value'}})
    }})
    t.is(response.status, status)
    t.deepEqual(await response.json(), {value: 0})
    t.is(response.headers.get('cache-control'), 'private, no-store')
    t.is(response.headers.get('server-timing'), 'sql;dur=12')
    t.is(response.headers.get('x-request-id'), 'test-request')
    t.is(response.headers.get('set-cookie'), null)
  })
}

test('seules les cinq lectures dashboard prévues sont relayées', async t => {
  for (const path of ['../info', 'constructor', 'map/points/../actors', 'map/points/abc/delete', 'water-resources/other']) {
    const response = await getDashboardResponse(request(), {path, session, fetchUpstream: () => t.fail('Chemin non autorisé')})
    t.is(response.status, 404)
  }
  for (const path of ['map', 'map/points/point-1/actors', 'water-resources/piezometry', 'water-resources/flows']) {
    const response = await getDashboardResponse(new Request(`https://app.example.test/api/dashboard/${path}?period=week&includeIps=true&unexpected=true`), {
      path, session, fetchUpstream: async upstream => {
        t.true(upstream.startsWith(`api/dashboard/${path}`))
        t.false(upstream.includes('unexpected'))
        if (path !== 'water-resources/piezometry') t.false(upstream.includes('includeIps'))
        return Response.json({})
      }
    })
    t.is(response.status, 200)
  }
})

test('annulation propagée et panne réseau sans détail interne', async t => {
  const controller = new AbortController()
  controller.abort()
  const cancelled = await getDashboardResponse(new Request('https://app.example.test/api/dashboard/territory', {signal: controller.signal}), {
    path: 'territory', session, fetchUpstream: async () => { throw controller.signal.reason }
  })
  t.is(cancelled.status, 499)
  const failed = await getDashboardResponse(request(), {path: 'territory', session, fetchUpstream: async () => { throw new Error('internal-secret-hostname') }})
  t.is(failed.status, 502)
  t.false((await failed.text()).includes('internal-secret-hostname'))
})
