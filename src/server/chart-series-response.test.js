import test from 'ava'

import {getChartSeriesResponse} from './chart-series-response.js'

const session = {user: {token: 'server-only-token'}, expires: '2999-01-01T00:00:00.000Z'}
const request = () => new Request('https://app.example.test/api/aggregated-series?preleveurId=one&metricTypeCode=volume&aggregationFrequency=1%20day&view=full&token=untrusted')

for (const [label, invalidSession] of [['absente', null], ['sans jeton', {user: {}}], ['expirée', {...session, expires: '2000-01-01'}], ['API expirée sans expires RSC', {user: {...session.user, apiExpiresAt: '2000-01-01'}}], ['API expirée malgré cookie valide', {...session, user: {...session.user, apiExpiresAt: '2000-01-01'}}]]) {
  test(`session ${label} : 401 sans appel API`, async t => {
    const response = await getChartSeriesResponse(request(), {session: invalidSession, fetchUpstream: () => t.fail('Ne doit pas appeler l’API')})
    t.is(response.status, 401)
    t.is(response.headers.get('Cache-Control'), 'private, no-store')
  })
}

for (const status of [200, 403, 422, 503]) {
  test(`transmet le signal et conserve le statut ${status} de l’API`, async t => {
    const incoming = request()
    const response = await getChartSeriesResponse(incoming, {session, fetchUpstream: async (path, options) => {
      const query = new URL(path, 'https://api.example.test').searchParams
      t.is(query.get('view'), 'chart')
      t.false(query.has('token'))
      t.is(options.signal, incoming.signal)
      return Response.json(status === 200 ? {values: [{value: 0}]} : {message: 'Erreur métier'}, {status})
    }})
    t.is(response.status, status)
    t.is(response.headers.get('Cache-Control'), 'private, no-store')
    t.deepEqual(await response.json(), status === 200 ? {values: [{value: 0}]} : {message: 'Erreur métier'})
  })
}

test('les erreurs réseau ne divulguent pas les détails internes', async t => {
  const response = await getChartSeriesResponse(request(), {session, fetchUpstream: async () => { throw new Error('private-network-details') }})
  t.is(response.status, 502)
  t.false((await response.text()).includes('private-network-details'))
})


test('seuls les en-têtes de mesure sont transmis, jamais les cookies amont', async t => {
  const response = await getChartSeriesResponse(request(), {session, fetchUpstream: async () => Response.json({values: []}, {headers: {
    'Server-Timing': 'aggregation_values;dur=45', 'X-Request-Id': 'synthetic-request', 'Set-Cookie': 'private=value'
  }})})
  t.is(response.headers.get('server-timing'), 'aggregation_values;dur=45')
  t.is(response.headers.get('x-request-id'), 'synthetic-request')
  t.is(response.headers.get('set-cookie'), null)
})
